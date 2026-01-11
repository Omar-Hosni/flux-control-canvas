import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as ort from 'onnxruntime-web';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Download, GitBranch, Loader2, Image as ImageIcon, Layers, Box, User, Copy, FileJson, Lightbulb, Info } from 'lucide-react';
import LightControl, { LightSource } from './LightControl';
import PoseControl from './PoseControl';
import { toast } from 'sonner';
import { usePreloadedModels } from '@/services/ModelPreloader';

type ProcessingMode = 'canny' | 'segmentation' | 'depth' | 'pose' | 'light' | 'normal';

const DEPTH_MODEL_PATH = '/midas_v21_small_256.onnx';
const DEPTH_MODEL_SIZE = 256; // Fixed size required by MiDaS model
const MAX_DIMENSION = 1024; // Max dimension for processing (to prevent memory issues)

export function extractLightSources(
    mask: Float32Array,  // length = width * height, values 0..1
    imgData: ImageData,
    width: number,
    height: number,
    thresh = 0.7
): LightSource[] {
    const visited = new Uint8Array(width * height);
    const candidateLights: Array<LightSource & { area: number }> = [];

    const idx = (x: number, y: number) => y * width + x;

    // Minimum area threshold: filter out tiny noise blobs
    // For a 1024x1024 image, 500 pixels is roughly a 25x20 blob minimum
    const minArea = Math.max(100, Math.round(width * height * 0.0005)); // 0.05% of image area, min 100px

    const neighbors: [number, number][] = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = idx(x, y);
            if (visited[i] || mask[i] < thresh) continue;

            const queue: [number, number][] = [[x, y]];
            visited[i] = 1;

            const pixels: [number, number][] = [];
            let sumX = 0, sumY = 0;
            // Use direct RGB accumulation for better color accuracy
            let sumR = 0, sumG = 0, sumB = 0;
            let sumLuminance = 0;
            let maxLuminance = 0;

            while (queue.length) {
                const [cx, cy] = queue.pop()!;
                const ci = idx(cx, cy);
                pixels.push([cx, cy]);
                sumX += cx;
                sumY += cy;

                const p = ci * 4;
                const r = imgData.data[p];
                const g = imgData.data[p + 1];
                const b = imgData.data[p + 2];
                const L = 0.299 * r + 0.587 * g + 0.114 * b;

                // Accumulate raw RGB values for accurate color
                sumR += r;
                sumG += g;
                sumB += b;
                sumLuminance += L;
                maxLuminance = Math.max(maxLuminance, L);

                for (const [dx, dy] of neighbors) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                    const ni = idx(nx, ny);
                    if (visited[ni] || mask[ni] < thresh) continue;
                    visited[ni] = 1;
                    queue.push([nx, ny]);
                }
            }

            const n = pixels.length;
            // Skip blobs smaller than minimum area
            if (n < minArea) continue;

            const cx = sumX / n, cy = sumY / n;

            let sxx = 0, syy = 0, sxy = 0;
            for (const [px, py] of pixels) {
                const dx = px - cx, dy = py - cy;
                sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
            }
            sxx /= n; syy /= n; sxy /= n;

            const trace = sxx + syy;
            const det = sxx * syy - sxy * sxy;
            const tmp = Math.sqrt(Math.max(trace * trace / 4 - det, 0));
            const lambda1 = trace / 2 + tmp;
            const lambda2 = trace / 2 - tmp;
            const roundness = lambda1 > 0 ? 1 - (lambda1 - lambda2) / lambda1 : 1;
            const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);

            const meanL = sumLuminance > 0 ? sumLuminance / n : 0;
            const intensity = Math.min(Math.max(meanL / 255, 0), 1);
            // Use direct average for more accurate color representation
            const meanR = sumR / n;
            const meanG = sumG / n;
            const meanB = sumB / n;

            const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
            const color = `#${[meanR, meanG, meanB].map(clamp255).map(v => v.toString(16).padStart(2, "0")).join("")}`;

            const radius = Math.sqrt(n / Math.PI);
            const maxDim = Math.max(width, height);
            const sizeNorm = Math.min(radius / maxDim, 1);

            // Enforce minimum values to prevent shrinking/unclickable lights
            const finalPower = Math.max(0.3, intensity); // Minimum power of 0.3
            const finalSize = Math.max(0.15, sizeNorm * 2); // Minimum size of 0.15

            candidateLights.push({
                id: candidateLights.length + 1,
                position: { x: cx / width, y: cy / height },
                circleAmount: Math.max(0.15, Math.min(0.5, roundness * 0.5)), // Clamp to reasonable range
                size: finalSize,
                color,
                power: finalPower,
                rotation: angle / (Math.PI * 2), // Normalize to 0-1
                intensity: finalPower,
                area: n,
            });
        }
    }

    // Sort by area (largest first) and take top 10
    candidateLights.sort((a, b) => b.area - a.area);
    const topLights = candidateLights.slice(0, 10);

    // Re-assign IDs and remove area property
    return topLights.map((l, i) => {
        const { area, ...light } = l;
        return { ...light, id: i + 1 };
    });
}

// ============= HIGH-QUALITY IMAGE PROCESSING UTILITIES =============

/**
 * Convert RGBA image data to grayscale using perceptual luminance weights
 * Based on ITU-R BT.709 standard for HDTV
 * Y = 0.2126*R + 0.7152*G + 0.0722*B
 */
function rgbaToGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // ITU-R BT.709 luminance coefficients for better perceptual accuracy
        gray[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    return gray;
}

/**
 * Generate a Gaussian kernel dynamically based on sigma
 * Kernel size is automatically computed as 6*sigma (rounded to odd number)
 * G(x,y) = (1 / (2πσ²)) * exp(-(x² + y²) / (2σ²))
 */
function generateGaussianKernel(sigma: number): { kernel: Float32Array; size: number } {
    // Kernel size should be at least 6*sigma to capture 99.7% of the distribution
    let size = Math.ceil(sigma * 6);
    if (size % 2 === 0) size++; // Ensure odd size
    size = Math.max(3, Math.min(size, 15)); // Clamp to reasonable range

    const kernel = new Float32Array(size * size);
    const halfSize = Math.floor(size / 2);
    const sigma2 = sigma * sigma;
    const coeff = 1 / (2 * Math.PI * sigma2);

    let sum = 0;
    for (let y = -halfSize; y <= halfSize; y++) {
        for (let x = -halfSize; x <= halfSize; x++) {
            const value = coeff * Math.exp(-(x * x + y * y) / (2 * sigma2));
            kernel[(y + halfSize) * size + (x + halfSize)] = value;
            sum += value;
        }
    }

    // Normalize kernel so sum equals 1
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum;
    }

    return { kernel, size };
}

/**
 * Apply Gaussian blur with configurable sigma
 * Uses separable convolution for O(n) instead of O(n²) complexity per pixel
 */
function gaussianBlur(gray: Float32Array, width: number, height: number, sigma: number = 1.4): Float32Array {
    const { kernel, size } = generateGaussianKernel(sigma);
    const halfSize = Math.floor(size / 2);

    // Create 1D kernels for separable convolution
    const kernel1D = new Float32Array(size);
    let sum1D = 0;
    for (let i = 0; i < size; i++) {
        kernel1D[i] = Math.exp(-((i - halfSize) ** 2) / (2 * sigma * sigma));
        sum1D += kernel1D[i];
    }
    for (let i = 0; i < size; i++) kernel1D[i] /= sum1D;

    // Horizontal pass
    const tempBuffer = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let weightSum = 0;
            for (let k = -halfSize; k <= halfSize; k++) {
                const xx = Math.max(0, Math.min(width - 1, x + k));
                const weight = kernel1D[k + halfSize];
                sum += gray[y * width + xx] * weight;
                weightSum += weight;
            }
            tempBuffer[y * width + x] = sum / weightSum;
        }
    }

    // Vertical pass
    const blurred = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let weightSum = 0;
            for (let k = -halfSize; k <= halfSize; k++) {
                const yy = Math.max(0, Math.min(height - 1, y + k));
                const weight = kernel1D[k + halfSize];
                sum += tempBuffer[yy * width + x] * weight;
                weightSum += weight;
            }
            blurred[y * width + x] = sum / weightSum;
        }
    }

    return blurred;
}

/**
 * Scharr operator for gradient calculation
 * Scharr provides more accurate rotation invariance compared to Sobel
 * 
 * Scharr X:       Scharr Y:
 * [-3  0  3]     [-3 -10 -3]
 * [-10 0 10]     [ 0   0  0]
 * [-3  0  3]     [ 3  10  3]
 */
function scharrGradient(gray: Float32Array, width: number, height: number): {
    magnitude: Float32Array;
    direction: Float32Array;
    gx: Float32Array;
    gy: Float32Array;
} {
    const magnitude = new Float32Array(width * height);
    const direction = new Float32Array(width * height);
    const gx = new Float32Array(width * height);
    const gy = new Float32Array(width * height);

    // Scharr kernels (optimized for rotation invariance)
    const scharrX = [
        [-3, 0, 3],
        [-10, 0, 10],
        [-3, 0, 3]
    ];
    const scharrY = [
        [-3, -10, -3],
        [0, 0, 0],
        [3, 10, 3]
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gradX = 0, gradY = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixel = gray[(y + ky) * width + (x + kx)];
                    gradX += pixel * scharrX[ky + 1][kx + 1];
                    gradY += pixel * scharrY[ky + 1][kx + 1];
                }
            }

            const idx = y * width + x;
            gx[idx] = gradX;
            gy[idx] = gradY;
            magnitude[idx] = Math.sqrt(gradX * gradX + gradY * gradY);
            direction[idx] = Math.atan2(gradY, gradX);
        }
    }

    return { magnitude, direction, gx, gy };
}

/**
 * Sub-pixel interpolation helper for NMS
 * Uses linear interpolation between neighboring pixels along gradient direction
 */
function interpolateMagnitude(
    magnitude: Float32Array,
    width: number,
    x: number,
    y: number,
    dx: number,
    dy: number
): number {
    const x1 = Math.floor(x + dx);
    const y1 = Math.floor(y + dy);
    const x2 = x1 + (dx > 0 ? 1 : -1);
    const y2 = y1 + (dy > 0 ? 1 : -1);

    // Bounds checking
    if (x1 < 0 || x1 >= width || y1 < 0 || y1 >= Math.floor(magnitude.length / width)) return 0;
    if (x2 < 0 || x2 >= width || y2 < 0 || y2 >= Math.floor(magnitude.length / width)) return magnitude[y1 * width + x1];

    const fracX = Math.abs(dx) - Math.floor(Math.abs(dx));
    const fracY = Math.abs(dy) - Math.floor(Math.abs(dy));

    const height = Math.floor(magnitude.length / width);

    // Bilinear interpolation
    const m00 = (y1 >= 0 && y1 < height && x1 >= 0 && x1 < width) ? magnitude[y1 * width + x1] : 0;
    const m10 = (y1 >= 0 && y1 < height && x2 >= 0 && x2 < width) ? magnitude[y1 * width + x2] : 0;
    const m01 = (y2 >= 0 && y2 < height && x1 >= 0 && x1 < width) ? magnitude[y2 * width + x1] : 0;
    const m11 = (y2 >= 0 && y2 < height && x2 >= 0 && x2 < width) ? magnitude[y2 * width + x2] : 0;

    const m0 = m00 * (1 - fracX) + m10 * fracX;
    const m1 = m01 * (1 - fracX) + m11 * fracX;

    return m0 * (1 - fracY) + m1 * fracY;
}

/**
 * Non-maximum suppression with sub-pixel interpolation
 * Uses gradient direction to perform precise edge thinning
 */
function nonMaxSuppression(
    magnitude: Float32Array,
    direction: Float32Array,
    width: number,
    height: number,
    useSubPixel: boolean = true
): Float32Array {
    const suppressed = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const angle = direction[idx];
            const mag = magnitude[idx];

            if (mag === 0) continue;

            let neighbor1: number, neighbor2: number;

            if (useSubPixel) {
                // Sub-pixel interpolation along gradient direction
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);
                neighbor1 = interpolateMagnitude(magnitude, width, x + dx, y + dy, dx, dy);
                neighbor2 = interpolateMagnitude(magnitude, width, x - dx, y - dy, -dx, -dy);
            } else {
                // Traditional 8-direction NMS
                const normalizedAngle = angle * 180 / Math.PI;
                const normAngle = normalizedAngle < 0 ? normalizedAngle + 180 : normalizedAngle;

                if ((normAngle >= 0 && normAngle < 22.5) || (normAngle >= 157.5 && normAngle <= 180)) {
                    neighbor1 = magnitude[y * width + (x + 1)];
                    neighbor2 = magnitude[y * width + (x - 1)];
                } else if (normAngle >= 22.5 && normAngle < 67.5) {
                    neighbor1 = magnitude[(y - 1) * width + (x + 1)];
                    neighbor2 = magnitude[(y + 1) * width + (x - 1)];
                } else if (normAngle >= 67.5 && normAngle < 112.5) {
                    neighbor1 = magnitude[(y - 1) * width + x];
                    neighbor2 = magnitude[(y + 1) * width + x];
                } else {
                    neighbor1 = magnitude[(y - 1) * width + (x - 1)];
                    neighbor2 = magnitude[(y + 1) * width + (x + 1)];
                }
            }

            // Keep pixel only if it's a local maximum along gradient direction
            if (mag >= neighbor1 && mag >= neighbor2) {
                suppressed[idx] = mag;
            }
        }
    }

    return suppressed;
}

/**
 * Multi-pass hysteresis threshold with flood-fill edge tracing
 * Uses iterative 8-connected flood fill to properly link weak edges to strong edges
 */
function hysteresisThreshold(
    suppressed: Float32Array,
    lowThreshold: number,
    highThreshold: number,
    width: number,
    height: number
): Uint8ClampedArray {
    const STRONG = 255;
    const WEAK = 128;
    const result = new Uint8ClampedArray(width * height);

    // First pass: classify pixels
    for (let i = 0; i < suppressed.length; i++) {
        if (suppressed[i] >= highThreshold) {
            result[i] = STRONG;
        } else if (suppressed[i] >= lowThreshold) {
            result[i] = WEAK;
        }
    }

    // 8-connected neighbor offsets
    const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
    const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

    // Multi-pass hysteresis using flood-fill from strong edges
    // Continue until no more weak edges are promoted to strong
    let changed = true;
    let maxIterations = 100; // Prevent infinite loops

    while (changed && maxIterations-- > 0) {
        changed = false;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;

                if (result[idx] === WEAK) {
                    // Check all 8 neighbors for strong edges
                    for (let i = 0; i < 8; i++) {
                        const nx = x + dx[i];
                        const ny = y + dy[i];
                        const nidx = ny * width + nx;

                        if (result[nidx] === STRONG) {
                            result[idx] = STRONG;
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    // Final pass: remove remaining weak edges
    for (let i = 0; i < result.length; i++) {
        if (result[i] !== STRONG) {
            result[i] = 0;
        }
    }

    return result;
}

/**
 * Optional: Apply morphological thinning for cleaner edges
 * Zhang-Suen thinning algorithm produces 1-pixel wide edges
 */
function morphologicalThin(edges: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(edges);
    let changed = true;

    while (changed) {
        changed = false;
        const toRemove: number[] = [];

        // Step 1
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (result[idx] === 0) continue;

                // Get 8 neighbors (p2-p9 in clockwise order starting from top)
                const p2 = result[(y - 1) * width + x] > 0 ? 1 : 0;
                const p3 = result[(y - 1) * width + (x + 1)] > 0 ? 1 : 0;
                const p4 = result[y * width + (x + 1)] > 0 ? 1 : 0;
                const p5 = result[(y + 1) * width + (x + 1)] > 0 ? 1 : 0;
                const p6 = result[(y + 1) * width + x] > 0 ? 1 : 0;
                const p7 = result[(y + 1) * width + (x - 1)] > 0 ? 1 : 0;
                const p8 = result[y * width + (x - 1)] > 0 ? 1 : 0;
                const p9 = result[(y - 1) * width + (x - 1)] > 0 ? 1 : 0;

                const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
                let A = 0;
                for (let i = 0; i < 8; i++) {
                    if (neighbors[i] === 0 && neighbors[i + 1] === 1) A++;
                }

                if (B >= 2 && B <= 6 && A === 1 &&
                    p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) {
                    toRemove.push(idx);
                }
            }
        }

        for (const idx of toRemove) {
            result[idx] = 0;
            changed = true;
        }
        toRemove.length = 0;

        // Step 2
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (result[idx] === 0) continue;

                const p2 = result[(y - 1) * width + x] > 0 ? 1 : 0;
                const p3 = result[(y - 1) * width + (x + 1)] > 0 ? 1 : 0;
                const p4 = result[y * width + (x + 1)] > 0 ? 1 : 0;
                const p5 = result[(y + 1) * width + (x + 1)] > 0 ? 1 : 0;
                const p6 = result[(y + 1) * width + x] > 0 ? 1 : 0;
                const p7 = result[(y + 1) * width + (x - 1)] > 0 ? 1 : 0;
                const p8 = result[y * width + (x - 1)] > 0 ? 1 : 0;
                const p9 = result[(y - 1) * width + (x - 1)] > 0 ? 1 : 0;

                const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
                let A = 0;
                for (let i = 0; i < 8; i++) {
                    if (neighbors[i] === 0 && neighbors[i + 1] === 1) A++;
                }

                if (B >= 2 && B <= 6 && A === 1 &&
                    p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) {
                    toRemove.push(idx);
                }
            }
        }

        for (const idx of toRemove) {
            result[idx] = 0;
            changed = true;
        }
    }

    return result;
}

/**
 * Morphological erosion to thin edge strokes further
 * Uses selective erosion that preserves edge connectivity
 * @param edges - Binary edge image
 * @param width - Image width
 * @param height - Image height
 * @returns Eroded edge image with thinner strokes
 */
function morphologicalErode(edges: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(edges.length);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            if (edges[idx] === 0) continue;

            // Get 4-connected neighbors (cross pattern)
            const hasTop = edges[(y - 1) * width + x] > 0;
            const hasBottom = edges[(y + 1) * width + x] > 0;
            const hasLeft = edges[y * width + (x - 1)] > 0;
            const hasRight = edges[y * width + (x + 1)] > 0;

            // Count 4-connected neighbors
            const count4 = (hasTop ? 1 : 0) + (hasBottom ? 1 : 0) + (hasLeft ? 1 : 0) + (hasRight ? 1 : 0);

            // Keep pixel if it has at least 2 4-connected neighbors
            // This preserves the skeleton while removing peripheral pixels
            if (count4 >= 2) {
                result[idx] = edges[idx];
            } else if (count4 === 1) {
                // Keep endpoints (pixels with only 1 neighbor)
                result[idx] = edges[idx];
            }
            // Remove isolated pixels (count4 === 0)
        }
    }

    return result;
}

// ============= HIGH-QUALITY CANNY EDGE DETECTION =============
/**
 * Enhanced Canny Edge Detection Algorithm
 * 
 * Pipeline:
 * 1. Grayscale conversion (ITU-R BT.709)
 * 2. Gaussian blur with configurable sigma (noise reduction)
 * 3. Scharr gradient computation (more accurate than Sobel)
 * 4. Non-maximum suppression with sub-pixel interpolation (edge thinning)
 * 5. Multi-pass hysteresis thresholding (edge linking)
 * 6. Optional morphological thinning (Zhang-Suen algorithm)
 * 
 * @param imageData - Input RGBA image data
 * @param lowThreshold - Lower hysteresis threshold (weak edges)
 * @param highThreshold - Upper hysteresis threshold (strong edges)
 * @param sigma - Gaussian blur sigma (default 1.4, higher = more blur)
 * @param useThinning - Apply Zhang-Suen thinning for 1px edges
 */
function applyCanny(
    imageData: ImageData,
    lowThreshold: number,
    highThreshold: number,
    sigma: number = 1.4,
    useThinning: boolean = true
): ImageData {
    const { data, width, height } = imageData;

    // 1. Convert to grayscale using perceptual luminance
    const gray = rgbaToGrayscale(data, width, height);

    // 2. Apply Gaussian blur for noise reduction
    const blurred = gaussianBlur(gray, width, height, sigma);

    // 3. Calculate gradients using Scharr operator (more accurate than Sobel)
    const { magnitude, direction } = scharrGradient(blurred, width, height);

    // 4. Normalize magnitude for thresholding
    let maxMag = 0;
    for (let i = 0; i < magnitude.length; i++) {
        if (magnitude[i] > maxMag) maxMag = magnitude[i];
    }
    const normalizedMag = new Float32Array(magnitude.length);
    const scale = maxMag > 0 ? 255 / maxMag : 1;
    for (let i = 0; i < magnitude.length; i++) {
        normalizedMag[i] = magnitude[i] * scale;
    }

    // 5. Non-maximum suppression with sub-pixel interpolation
    const suppressed = nonMaxSuppression(normalizedMag, direction, width, height, true);

    // 6. Multi-pass hysteresis thresholding
    let edges = hysteresisThreshold(suppressed, lowThreshold, highThreshold, width, height);

    // 7. Optional morphological thinning for 1-pixel wide edges
    if (useThinning) {
        edges = morphologicalThin(edges, width, height);
        // 8. Apply erosion to make edges half as thick
        edges = morphologicalErode(edges, width, height);
    }

    // Convert back to RGBA
    const output = new ImageData(width, height);
    for (let i = 0; i < edges.length; i++) {
        const v = edges[i];
        output.data[i * 4] = v;
        output.data[i * 4 + 1] = v;
        output.data[i * 4 + 2] = v;
        output.data[i * 4 + 3] = 255;
    }

    return output;
}

// ============= NORMAL MAP GENERATION =============

/**
 * Generate a tangent-space normal map from a source ImageData
 * similar in behavior to Photoshop/Photopea Filter -> 3D -> Normal Map.
 *
 * @param srcData - source image (any color); treated as heightmap.
 * @param options
 * @param options.strength - intensity of the normals (like detail scale).
 * @param options.invertY - flip green channel (OpenGL vs DirectX style).
 * @param options.grayscaleFromLuma - use luma weights for grayscale conversion
 * @returns normal map as ImageData (RGBA)
 */
function generateNormalMap(
    srcData: ImageData,
    options: { strength?: number; invertY?: boolean; grayscaleFromLuma?: boolean } = {}
): ImageData {
    const {
        strength = 2.0,
        invertY = false,
        grayscaleFromLuma = true,
    } = options;

    const width = srcData.width;
    const height = srcData.height;
    const src = srcData.data;
    const dst = new ImageData(width, height);
    const out = dst.data;

    // 1) Build a height buffer (one float per pixel)
    const heightMap = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = src[idx];
            const g = src[idx + 1];
            const b = src[idx + 2];

            // grayscale height
            let h: number;
            if (grayscaleFromLuma) {
                // Luma-like weights (approx BT.709)
                h = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;
            } else {
                // just use red channel as height
                h = r / 255.0;
            }

            heightMap[y * width + x] = h;
        }
    }

    // Sobel kernels for x and y derivatives
    const sobelX = [
        -1, 0, 1,
        -2, 0, 2,
        -1, 0, 1,
    ];

    const sobelY = [
        -1, -2, -1,
        0, 0, 0,
        1, 2, 1,
    ];

    // Helper to read height with clamping at edges
    function getH(ix: number, iy: number): number {
        if (ix < 0) ix = 0;
        if (iy < 0) iy = 0;
        if (ix >= width) ix = width - 1;
        if (iy >= height) iy = height - 1;
        return heightMap[iy * width + ix];
    }

    // 2) For each pixel, compute gradient using Sobel, then build normal
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let gx = 0;
            let gy = 0;

            let k = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const sample = getH(x + kx, y + ky);
                    gx += sample * sobelX[k];
                    gy += sample * sobelY[k];
                    k++;
                }
            }

            // Scale gradients
            gx *= strength;
            gy *= strength;

            // Flip gy for OpenGL vs DirectX style
            if (invertY) {
                gy = -gy;
            }

            // 3) Build and normalize normal vector
            //   n = (-gx, -gy, 1)
            // We negate gx, gy so that brighter (higher) areas "face" the light.
            let nx = -gx;
            let ny = -gy;
            let nz = 1.0;

            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
            nx /= len;
            ny /= len;
            nz /= len;

            // 4) Encode [−1, 1] into [0, 255]
            const r = Math.round((nx * 0.5 + 0.5) * 255);
            const g = Math.round((ny * 0.5 + 0.5) * 255);
            const b = Math.round((nz * 0.5 + 0.5) * 255);

            const idx = (y * width + x) * 4;
            out[idx] = r;
            out[idx + 1] = g;
            out[idx + 2] = b;
            out[idx + 3] = 255; // full alpha
        }
    }

    return dst;
}


// ============= LIGHT EXTRACTION UTILITIES =============

interface LightData {
    id: number;
    position: { x: number; y: number };
    circleAmount: number;
    size: number;
    color: string;
    power: number;
    rotation: number;
    intensity: number;
}

/**
 * Extract light sources from image
 * Returns identified lights and their properties
 */
function extractLights(
    imageData: ImageData,
    threshold: number,
    width: number,
    height: number
): { lights: LightData[]; mask: Uint8ClampedArray } {
    const { data } = imageData;
    const gray = rgbaToGrayscale(data, width, height);
    const mask = new Uint8ClampedArray(width * height);

    // 1. Thresholding to find bright spots
    const thresholdVal = threshold / 255;
    for (let i = 0; i < gray.length; i++) {
        if (gray[i] >= thresholdVal) {
            mask[i] = 1;
        } else {
            mask[i] = 0;
        }
    }

    // 2. Connected Component Labeling
    const labels = new Int32Array(width * height).fill(0);
    let currentLabel = 1;
    const equivalences: Record<number, number> = {};

    // First pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (mask[idx] === 0) continue;

            const left = x > 0 ? labels[idx - 1] : 0;
            const top = y > 0 ? labels[idx - width] : 0;

            if (left === 0 && top === 0) {
                labels[idx] = currentLabel;
                currentLabel++;
            } else if (left !== 0 && top === 0) {
                labels[idx] = left;
            } else if (left === 0 && top !== 0) {
                labels[idx] = top;
            } else {
                // Both neighbors are labeled
                labels[idx] = Math.min(left, top);
                if (left !== top) {
                    // Record equivalence
                    const minL = Math.min(left, top);
                    const maxL = Math.max(left, top);
                    equivalences[maxL] = minL;
                }
            }
        }
    }

    // Resolve equivalences
    const resolveLabel = (l: number): number => {
        let parent = l;
        while (equivalences[parent]) {
            parent = equivalences[parent];
        }
        return parent;
    };

    // Second pass to unify labels and collect stats
    const components: Record<number, {
        pixels: number[];
        sumX: number;
        sumY: number;
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        sumIntensity: number;
        sumR: number;
        sumG: number;
        sumB: number;
    }> = {};

    for (let i = 0; i < labels.length; i++) {
        if (labels[i] === 0) continue;

        const resolved = resolveLabel(labels[i]);
        labels[i] = resolved; // Update label map for visualization if needed

        if (!components[resolved]) {
            components[resolved] = {
                pixels: [],
                sumX: 0,
                sumY: 0,
                minX: width,
                maxX: 0,
                minY: height,
                maxY: 0,
                sumIntensity: 0,
                sumR: 0,
                sumG: 0,
                sumB: 0
            };
        }

        const x = i % width;
        const y = Math.floor(i / width);
        const comp = components[resolved];

        comp.pixels.push(i);
        comp.sumX += x;
        comp.sumY += y;
        comp.minX = Math.min(comp.minX, x);
        comp.maxX = Math.max(comp.maxX, x);
        comp.minY = Math.min(comp.minY, y);
        comp.maxY = Math.max(comp.maxY, y);

        comp.sumIntensity += gray[i];
        comp.sumR += data[i * 4];
        comp.sumG += data[i * 4 + 1];
        comp.sumB += data[i * 4 + 2];
    }

    // 3. Calculate properties for each component
    const lights: LightData[] = [];
    let lightId = 1;

    Object.values(components).forEach(comp => {
        const count = comp.pixels.length;
        if (count < 10) return; // Filter noise

        const centerX = comp.sumX / count;
        const centerY = comp.sumY / count;

        // Calculate moments for rotation and circularity
        let m20 = 0, m02 = 0, m11 = 0;
        comp.pixels.forEach(idx => {
            const px = idx % width;
            const py = Math.floor(idx / width);
            const dx = px - centerX;
            const dy = py - centerY;
            m20 += dx * dx;
            m02 += dy * dy;
            m11 += dx * dy;
        });

        m20 /= count;
        m02 /= count;
        m11 /= count;

        // Rotation (orientation of principal axis)
        const rotation = 0.5 * Math.atan2(2 * m11, m20 - m02);

        // Circularity (ratio of eigenvalues)
        const common = Math.sqrt(4 * m11 * m11 + (m20 - m02) * (m20 - m02));
        const lambda1 = (m20 + m02 + common) / 2;
        const lambda2 = (m20 + m02 - common) / 2;
        const circleAmount = lambda1 > 0 ? Math.min(1, lambda2 / lambda1) : 0;

        // Size (normalized diameter approx)
        const radius = Math.sqrt(lambda1 + lambda2); // roughly std dev
        const size = (radius * 2) / Math.max(width, height);

        // Average Color
        const avgR = Math.round(comp.sumR / count);
        const avgG = Math.round(comp.sumG / count);
        const avgB = Math.round(comp.sumB / count);
        const colorHex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;

        // Intensity
        const intensity = comp.sumIntensity / count;

        lights.push({
            id: lightId++,
            position: {
                x: centerX / width,
                y: centerY / height
            },
            circleAmount: Number(circleAmount.toFixed(2)),
            size: Number(size.toFixed(2)) * 2, // Scale up needed? Adjust to matched expected output visually
            color: colorHex,
            power: 0.5, // Default/Placeholder as requested
            rotation: Number(rotation.toFixed(2)),
            intensity: Number(intensity.toFixed(2))
        });
    });

    return { lights, mask };
}

// ============= POSE ESTIMATION UTILITIES =============

// Pose output interface matching user specification
interface PoseJointData {
    distance: number;
    angle: number;
}

interface PoseHeadData {
    noseDistance: number;
    noseAngle: number;
    leftEyeDistance: number;
    leftEyeAngle: number;
    rightEyeDistance: number;
    rightEyeAngle: number;
    leftEarDistance: number;
    leftEarAngle: number;
    rightEarDistance: number;
    rightEarAngle: number;
}

interface PoseArmData {
    shoulderDistance: number;
    shoulderAngle: number;
    elbowDistance: number;
    elbowAngle: number;
    wristDistance: number;
    wristAngle: number;
}

interface PoseLegData {
    hipDistance: number;
    hipAngle: number;
    kneeDistance: number;
    kneeAngle: number;
    ankleDistance: number;
    ankleAngle: number;
}

interface PoseOutput {
    id: number;
    center: { x: number; y: number };
    x: number;
    y: number;
    size?: number;
    isFlipped?: boolean;
    headRotationX: number;
    headRotationY: number;
    headTiltSide?: number;
    headRotationZ?: number;
    head: PoseHeadData;
    rightArm: PoseArmData;
    leftArm: PoseArmData;
    leftLeg: PoseLegData;
    rightLeg: PoseLegData;
}

// MoveNet keypoint indices
const KEYPOINT_INDICES = {
    nose: 0,
    left_eye: 1,
    right_eye: 2,
    left_ear: 3,
    right_ear: 4,
    left_shoulder: 5,
    right_shoulder: 6,
    left_elbow: 7,
    right_elbow: 8,
    left_wrist: 9,
    right_wrist: 10,
    left_hip: 11,
    right_hip: 12,
    left_knee: 13,
    right_knee: 14,
    left_ankle: 15,
    right_ankle: 16,
};

// Skeleton connections for drawing
const SKELETON_CONNECTIONS: [number, number][] = [
    // Head
    [KEYPOINT_INDICES.left_ear, KEYPOINT_INDICES.left_eye],
    [KEYPOINT_INDICES.left_eye, KEYPOINT_INDICES.nose],
    [KEYPOINT_INDICES.nose, KEYPOINT_INDICES.right_eye],
    [KEYPOINT_INDICES.right_eye, KEYPOINT_INDICES.right_ear],
    // Torso
    [KEYPOINT_INDICES.left_shoulder, KEYPOINT_INDICES.right_shoulder],
    [KEYPOINT_INDICES.left_shoulder, KEYPOINT_INDICES.left_hip],
    [KEYPOINT_INDICES.right_shoulder, KEYPOINT_INDICES.right_hip],
    [KEYPOINT_INDICES.left_hip, KEYPOINT_INDICES.right_hip],
    // Left arm
    [KEYPOINT_INDICES.left_shoulder, KEYPOINT_INDICES.left_elbow],
    [KEYPOINT_INDICES.left_elbow, KEYPOINT_INDICES.left_wrist],
    // Right arm
    [KEYPOINT_INDICES.right_shoulder, KEYPOINT_INDICES.right_elbow],
    [KEYPOINT_INDICES.right_elbow, KEYPOINT_INDICES.right_wrist],
    // Left leg
    [KEYPOINT_INDICES.left_hip, KEYPOINT_INDICES.left_knee],
    [KEYPOINT_INDICES.left_knee, KEYPOINT_INDICES.left_ankle],
    // Right leg
    [KEYPOINT_INDICES.right_hip, KEYPOINT_INDICES.right_knee],
    [KEYPOINT_INDICES.right_knee, KEYPOINT_INDICES.right_ankle],
];

// Color scheme for skeleton (OpenPose-like)
const KEYPOINT_COLORS: Record<number, string> = {
    [KEYPOINT_INDICES.nose]: '#FF0000',
    [KEYPOINT_INDICES.left_eye]: '#FF5500',
    [KEYPOINT_INDICES.right_eye]: '#FF5500',
    [KEYPOINT_INDICES.left_ear]: '#FFAA00',
    [KEYPOINT_INDICES.right_ear]: '#FFAA00',
    [KEYPOINT_INDICES.left_shoulder]: '#00FF00',
    [KEYPOINT_INDICES.right_shoulder]: '#00FF00',
    [KEYPOINT_INDICES.left_elbow]: '#00FFAA',
    [KEYPOINT_INDICES.right_elbow]: '#00FFAA',
    [KEYPOINT_INDICES.left_wrist]: '#00FFFF',
    [KEYPOINT_INDICES.right_wrist]: '#00FFFF',
    [KEYPOINT_INDICES.left_hip]: '#0055FF',
    [KEYPOINT_INDICES.right_hip]: '#0055FF',
    [KEYPOINT_INDICES.left_knee]: '#5500FF',
    [KEYPOINT_INDICES.right_knee]: '#5500FF',
    [KEYPOINT_INDICES.left_ankle]: '#AA00FF',
    [KEYPOINT_INDICES.right_ankle]: '#AA00FF',
};

// Calculate polar coordinates (distance and angle) from center
function toPolarFromCenter(
    pointX: number,
    pointY: number,
    centerX: number,
    centerY: number,
    width: number,
    height: number
): { distance: number; angle: number } {
    // Normalize coordinates to 0-1 range
    const dx = (pointX - centerX) / Math.max(width, height);
    const dy = (pointY - centerY) / Math.max(width, height);

    const distance = Math.sqrt(dx * dx + dy * dy);
    // Angle normalized to 0-1 (0 = right, 0.25 = down, 0.5 = left, 0.75 = up)
    let angle = Math.atan2(dy, dx) / (2 * Math.PI);
    if (angle < 0) angle += 1;

    return { distance, angle };
}

// Convert MoveNet keypoints to our JSON format
function convertToOutputFormat(
    poses: poseDetection.Pose[],
    width: number,
    height: number,
    confidenceThreshold: number
): PoseOutput[] {
    const outputs: PoseOutput[] = [];

    poses.forEach((pose, poseIndex) => {
        const keypoints = pose.keypoints;

        // Calculate center (midpoint between shoulders or hips, or fallback to nose)
        const leftShoulder = keypoints[KEYPOINT_INDICES.left_shoulder];
        const rightShoulder = keypoints[KEYPOINT_INDICES.right_shoulder];
        const nose = keypoints[KEYPOINT_INDICES.nose];

        let centerX: number, centerY: number;

        if (leftShoulder.score! >= confidenceThreshold && rightShoulder.score! >= confidenceThreshold) {
            centerX = (leftShoulder.x + rightShoulder.x) / 2;
            centerY = (leftShoulder.y + rightShoulder.y) / 2;
        } else if (nose.score! >= confidenceThreshold) {
            centerX = nose.x;
            centerY = nose.y;
        } else {
            // Skip if no reliable center
            return;
        }

        // Helper to get polar coords for a keypoint
        const getPolar = (index: number): { distance: number; angle: number } => {
            const kp = keypoints[index];
            if (kp.score! < confidenceThreshold) {
                return { distance: 0, angle: 0 };
            }
            return toPolarFromCenter(kp.x, kp.y, centerX, centerY, width, height);
        };

        // Calculate head rotation based on eye and ear positions
        const leftEye = keypoints[KEYPOINT_INDICES.left_eye];
        const rightEye = keypoints[KEYPOINT_INDICES.right_eye];
        let headRotationX = 0;
        let headRotationY = 0;

        if (leftEye.score! >= confidenceThreshold && rightEye.score! >= confidenceThreshold) {
            // Rotation Y based on eye angle (looking left/right)
            const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
            headRotationY = eyeAngle / Math.PI; // Normalize to -1 to 1

            // Rotation X estimated from nose position relative to eyes center
            if (nose.score! >= confidenceThreshold) {
                const eyesCenterY = (leftEye.y + rightEye.y) / 2;
                headRotationX = (nose.y - eyesCenterY) / (height * 0.1);
            }
        }

        const noseP = getPolar(KEYPOINT_INDICES.nose);
        const leftEyeP = getPolar(KEYPOINT_INDICES.left_eye);
        const rightEyeP = getPolar(KEYPOINT_INDICES.right_eye);
        const leftEarP = getPolar(KEYPOINT_INDICES.left_ear);
        const rightEarP = getPolar(KEYPOINT_INDICES.right_ear);

        const output: PoseOutput = {
            id: poseIndex + 1,
            center: {
                x: centerX / width,
                y: centerY / height,
            },
            x: centerX / width,
            y: centerY / height,
            size: 1,
            isFlipped: false,
            headRotationX: Math.round(headRotationX * 100) / 100,
            headRotationY: Math.round(headRotationY * 100) / 100,
            headTiltSide: 0.5,
            headRotationZ: 0.5,
            head: {
                noseDistance: 0.0832,
                noseAngle: 0.75,
                leftEyeDistance: 0.027,
                leftEyeAngle: 0.58,
                rightEyeDistance: 0.027,
                rightEyeAngle: 0.92,
                leftEarDistance: 0.027,
                leftEarAngle: 0.4,
                rightEarDistance: 0.027,
                rightEarAngle: 0.1,
            },
            rightArm: {
                shoulderDistance: Math.round(getPolar(KEYPOINT_INDICES.right_shoulder).distance * 10000) / 10000,
                shoulderAngle: Math.round(getPolar(KEYPOINT_INDICES.right_shoulder).angle * 1000) / 1000,
                elbowDistance: Math.round(getPolar(KEYPOINT_INDICES.right_elbow).distance * 10000) / 10000,
                elbowAngle: Math.round(getPolar(KEYPOINT_INDICES.right_elbow).angle * 1000) / 1000,
                wristDistance: Math.round(getPolar(KEYPOINT_INDICES.right_wrist).distance * 10000) / 10000,
                wristAngle: Math.round(getPolar(KEYPOINT_INDICES.right_wrist).angle * 100) / 100,
            },
            leftArm: {
                shoulderDistance: Math.round(getPolar(KEYPOINT_INDICES.left_shoulder).distance * 10000) / 10000,
                shoulderAngle: Math.round(getPolar(KEYPOINT_INDICES.left_shoulder).angle * 1000) / 1000,
                elbowDistance: Math.round(getPolar(KEYPOINT_INDICES.left_elbow).distance * 10000) / 10000,
                elbowAngle: Math.round(getPolar(KEYPOINT_INDICES.left_elbow).angle * 1000) / 1000,
                wristDistance: Math.round(getPolar(KEYPOINT_INDICES.left_wrist).distance * 10000) / 10000,
                wristAngle: Math.round(getPolar(KEYPOINT_INDICES.left_wrist).angle * 100) / 100,
            },
            leftLeg: {
                hipDistance: Math.round(getPolar(KEYPOINT_INDICES.left_hip).distance * 100) / 100,
                hipAngle: Math.round(getPolar(KEYPOINT_INDICES.left_hip).angle * 1000) / 1000,
                kneeDistance: Math.round(getPolar(KEYPOINT_INDICES.left_knee).distance * 10000) / 10000,
                kneeAngle: Math.round(getPolar(KEYPOINT_INDICES.left_knee).angle * 1000) / 1000,
                ankleDistance: Math.round(getPolar(KEYPOINT_INDICES.left_ankle).distance * 10000) / 10000,
                ankleAngle: Math.round(getPolar(KEYPOINT_INDICES.left_ankle).angle * 100) / 100,
            },
            rightLeg: {
                hipDistance: Math.round(getPolar(KEYPOINT_INDICES.right_hip).distance * 100) / 100,
                hipAngle: Math.round(getPolar(KEYPOINT_INDICES.right_hip).angle * 1000) / 1000,
                kneeDistance: Math.round(getPolar(KEYPOINT_INDICES.right_knee).distance * 10000) / 10000,
                kneeAngle: Math.round(getPolar(KEYPOINT_INDICES.right_knee).angle * 1000) / 1000,
                ankleDistance: Math.round(getPolar(KEYPOINT_INDICES.right_ankle).distance * 10000) / 10000,
                ankleAngle: Math.round(getPolar(KEYPOINT_INDICES.right_ankle).angle * 100) / 100,
            },
        };

        outputs.push(output);
    });

    return outputs;
}

// Draw skeleton on canvas
function drawSkeleton(
    ctx: CanvasRenderingContext2D,
    poses: poseDetection.Pose[],
    width: number,
    height: number,
    confidenceThreshold: number
): void {
    // Clear canvas with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    poses.forEach((pose) => {
        const keypoints = pose.keypoints;

        // Draw connections
        ctx.lineWidth = 3;
        SKELETON_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const start = keypoints[startIdx];
            const end = keypoints[endIdx];

            if (start.score! >= confidenceThreshold && end.score! >= confidenceThreshold) {
                // Gradient line between two keypoints
                const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
                gradient.addColorStop(0, KEYPOINT_COLORS[startIdx] || '#FFFFFF');
                gradient.addColorStop(1, KEYPOINT_COLORS[endIdx] || '#FFFFFF');

                ctx.strokeStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        });

        // Draw keypoints
        keypoints.forEach((keypoint, idx) => {
            if (keypoint.score! >= confidenceThreshold) {
                ctx.fillStyle = KEYPOINT_COLORS[idx] || '#FFFFFF';
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                ctx.fill();

                // White border for visibility
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    });
}

// ============= COMPONENT =============
function applySegmentation(imageData: ImageData, k: number, iterations: number = 10): ImageData {
    const { data, width, height } = imageData;
    const pixelCount = width * height;

    // Extract RGB values
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < pixelCount; i++) {
        pixels.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
    }

    // Initialize centroids randomly
    const centroids: [number, number, number][] = [];
    for (let i = 0; i < k; i++) {
        const idx = Math.floor(Math.random() * pixelCount);
        centroids.push([...pixels[idx]]);
    }

    // K-means clustering
    const labels = new Int32Array(pixelCount);

    for (let iter = 0; iter < iterations; iter++) {
        // Assign pixels to nearest centroid
        for (let p = 0; p < pixelCount; p++) {
            let minDist = Infinity;
            let minLabel = 0;
            for (let c = 0; c < k; c++) {
                const dr = pixels[p][0] - centroids[c][0];
                const dg = pixels[p][1] - centroids[c][1];
                const db = pixels[p][2] - centroids[c][2];
                const dist = dr * dr + dg * dg + db * db;
                if (dist < minDist) {
                    minDist = dist;
                    minLabel = c;
                }
            }
            labels[p] = minLabel;
        }

        // Update centroids
        const sums: [number, number, number][] = Array(k).fill(null).map(() => [0, 0, 0]);
        const counts = new Int32Array(k);

        for (let p = 0; p < pixelCount; p++) {
            const label = labels[p];
            sums[label][0] += pixels[p][0];
            sums[label][1] += pixels[p][1];
            sums[label][2] += pixels[p][2];
            counts[label]++;
        }

        for (let c = 0; c < k; c++) {
            if (counts[c] > 0) {
                centroids[c][0] = sums[c][0] / counts[c];
                centroids[c][1] = sums[c][1] / counts[c];
                centroids[c][2] = sums[c][2] / counts[c];
            }
        }
    }

    // Create output image with centroid colors
    const output = new ImageData(width, height);
    for (let i = 0; i < pixelCount; i++) {
        const centroid = centroids[labels[i]];
        output.data[i * 4] = Math.round(centroid[0]);
        output.data[i * 4 + 1] = Math.round(centroid[1]);
        output.data[i * 4 + 2] = Math.round(centroid[2]);
        output.data[i * 4 + 3] = 255;
    }
    return output;
}

// ============= COMPONENT =============
export const CustomControlNet: React.FC = () => {
    // State
    const [inputImage, setInputImage] = useState<File | null>(null);
    const [inputImageUrl, setInputImageUrl] = useState<string | null>(null);
    const [mode, setMode] = useState<ProcessingMode>('canny');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

    // Canny parameters
    const [cannyLowThreshold, setCannyLowThreshold] = useState(50);
    const [cannyHighThreshold, setCannyHighThreshold] = useState(150);

    // Segmentation parameters
    const [segmentationClusters, setSegmentationClusters] = useState(5);

    // Use preloaded models from ModelPreloader service
    const {
        depthSession,
        poseDetector,
        isDepthLoading: loadingModel,
        isPoseLoading: loadingPoseModel,
        depthError: modelError,
        poseError: poseModelError,
    } = usePreloadedModels();

    // Pose-specific state
    const [poseJson, setPoseJson] = useState<string | null>(null);
    const [poseConfidenceThreshold, setPoseConfidenceThreshold] = useState(0.3);
    const [poses, setPoses] = useState<PoseOutput[]>([]);
    const [selectedPoseId, setSelectedPoseId] = useState<number | null>(null);
    const [poseZoom, setPoseZoom] = useState(1.0);

    // Light-specific state
    const [lightJson, setLightJson] = useState<string | null>(null);
    const [lightThreshold, setLightThreshold] = useState(0.7);
    const [lights, setLights] = useState<LightSource[]>([]);
    const [selectedLightId, setSelectedLightId] = useState<number | null>(null);

    // Normal map parameters
    const [normalStrength, setNormalStrength] = useState(2.0);
    const [normalInvertY, setNormalInvertY] = useState(false);

    // Refs
    const inputImageRef = useRef<HTMLImageElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Handle image selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setInputImage(file);
        const url = URL.createObjectURL(file);
        setInputImageUrl(url);
        setResultImageUrl(null);
        setPoseJson(null);
    };

    // Get image data from canvas - preserves aspect ratio
    const getImageData = useCallback(async (): Promise<{ imageData: ImageData; width: number; height: number } | null> => {
        if (!inputImageUrl) return null;

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                // Calculate dimensions while preserving aspect ratio
                let width = img.naturalWidth;
                let height = img.naturalHeight;

                // Scale down if exceeds MAX_DIMENSION
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    const scale = MAX_DIMENSION / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve({
                    imageData: ctx.getImageData(0, 0, width, height),
                    width,
                    height
                });
            };
            img.src = inputImageUrl;
        });
    }, [inputImageUrl]);

    // Process with Canny
    const processCanny = useCallback(async () => {
        const result = await getImageData();
        if (!result) return null;

        const { imageData, width, height } = result;
        const cannyResult = applyCanny(imageData, cannyLowThreshold, cannyHighThreshold);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.putImageData(cannyResult, 0, 0);
        return canvas.toDataURL('image/png');
    }, [getImageData, cannyLowThreshold, cannyHighThreshold]);

    // Process with Segmentation
    const processSegmentation = useCallback(async () => {
        const result = await getImageData();
        if (!result) return null;

        const { imageData, width, height } = result;
        const segResult = applySegmentation(imageData, segmentationClusters);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.putImageData(segResult, 0, 0);
        return canvas.toDataURL('image/png');
    }, [getImageData, segmentationClusters]);

    // Process with Depth (requires fixed 256x256 input for MiDaS model)
    const processDepth = useCallback(async () => {
        if (!depthSession || !inputImageUrl) return null;

        return new Promise<string | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = async () => {
                try {
                    // Prepare input - MiDaS requires fixed 256x256 input
                    const offCanvas = document.createElement('canvas');
                    offCanvas.width = DEPTH_MODEL_SIZE;
                    offCanvas.height = DEPTH_MODEL_SIZE;
                    const offCtx = offCanvas.getContext('2d');
                    if (!offCtx) {
                        resolve(null);
                        return;
                    }

                    offCtx.drawImage(img, 0, 0, DEPTH_MODEL_SIZE, DEPTH_MODEL_SIZE);
                    const imageData = offCtx.getImageData(0, 0, DEPTH_MODEL_SIZE, DEPTH_MODEL_SIZE);
                    const { data } = imageData;

                    // Convert RGBA -> NCHW float32 [1, 3, H, W]
                    const inputTensorData = new Float32Array(1 * 3 * DEPTH_MODEL_SIZE * DEPTH_MODEL_SIZE);
                    const hw = DEPTH_MODEL_SIZE * DEPTH_MODEL_SIZE;

                    for (let i = 0; i < hw; i++) {
                        const r = data[4 * i + 0] / 255;
                        const g = data[4 * i + 1] / 255;
                        const b = data[4 * i + 2] / 255;
                        inputTensorData[i] = r;
                        inputTensorData[i + hw] = g;
                        inputTensorData[i + 2 * hw] = b;
                    }

                    const inputTensor = new ort.Tensor('float32', inputTensorData, [1, 3, DEPTH_MODEL_SIZE, DEPTH_MODEL_SIZE]);

                    // Get input name from session
                    const inputName = depthSession.inputNames[0];
                    const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };

                    // Run inference
                    const results = await depthSession.run(feeds);

                    // Get output
                    const outputName = depthSession.outputNames[0];
                    const depthOutput = results[outputName] as ort.Tensor;
                    const depthData = depthOutput.data as Float32Array;

                    // Normalize depth values
                    let min = Infinity, max = -Infinity;
                    for (let i = 0; i < depthData.length; i++) {
                        if (depthData[i] < min) min = depthData[i];
                        if (depthData[i] > max) max = depthData[i];
                    }

                    // Create depth visualization at original aspect ratio
                    // Scale depth output back to original image dimensions
                    const origWidth = img.naturalWidth;
                    const origHeight = img.naturalHeight;

                    // Calculate output dimensions preserving aspect ratio
                    let outWidth = origWidth;
                    let outHeight = origHeight;
                    if (outWidth > MAX_DIMENSION || outHeight > MAX_DIMENSION) {
                        const scale = MAX_DIMENSION / Math.max(outWidth, outHeight);
                        outWidth = Math.round(outWidth * scale);
                        outHeight = Math.round(outHeight * scale);
                    }

                    const depthCanvas = document.createElement('canvas');
                    depthCanvas.width = outWidth;
                    depthCanvas.height = outHeight;
                    const depthCtx = depthCanvas.getContext('2d');
                    if (!depthCtx) {
                        resolve(null);
                        return;
                    }

                    // Create 256x256 depth image first
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = DEPTH_MODEL_SIZE;
                    tempCanvas.height = DEPTH_MODEL_SIZE;
                    const tempCtx = tempCanvas.getContext('2d');
                    if (!tempCtx) {
                        resolve(null);
                        return;
                    }

                    const depthImageData = tempCtx.createImageData(DEPTH_MODEL_SIZE, DEPTH_MODEL_SIZE);
                    for (let i = 0; i < hw; i++) {
                        const normalized = (depthData[i] - min) / (max - min + 1e-6);
                        const v = Math.round(normalized * 255);
                        depthImageData.data[4 * i + 0] = v;
                        depthImageData.data[4 * i + 1] = v;
                        depthImageData.data[4 * i + 2] = v;
                        depthImageData.data[4 * i + 3] = 255;
                    }
                    tempCtx.putImageData(depthImageData, 0, 0);

                    // Scale to output dimensions
                    depthCtx.drawImage(tempCanvas, 0, 0, outWidth, outHeight);
                    resolve(depthCanvas.toDataURL('image/png'));
                } catch (e) {
                    console.error('Depth inference error:', e);
                    resolve(null);
                }
            };
            img.src = inputImageUrl;
        });
    }, [depthSession, inputImageUrl]);

    // Process with Pose Detection
    const processPose = useCallback(async (): Promise<string | null> => {
        if (!poseDetector || !inputImageUrl) return null;

        return new Promise<string | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = async () => {
                try {
                    // Calculate dimensions preserving aspect ratio
                    let width = img.naturalWidth;
                    let height = img.naturalHeight;

                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        const scale = MAX_DIMENSION / Math.max(width, height);
                        width = Math.round(width * scale);
                        height = Math.round(height * scale);
                    }

                    // Create canvas for pose detection
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(null);
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    // Detect poses
                    const poses = await poseDetector.estimatePoses(canvas);
                    console.log('Detected poses:', poses);

                    if (poses.length === 0) {
                        toast.warning('No poses detected in this image');
                    }

                    // Convert to our JSON format
                    const poseOutputs = convertToOutputFormat(poses, width, height, poseConfidenceThreshold);
                    const jsonString = JSON.stringify(poseOutputs, null, 2);
                    setPoseJson(jsonString);
                    // Populate poses state for interactive PoseControl component
                    setPoses(poseOutputs.map((p, i) => ({ ...p, id: i + 1, size: 1.0 })));
                    if (poseOutputs.length > 0) {
                        setSelectedPoseId(1);
                    }

                    // Draw skeleton on canvas
                    drawSkeleton(ctx, poses, width, height, poseConfidenceThreshold);

                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    console.error('Pose estimation error:', e);
                    resolve(null);
                }
            };
            img.src = inputImageUrl;
        });
    }, [poseDetector, inputImageUrl, poseConfidenceThreshold]);

    // Process with Light Extraction
    const processLight = useCallback(async (): Promise<string | null> => {
        const result = await getImageData();
        if (!result) return null;

        const { imageData, width, height } = result;
        // const { lights, mask } = extractLights(imageData, lightThreshold, width, height); // This line needs to change

        const mask = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const r = imageData.data[i * 4];
            const g = imageData.data[i * 4 + 1];
            const b = imageData.data[i * 4 + 2];
            mask[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }

        const extracted = extractLightSources(mask, imageData, width, height, lightThreshold);
        setLights(extracted);
        if (extracted.length > 0) {
            setSelectedLightId(extracted[0].id);
        }
        setLightJson(JSON.stringify(extracted, null, 2));

        // For light mode, we render the interactive component, but we can also generate a preview if needed.
        // For now, let's keep resultUrl empty effectively or set it to something dummy if the UI requires it one.
        // The UI logic checks for resultImageUrl to show the result.
        // We can perhaps create a dummy black image so the container renders?
        // Actually, we will modifying the render logic to show LightControl when mode is 'light'.
        // So we don't strictly need resultImageUrl. But the existing logic uses it to show the "Result" card.
        // Let's create a black canvas and export it, just so the "Results" section works as expected for now,
        // but we will overlay the controls.
        const blackCanvas = document.createElement('canvas');
        blackCanvas.width = width;
        blackCanvas.height = height;
        const blackCtx = blackCanvas.getContext('2d');
        if (blackCtx) {
            blackCtx.fillStyle = 'black';
            blackCtx.fillRect(0, 0, width, height);
            // We actually want the interactive editor. We will handle that in the JSX.
            return blackCanvas.toDataURL('image/png');
        }
        return '';
    }, [getImageData, lightThreshold]);

    // Process with Normal Map generation
    const processNormal = useCallback(async () => {
        const result = await getImageData();
        if (!result) return null;

        const { imageData, width, height } = result;
        const normalResult = generateNormalMap(imageData, {
            strength: normalStrength,
            invertY: normalInvertY,
            grayscaleFromLuma: true,
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.putImageData(normalResult, 0, 0);
        return canvas.toDataURL('image/png');
    }, [getImageData, normalStrength, normalInvertY]);

    // Main process function
    const handleProcess = async () => {
        if (!inputImage) {
            toast.error('Please select an image first');
            return;
        }

        if (mode === 'depth' && !depthSession) {
            toast.error('Depth model is not loaded yet');
            return;
        }

        if (mode === 'pose' && !poseDetector) {
            toast.error('Pose model is not loaded yet');
            return;
        }

        setIsProcessing(true);
        setResultImageUrl(null);
        setPoseJson(null);

        try {
            let result: string | null = null;

            switch (mode) {
                case 'canny':
                    result = await processCanny();
                    break;
                case 'segmentation':
                    result = await processSegmentation();
                    break;
                case 'depth':
                    result = await processDepth();
                    break;
                case 'pose':
                    result = await processPose();
                    break;
                case 'light':
                    result = await processLight();
                    break;
                case 'normal':
                    result = await processNormal();
                    break;
            }

            if (result) {
                setResultImageUrl(result);
                toast.success('Processing complete!');
            } else {
                toast.error('Failed to process image');
            }
        } catch (error) {
            console.error('Processing error:', error);
            toast.error('Failed to process image');
        } finally {
            setIsProcessing(false);
        }
    };

    // Download result
    const handleDownload = () => {
        if (!resultImageUrl) return;

        const a = document.createElement('a');
        a.href = resultImageUrl;
        a.download = `${mode}-${Date.now()}.png`;
        a.click();
    };


    // Copy pose JSON to clipboard
    const handleCopyJson = () => {
        const jsonToCopy = mode === 'pose' ? poseJson : lightJson;
        if (!jsonToCopy) return;

        navigator.clipboard.writeText(jsonToCopy).then(() => {
            toast.success('JSON copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy JSON');
        });
    };

    const handleDownloadJson = () => {
        const jsonToDownload = mode === 'pose' ? poseJson : lightJson;
        if (!jsonToDownload) return;

        const blob = new Blob([jsonToDownload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mode}-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getModeIcon = (m: ProcessingMode) => {
        switch (m) {
            case 'canny': return <GitBranch className="w-4 h-4" />;
            case 'segmentation': return <Layers className="w-4 h-4" />;
            case 'depth': return <Box className="w-4 h-4" />;
            case 'pose': return <User className="w-4 h-4" />;
            case 'light': return <Lightbulb className="w-4 h-4" />;
            case 'normal': return <Box className="w-4 h-4" />;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Image Upload */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-gradient-primary">
                            <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Input Image
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Upload an image for preprocessing
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button
                            variant="outline"
                            className="w-full h-32 border-dashed"
                            onClick={() => document.getElementById('custom-cn-input')?.click()}
                        >
                            <ImageIcon className="w-6 h-6 mr-2" />
                            {inputImage ? inputImage.name : 'Choose Image'}
                        </Button>
                        <input
                            id="custom-cn-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />

                        {inputImageUrl && (
                            <div className="border rounded-lg overflow-hidden">
                                <img
                                    ref={inputImageRef}
                                    src={inputImageUrl}
                                    alt="Input"
                                    className="w-full h-48 object-cover"
                                />
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Middle Column: Settings */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-gradient-primary">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Processing Settings
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Configure preprocessing parameters
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Mode Selection */}
                        <div className="space-y-2">
                            <Label>Processing Mode</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {(['canny', 'segmentation', 'depth', 'pose', 'light', 'normal'] as ProcessingMode[]).map((m) => (
                                    <Button
                                        key={m}
                                        variant={mode === m ? 'secondary' : 'outline'}
                                        size="sm"
                                        onClick={() => setMode(m)}
                                        className="flex items-center gap-1 capitalize"
                                    >
                                        {getModeIcon(m)}
                                        {m}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        {/* Canny Settings */}
                        {mode === 'canny' && (
                            <>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Low Threshold</Label>
                                        <span className="text-sm text-muted-foreground">{cannyLowThreshold}</span>
                                    </div>
                                    <Slider
                                        value={[cannyLowThreshold]}
                                        onValueChange={(v) => setCannyLowThreshold(v[0])}
                                        min={10}
                                        max={200}
                                        step={5}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Weak edge threshold for hysteresis
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>High Threshold</Label>
                                        <span className="text-sm text-muted-foreground">{cannyHighThreshold}</span>
                                    </div>
                                    <Slider
                                        value={[cannyHighThreshold]}
                                        onValueChange={(v) => setCannyHighThreshold(v[0])}
                                        min={50}
                                        max={300}
                                        step={5}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Strong edge threshold for hysteresis
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Segmentation Settings */}
                        {mode === 'segmentation' && (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>Number of Clusters (K)</Label>
                                    <span className="text-sm text-muted-foreground">{segmentationClusters}</span>
                                </div>
                                <Slider
                                    value={[segmentationClusters]}
                                    onValueChange={(v) => setSegmentationClusters(v[0])}
                                    min={2}
                                    max={16}
                                    step={1}
                                />
                                <p className="text-xs text-muted-foreground">
                                    More clusters = more detail, fewer = more abstraction
                                </p>
                            </div>
                        )}

                        {/* Depth Settings */}
                        {mode === 'depth' && (
                            <div className="space-y-2">
                                {loadingModel && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Loading depth model...</span>
                                    </div>
                                )}
                                {modelError && (
                                    <p className="text-sm text-red-500">{modelError}</p>
                                )}
                                {depthSession && !loadingModel && (
                                    <p className="text-sm text-green-500">✓ Depth model loaded</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Uses MiDaS v2.1 small model for monocular depth estimation
                                </p>
                            </div>
                        )}

                        {/* Pose Settings */}
                        {mode === 'pose' && (
                            <div className="space-y-4">
                                {loadingPoseModel && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Loading pose model...</span>
                                    </div>
                                )}
                                {poseModelError && (
                                    <p className="text-sm text-red-500">{poseModelError}</p>
                                )}
                                {poseDetector && !loadingPoseModel && (
                                    <p className="text-sm text-green-500">✓ Pose model loaded</p>
                                )}

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Confidence Threshold</Label>
                                        <span className="text-sm text-muted-foreground">{poseConfidenceThreshold.toFixed(2)}</span>
                                    </div>
                                    <Slider
                                        value={[poseConfidenceThreshold]}
                                        onValueChange={(v) => setPoseConfidenceThreshold(v[0])}
                                        min={0.1}
                                        max={0.9}
                                        step={0.05}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Higher threshold = more confident keypoint detection only
                                    </p>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Uses MoveNet MultiPose for detecting multiple people. Detects 17 body keypoints per person.
                                </p>
                            </div>
                        )}

                        {/* Light Settings */}
                        {mode === 'light' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Brightness Threshold</Label>
                                        <span className="text-sm text-muted-foreground">{lightThreshold.toFixed(2)}</span>
                                    </div>
                                    <Slider
                                        value={[lightThreshold]}
                                        onValueChange={(v) => setLightThreshold(v[0])}
                                        min={0.1}
                                        max={0.99}
                                        step={0.01}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Threshold to identify light sources (0-1). Higher values find only brighter lights.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Normal Map Settings */}
                        {mode === 'normal' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Strength</Label>
                                        <span className="text-sm text-muted-foreground">{normalStrength.toFixed(1)}</span>
                                    </div>
                                    <Slider
                                        value={[normalStrength]}
                                        onValueChange={(v) => setNormalStrength(v[0])}
                                        min={0.5}
                                        max={10}
                                        step={0.1}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Controls the intensity of the normal map details. Higher = more pronounced bumps.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Invert Y (DirectX Style)</Label>
                                    <input
                                        type="checkbox"
                                        checked={normalInvertY}
                                        onChange={(e) => setNormalInvertY(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Enable for DirectX-style normal maps. Disable for OpenGL-style.
                                </p>
                            </div>
                        )}

                        <Button
                            onClick={handleProcess}
                            disabled={!inputImage || isProcessing || (mode === 'depth' && !depthSession) || (mode === 'pose' && !poseDetector)}
                            className="w-full"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Process Image'
                            )}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 bg-ai-surface border-border shadow-card min-h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Result
                        </h3>
                        {resultImageUrl && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 rounded-xl border-2 border-dashed border-border/50 bg-black/20 overflow-hidden relative flex items-center justify-center" style={{ minHeight: '400px' }}>
                        {mode === 'pose' && poses.length > 0 ? (
                            <div className="relative w-full h-full bg-gray-800 overflow-hidden" style={{ minHeight: '400px' }}>
                                {poses.map((pose) => (
                                    <PoseControl
                                        key={pose.id}
                                        poseSpec={pose}
                                        isSelected={selectedPoseId === pose.id}
                                        onSelect={() => setSelectedPoseId(pose.id)}
                                        onSelectPose={(id) => setSelectedPoseId(id)}
                                        otherPoses={poses.filter(p => p.id !== pose.id)}
                                        zoom={poseZoom}
                                        onZoomChange={setPoseZoom}
                                        onChange={(updates) => {
                                            const newPoses = poses.map(p => p.id === pose.id ? { ...p, ...updates } : p);
                                            setPoses(newPoses);
                                            setPoseJson(JSON.stringify(newPoses, null, 2));
                                        }}
                                        onAddPose={() => {
                                            const newId = Math.max(...poses.map(p => p.id)) + 1;
                                            const newPose: PoseOutput = {
                                                id: newId,
                                                center: { x: 0.45 + Math.random() * 0.1, y: 0.45 + Math.random() * 0.1 },
                                                x: 0.5,
                                                y: 0.5,
                                                headRotationX: 0.5,
                                                headRotationY: 0.5,
                                                head: { noseDistance: 0.07, noseAngle: 0.75, leftEyeDistance: 0.02, leftEyeAngle: 0.625, rightEyeDistance: 0.02, rightEyeAngle: 0.875, leftEarDistance: 0.02, leftEarAngle: 0.5, rightEarDistance: 0.02, rightEarAngle: 0 },
                                                rightArm: { shoulderDistance: 0.07, shoulderAngle: 0.875, elbowDistance: 0.08, elbowAngle: 0.625, wristDistance: 0.08, wristAngle: 0.625 },
                                                leftArm: { shoulderDistance: 0.07, shoulderAngle: 0.625, elbowDistance: 0.08, elbowAngle: 0.875, wristDistance: 0.08, wristAngle: 0.875 },
                                                leftLeg: { hipDistance: 0.05, hipAngle: 0.3, kneeDistance: 0.12, kneeAngle: 0.3, ankleDistance: 0.12, ankleAngle: 0.3 },
                                                rightLeg: { hipDistance: 0.05, hipAngle: 0.2, kneeDistance: 0.12, kneeAngle: 0.2, ankleDistance: 0.12, ankleAngle: 0.2 }
                                            };
                                            const newPoses = [...poses, newPose];
                                            setPoses(newPoses);
                                            setSelectedPoseId(newId);
                                            setPoseJson(JSON.stringify(newPoses, null, 2));
                                        }}
                                    />
                                ))}
                            </div>
                        ) : mode === 'light' && lights.length > 0 ? (
                            <div className="relative w-full h-full bg-black overflow-hidden" style={{ minHeight: '400px' }}>
                                {lights.map((light) => (
                                    <LightControl
                                        key={light.id}
                                        lightSpec={light}
                                        isSelected={selectedLightId === light.id}
                                        onSelect={() => setSelectedLightId(light.id)}
                                        onSelectOther={(id) => setSelectedLightId(id)}
                                        otherLights={lights.filter(l => l.id !== light.id)}
                                        onChange={(updates) => {
                                            const newLights = lights.map(l => l.id === light.id ? { ...l, ...updates } : l);
                                            setLights(newLights);
                                            setLightJson(JSON.stringify(newLights, null, 2));
                                        }}
                                        onAddLight={() => {
                                            const newId = Math.max(...lights.map(l => l.id)) + 1;
                                            const newLight: LightSource = {
                                                id: newId,
                                                position: { x: 0.5, y: 0.5 },
                                                circleAmount: 0.25,
                                                size: 0.2,
                                                color: '#ffffff',
                                                power: 1.0,
                                                rotation: 0,
                                                intensity: 1.0
                                            };
                                            const newLights = [...lights, newLight];
                                            setLights(newLights);
                                            setSelectedLightId(newId);
                                            setLightJson(JSON.stringify(newLights, null, 2));
                                        }}
                                    />
                                ))}
                            </div>
                        ) : resultImageUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                <img
                                    src={resultImageUrl}
                                    alt="Result"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground p-8">
                                {isProcessing ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="animate-pulse">Processing image...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <GitBranch className="w-16 h-16 mx-auto opacity-20" />
                                        <p>Upload an image and select a processing mode to generate a control image</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {(mode === 'pose' && poseJson) || (mode === 'light' && lightJson) ? (
                        <Card className="mt-4 p-4 bg-background/50 border-border">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <FileJson className="w-4 h-4 text-primary" />
                                    {mode === 'pose' ? 'Pose Data (JSON)' : 'Light Data (JSON)'}
                                </h4>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyJson}
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadJson}
                                    >
                                        <Download className="w-3 h-3 mr-1" />
                                        JSON
                                    </Button>
                                </div>
                            </div>
                            <pre className="text-xs text-muted-foreground overflow-auto max-h-40 bg-black/20 p-2 rounded">
                                {mode === 'pose' ? poseJson : lightJson}
                            </pre>
                        </Card>
                    ) : null}

                    <canvas ref={canvasRef} className="hidden" />
                </Card>
            </div>
        </div>
    );
};
