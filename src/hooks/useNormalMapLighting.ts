import { useCallback, useRef } from 'react';

interface LightSettings {
    x: number;
    y: number;
    z: number;
    depth: number;
    color: { r: number; g: number; b: number };
    intensity: number;
    opacity: number;
    ambientIntensity: number;
}

export const useNormalMapLighting = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const applyLighting = useCallback((
        originalImage: HTMLImageElement,
        normalMap: HTMLImageElement,
        depthMap: HTMLImageElement | null,
        settings: LightSettings,
        outputCanvas: HTMLCanvasElement
    ) => {
        const ctx = outputCanvas.getContext('2d');
        if (!ctx) return;

        const width = originalImage.width;
        const height = originalImage.height;

        outputCanvas.width = width;
        outputCanvas.height = height;

        // Create temporary canvases for processing
        const originalCanvas = document.createElement('canvas');
        const normalCanvas = document.createElement('canvas');
        const depthCanvas = document.createElement('canvas');
        originalCanvas.width = width;
        originalCanvas.height = height;
        normalCanvas.width = width;
        normalCanvas.height = height;
        depthCanvas.width = width;
        depthCanvas.height = height;

        const originalCtx = originalCanvas.getContext('2d')!;
        const normalCtx = normalCanvas.getContext('2d')!;
        const depthCtx = depthCanvas.getContext('2d')!;

        originalCtx.drawImage(originalImage, 0, 0);
        normalCtx.drawImage(normalMap, 0, 0, width, height);

        // Draw depth map if available, otherwise fill with white (maximum depth = closest)
        if (depthMap) {
            depthCtx.drawImage(depthMap, 0, 0, width, height);
        } else {
            depthCtx.fillStyle = 'white';
            depthCtx.fillRect(0, 0, width, height);
        }

        const originalData = originalCtx.getImageData(0, 0, width, height);
        const normalData = normalCtx.getImageData(0, 0, width, height);
        const depthData = depthCtx.getImageData(0, 0, width, height);
        const outputData = ctx.createImageData(width, height);

        // Light position in normalized coordinates
        const lightX = (settings.x / width) * 2 - 1;
        const lightY = (settings.y / height) * 2 - 1;
        const baseLightZ = settings.z;
        const lightDepthSetting = settings.depth;
        const opacity = settings.opacity;

        for (let i = 0; i < originalData.data.length; i += 4) {
            const pixelIndex = i / 4;
            const px = (pixelIndex % width) / width * 2 - 1;
            const py = (Math.floor(pixelIndex / width) / height) * 2 - 1;

            // Get depth value (0-1, where 1 = white = closest to viewer)
            const pixelDepth = depthData.data[i] / 255;

            // Calculate effective light Z relative to pixel depth and light depth setting
            // Light depth setting controls how deep/far the light penetrates
            const depthDifference = lightDepthSetting - pixelDepth;
            const effectiveLightZ = baseLightZ + depthDifference;

            // Calculate light direction from pixel to light source
            const dx = lightX - px;
            const dy = lightY - py;
            const dz = effectiveLightZ;

            // Normalize light direction
            const lightMag = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const lx = dx / lightMag;
            const ly = -dy / lightMag; // Flip Y for proper orientation
            const lz = dz / lightMag;

            // Get normal from normal map (convert from 0-255 to -1 to 1)
            const nx = (normalData.data[i] / 255) * 2 - 1;
            const ny = -((normalData.data[i + 1] / 255) * 2 - 1); // Flip Y
            const nz = (normalData.data[i + 2] / 255) * 2 - 1;

            // Calculate dot product for diffuse lighting
            let dot = nx * lx + ny * ly + nz * lz;
            dot = Math.max(0, dot);

            // Distance attenuation based on depth difference
            const depthDist = Math.abs(lightDepthSetting - pixelDepth);
            const attenuation = 1 / (1 + depthDist * 2);

            // Apply intensity with attenuation
            const diffuse = dot * settings.intensity * attenuation;
            const ambient = settings.ambientIntensity;

            // Calculate lit color
            const litR = Math.min(255, originalData.data[i] * ((settings.color.r / 255) * diffuse + ambient));
            const litG = Math.min(255, originalData.data[i + 1] * ((settings.color.g / 255) * diffuse + ambient));
            const litB = Math.min(255, originalData.data[i + 2] * ((settings.color.b / 255) * diffuse + ambient));

            // Blend between original and lit image based on opacity
            outputData.data[i] = Math.round(originalData.data[i] * (1 - opacity) + litR * opacity);
            outputData.data[i + 1] = Math.round(originalData.data[i + 1] * (1 - opacity) + litG * opacity);
            outputData.data[i + 2] = Math.round(originalData.data[i + 2] * (1 - opacity) + litB * opacity);
            outputData.data[i + 3] = originalData.data[i + 3];
        }

        ctx.putImageData(outputData, 0, 0);
    }, []);

    return { applyLighting, canvasRef };
};
