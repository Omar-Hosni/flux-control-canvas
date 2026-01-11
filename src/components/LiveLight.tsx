import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Lightbulb, Loader2, Check, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { RunwareService } from '@/services/RunwareService';

interface LiveLightProps {
    runwareService: RunwareService;
}

// Prompts as specified in the requirements
const DARK_IMAGE_PROMPT = "Turn this scene into a dark, unlit environment with no artificial lighting. Make all visible light sources like ceiling lamps, bulbs, neon signs, and glowing windows appear switched off and inactive, and remove or strongly soften all bright reflections and highlights on floors, walls, furniture, metal, glass, and skin. Keep only very faint ambient illumination so the scene is still barely visible. Preserve the camera angle, composition, subject poses, identities, objects, textures, and overall color palette, and do not add any new objects or change the background layout.";

const BLEND_PROMPT = "blend the lights and shadows of the image and upscale, keep all details the same, blend the skin color with lighting properly";

export const LiveLight: React.FC<LiveLightProps> = ({ runwareService }) => {
    // Mode state (only 'edit' is implemented for now)
    const [mode] = useState<'edit' | 'add'>('edit');

    // Image states
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
    const [darkImageUrl, setDarkImageUrl] = useState<string>('');
    const [finalImageUrl, setFinalImageUrl] = useState<string>('');

    // Processing states
    const [isProcessingDark, setIsProcessingDark] = useState(false);
    const [isProcessingFinal, setIsProcessingFinal] = useState(false);

    // Color picker state (default orange)
    const [tintColor, setTintColor] = useState<string>('#ff6600');

    // Canvas refs for difference computation
    const originalCanvasRef = useRef<HTMLCanvasElement>(null);
    const darkCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // NEW: Pre-computed mask canvas for fast GPU compositing
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const originalImageRef = useRef<HTMLImageElement | null>(null);

    /**
     * Handle image upload - stores the file and creates a preview URL
     */
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedImage(file);
            const url = URL.createObjectURL(file);
            setUploadedImageUrl(url);
            // Reset other states
            setDarkImageUrl('');
            setFinalImageUrl('');
            maskCanvasRef.current = null;
            originalImageRef.current = null;
        }
    };

    /**
     * Generate dark version of the image using Runware API
     */
    const generateDarkImage = useCallback(async () => {
        if (!uploadedImage || !runwareService) return;

        setIsProcessingDark(true);
        try {
            // Upload image first to get URL
            const imageUrl = await runwareService.uploadImageForURL(uploadedImage);

            // Generate dark version using the new prepareLiveLightEdit function
            const result = await runwareService.prepareLiveLightEdit({
                referenceImage: imageUrl,
                positivePrompt: DARK_IMAGE_PROMPT,
                turbo: true,
            });

            setDarkImageUrl(result.imageURL);
            toast.success('Dark image generated successfully!');
        } catch (error) {
            console.error('Failed to generate dark image:', error);
            toast.error('Failed to generate dark image. Please try again.');
        } finally {
            setIsProcessingDark(false);
        }
    }, [uploadedImage, runwareService]);

    // Auto-generate dark image when an image is uploaded
    useEffect(() => {
        if (uploadedImage && uploadedImageUrl) {
            generateDarkImage();
        }
    }, [uploadedImage, uploadedImageUrl, generateDarkImage]);

    /**
     * Compute pixel-wise COLOR difference map between original and dark image
     * Creates a difference canvas with actual RGB differences (not grayscale)
     * The difference layer will be overlayed on the original image
     */
    const computeDifferenceMap = useCallback(() => {
        const originalCanvas = originalCanvasRef.current;
        const darkCanvas = darkCanvasRef.current;
        const previewCanvas = previewCanvasRef.current;

        if (!originalCanvas || !darkCanvas || !previewCanvas) return;
        if (!uploadedImageUrl || !darkImageUrl) return;

        const originalCtx = originalCanvas.getContext('2d');
        const darkCtx = darkCanvas.getContext('2d');

        if (!originalCtx || !darkCtx) return;

        // Load both images
        const originalImg = new Image();
        const darkImg = new Image();
        darkImg.crossOrigin = 'anonymous';

        let originalLoaded = false;
        let darkLoaded = false;

        const processWhenBothLoaded = () => {
            if (!originalLoaded || !darkLoaded) return;

            const width = originalImg.width;
            const height = originalImg.height;

            // Set canvas sizes
            originalCanvas.width = width;
            originalCanvas.height = height;
            darkCanvas.width = width;
            darkCanvas.height = height;
            previewCanvas.width = width;
            previewCanvas.height = height;

            // Draw images to canvases
            originalCtx.drawImage(originalImg, 0, 0, width, height);
            darkCtx.drawImage(darkImg, 0, 0, width, height);

            // Get image data for difference computation
            const originalData = originalCtx.getImageData(0, 0, width, height);
            const darkData = darkCtx.getImageData(0, 0, width, height);

            // Store original image for fast compositing
            originalImageRef.current = originalImg;

            // Create difference canvas with actual RGB color differences
            const diffCanvas = document.createElement('canvas');
            diffCanvas.width = width;
            diffCanvas.height = height;
            const diffCtx = diffCanvas.getContext('2d')!;
            const diffData = diffCtx.createImageData(width, height);

            // Noise threshold to filter tiny artifacts
            const threshold = 5;

            // Compute per-channel color difference
            for (let i = 0; i < originalData.data.length; i += 4) {
                const r1 = originalData.data[i];
                const g1 = originalData.data[i + 1];
                const b1 = originalData.data[i + 2];

                const r2 = darkData.data[i];
                const g2 = darkData.data[i + 1];
                const b2 = darkData.data[i + 2];

                // Calculate absolute difference for each channel
                const diffR = Math.abs(r1 - r2);
                const diffG = Math.abs(g1 - g2);
                const diffB = Math.abs(b1 - b2);

                // Calculate max difference for alpha
                const maxDiff = Math.max(diffR, diffG, diffB);

                // Apply threshold - if below threshold, make transparent
                if (maxDiff <= threshold) {
                    diffData.data[i] = 0;
                    diffData.data[i + 1] = 0;
                    diffData.data[i + 2] = 0;
                    diffData.data[i + 3] = 0;
                } else {
                    // Store the actual color difference
                    diffData.data[i] = diffR;
                    diffData.data[i + 1] = diffG;
                    diffData.data[i + 2] = diffB;
                    // Alpha reflects the magnitude of the difference (minimum 50 for visibility)
                    diffData.data[i + 3] = Math.max(maxDiff, 50);
                }
            }

            diffCtx.putImageData(diffData, 0, 0);
            maskCanvasRef.current = diffCanvas;

            // Render initial preview
            renderCompositedPreview();
        };

        originalImg.onload = () => {
            originalLoaded = true;
            processWhenBothLoaded();
        };

        darkImg.onload = () => {
            darkLoaded = true;
            processWhenBothLoaded();
        };

        originalImg.src = uploadedImageUrl;
        darkImg.src = darkImageUrl;
    }, [uploadedImageUrl, darkImageUrl]);

    /**
     * Render the composited preview: original image + tinted difference overlay
     * The difference layer contains actual RGB differences, tint is applied as a color multiply
     */
    const renderCompositedPreview = useCallback(() => {
        const previewCanvas = previewCanvasRef.current;
        const diffCanvas = maskCanvasRef.current;
        const originalImg = originalImageRef.current;

        if (!previewCanvas || !diffCanvas || !originalImg) return;

        const ctx = previewCanvas.getContext('2d');
        if (!ctx) return;

        const width = previewCanvas.width;
        const height = previewCanvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Layer 1: Draw original image as base
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(originalImg, 0, 0, width, height);

        // Layer 2: Create a tinted difference layer
        const tintCanvas = document.createElement('canvas');
        tintCanvas.width = width;
        tintCanvas.height = height;
        const tintCtx = tintCanvas.getContext('2d')!;

        // Get the difference data
        const diffCtx = diffCanvas.getContext('2d')!;
        const diffData = diffCtx.getImageData(0, 0, width, height);
        const tintedData = tintCtx.createImageData(width, height);

        // Parse tint color from hex
        const tintR = parseInt(tintColor.slice(1, 3), 16) / 255;
        const tintG = parseInt(tintColor.slice(3, 5), 16) / 255;
        const tintB = parseInt(tintColor.slice(5, 7), 16) / 255;

        // Apply tint as a color multiply/blend with the difference
        for (let i = 0; i < diffData.data.length; i += 4) {
            const diffR = diffData.data[i];
            const diffG = diffData.data[i + 1];
            const diffB = diffData.data[i + 2];
            const alpha = diffData.data[i + 3];

            if (alpha > 0) {
                // Multiply difference with tint color, then boost for visibility
                tintedData.data[i] = Math.min(255, Math.round(diffR * tintR * 3));
                tintedData.data[i + 1] = Math.min(255, Math.round(diffG * tintG * 3));
                tintedData.data[i + 2] = Math.min(255, Math.round(diffB * tintB * 3));
                tintedData.data[i + 3] = alpha;
            } else {
                tintedData.data[i] = 0;
                tintedData.data[i + 1] = 0;
                tintedData.data[i + 2] = 0;
                tintedData.data[i + 3] = 0;
            }
        }

        tintCtx.putImageData(tintedData, 0, 0);

        // Layer 3: Composite tinted difference over original
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(tintCanvas, 0, 0);

        // Reset composite mode
        ctx.globalCompositeOperation = 'source-over';
    }, [tintColor]);

    // Compute difference when dark image is ready
    useEffect(() => {
        if (darkImageUrl && uploadedImageUrl) {
            computeDifferenceMap();
        }
    }, [darkImageUrl, uploadedImageUrl, computeDifferenceMap]);

    // Re-render preview when tint color changes - now instant!
    useEffect(() => {
        if (maskCanvasRef.current && originalImageRef.current) {
            renderCompositedPreview();
        }
    }, [tintColor, renderCompositedPreview]);

    /**
     * Handle "Done" button - export canvas and send for final processing
     */
    const handleDone = async () => {
        const previewCanvas = previewCanvasRef.current;
        if (!previewCanvas || !runwareService) {
            toast.error('No preview available');
            return;
        }

        setIsProcessingFinal(true);
        try {
            // Force re-render the preview with current tint color to ensure latest state
            renderCompositedPreview();

            // Small delay to ensure canvas is fully rendered
            await new Promise(resolve => setTimeout(resolve, 50));

            // Export canvas as blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                previewCanvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to export canvas'));
                }, 'image/png');
            });

            // Create File from blob
            const file = new File([blob], 'composited.png', { type: 'image/png' });

            // Upload composited image
            const imageUrl = await runwareService.uploadImageForURL(file);

            // Send for final blend/upscale using the new prepareLiveLightEdit function
            const result = await runwareService.prepareLiveLightEdit({
                referenceImage: imageUrl,
                positivePrompt: BLEND_PROMPT,
                turbo: true,
            });

            // Fetch the image as blob to bypass COEP restrictions
            // This creates a local object URL that won't be blocked
            try {
                const response = await fetch(result.imageURL);
                const blob = await response.blob();
                const localUrl = URL.createObjectURL(blob);
                setFinalImageUrl(localUrl);
            } catch (fetchError) {
                // Fallback to direct URL if fetch fails
                console.warn('Blob fetch failed, using direct URL:', fetchError);
                setFinalImageUrl(result.imageURL);
            }

            toast.success('Final image generated successfully!');
        } catch (error) {
            console.error('Failed to generate final image:', error);
            toast.error('Failed to generate final image. Please try again.');
        } finally {
            setIsProcessingFinal(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Upload and Controls */}
            <Card className="p-6 bg-ai-surface border-border shadow-card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                        <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            Live Light - {mode === 'edit' ? 'Edit Mode' : 'Add Mode'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Upload an image to analyze and tint light sources
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Image Upload */}
                    <div>
                        <Label className="text-sm font-medium">Upload Image</Label>
                        <Button
                            variant="outline"
                            className="w-full h-32 border-dashed mt-2"
                            onClick={() => document.getElementById('livelight-input')?.click()}
                        >
                            <Upload className="w-6 h-6 mr-2" />
                            {uploadedImage ? uploadedImage.name : 'Choose Image'}
                        </Button>
                        <input
                            id="livelight-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Preview of uploaded image */}
                    {uploadedImageUrl && (
                        <div className="border rounded-lg overflow-hidden">
                            <img
                                src={uploadedImageUrl}
                                alt="Uploaded"
                                className="w-full h-48 object-cover"
                            />
                        </div>
                    )}

                    {/* Processing status */}
                    {isProcessingDark && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating dark version...
                        </div>
                    )}

                    {/* Color Picker */}
                    {darkImageUrl && !isProcessingDark && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Palette className="w-4 h-4" />
                                <Label className="text-sm font-medium">Light Tint Color</Label>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="color"
                                    value={tintColor}
                                    onChange={(e) => setTintColor(e.target.value)}
                                    className="w-12 h-12 rounded cursor-pointer border border-border"
                                />
                                <span className="text-sm text-muted-foreground font-mono">
                                    {tintColor.toUpperCase()}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Choose a color to tint the detected light areas
                            </p>
                        </div>
                    )}

                    {/* Done Button */}
                    {darkImageUrl && !isProcessingDark && (
                        <Button
                            onClick={handleDone}
                            disabled={isProcessingFinal}
                            className="w-full"
                        >
                            {isProcessingFinal ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Done - Blend & Export
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Hidden canvases for computation */}
                <canvas ref={originalCanvasRef} style={{ display: 'none' }} />
                <canvas ref={darkCanvasRef} style={{ display: 'none' }} />
            </Card>

            {/* Right Column - Preview and Results */}
            <Card className="p-6 bg-ai-surface border-border shadow-card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Light Preview
                </h3>

                {/* Preview Canvas (shows composited result) */}
                {darkImageUrl && !isProcessingDark ? (
                    <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden bg-black/50">
                            <canvas
                                ref={previewCanvasRef}
                                className="max-w-full h-auto"
                                style={{ display: 'block' }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            Tinted difference overlay on original image
                        </p>
                    </div>
                ) : uploadedImageUrl && isProcessingDark ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin opacity-50" />
                        <p>Computing light difference map...</p>
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ai-surface-elevated flex items-center justify-center">
                            <Lightbulb className="w-8 h-8 opacity-50" />
                        </div>
                        <p>Upload an image to see the light preview</p>
                    </div>
                )}

                {/* Final Result */}
                {finalImageUrl && (
                    <div className="mt-6 space-y-4">
                        <h4 className="text-sm font-semibold">Final Result</h4>
                        <div className="border rounded-lg overflow-hidden">
                            <img
                                src={finalImageUrl}
                                alt="Final result"
                                crossOrigin="anonymous"
                                className="w-full h-auto"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = finalImageUrl;
                                link.download = 'livelight-result.webp';
                                link.click();
                            }}
                            className="w-full"
                        >
                            Download Result
                        </Button>
                    </div>
                )}

                {/* Instructions */}
                <div className="mt-6 p-4 bg-ai-surface-elevated rounded-lg border border-border">
                    <h4 className="text-sm font-semibold mb-2">How to use:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
                        <li>Upload an image with visible light sources</li>
                        <li>Wait for automatic dark version generation</li>
                        <li>Adjust the tint color to colorize light areas</li>
                        <li>Click "Done" to blend and export the final result</li>
                    </ol>
                </div>
            </Card>
        </div>
    );
};
