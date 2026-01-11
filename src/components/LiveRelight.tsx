import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Lightbulb, Loader2, Check, Palette, Plus, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';
import { RunwareService } from '@/services/RunwareService';
import RelightControl from './RelightControl';

interface LiveRelightProps {
    runwareService: RunwareService;
}

// Reuse prompts from LiveLight
const DARK_IMAGE_PROMPT = "Turn this scene into a dark, unlit environment with no artificial lighting. Make all visible light sources like ceiling lamps, bulbs, neon signs, and glowing windows appear switched off and inactive, and remove or strongly soften all bright reflections and highlights on floors, walls, furniture, metal, glass, and skin. Keep only very faint ambient illumination so the scene is still barely visible. Preserve the camera angle, composition, subject poses, identities, objects, textures, and overall color palette, and do not add any new objects or change the background layout.";
const BLEND_PROMPT = "blend the lights and shadows of the image and upscale, keep all details the same, blend the skin color with lighting properly";

export const LiveRelight: React.FC<LiveRelightProps> = ({ runwareService }) => {
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
    const [darkImageUrl, setDarkImageUrl] = useState<string>('');
    const [finalImageUrl, setFinalImageUrl] = useState<string>('');

    const [isProcessingDark, setIsProcessingDark] = useState(false);
    const [isProcessingFinal, setIsProcessingFinal] = useState(false);

    // Light Specification
    const [lightSpec, setLightSpec] = useState({
        position: { x: 0.5, y: 0.5 },
        depth: 0.5, // Depth in 3D space (distance from camera)
        color: '#ff6600',
        intensity: 1.0,
        rotationX: 0, // Pitch: -1 to 1 (-90° to 90°)
        rotationY: 0, // Yaw: 0 to 1 (0° to 360°)
        rotationZ: 0, // Roll: -1 to 1 (-90° to 90°)
        coneAngle: 0.5,
        id: 'main-light'
    });

    const [isSelected, setIsSelected] = useState(true);

    const originalCanvasRef = useRef<HTMLCanvasElement>(null);
    const darkCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const originalImageRef = useRef<HTMLImageElement | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedImage(file);
            const url = URL.createObjectURL(file);
            setUploadedImageUrl(url);
            setDarkImageUrl('');
            setFinalImageUrl('');
            maskCanvasRef.current = null;
            originalImageRef.current = null;
        }
    };

    const generateDarkImage = useCallback(async () => {
        if (!uploadedImage || !runwareService) return;

        setIsProcessingDark(true);
        try {
            const imageUrl = await runwareService.uploadImageForURL(uploadedImage);
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

    useEffect(() => {
        if (uploadedImage && uploadedImageUrl) {
            generateDarkImage();
        }
    }, [uploadedImage, uploadedImageUrl, generateDarkImage]);

    // Compute Difference Map (Same as LiveLight)
    const computeDifferenceMap = useCallback(() => {
        const originalCanvas = originalCanvasRef.current;
        const darkCanvas = darkCanvasRef.current;
        const previewCanvas = previewCanvasRef.current;

        if (!originalCanvas || !darkCanvas || !previewCanvas) return;
        if (!uploadedImageUrl || !darkImageUrl) return;

        const originalCtx = originalCanvas.getContext('2d');
        const darkCtx = darkCanvas.getContext('2d');

        if (!originalCtx || !darkCtx) return;

        const originalImg = new Image();
        const darkImg = new Image();
        darkImg.crossOrigin = 'anonymous';

        let originalLoaded = false;
        let darkLoaded = false;

        const processWhenBothLoaded = () => {
            if (!originalLoaded || !darkLoaded) return;

            const width = originalImg.width;
            const height = originalImg.height;

            originalCanvas.width = width;
            originalCanvas.height = height;
            darkCanvas.width = width;
            darkCanvas.height = height;
            previewCanvas.width = width;
            previewCanvas.height = height;

            originalCtx.drawImage(originalImg, 0, 0, width, height);
            darkCtx.drawImage(darkImg, 0, 0, width, height);

            const originalData = originalCtx.getImageData(0, 0, width, height);
            const darkData = darkCtx.getImageData(0, 0, width, height);

            originalImageRef.current = originalImg;

            const diffCanvas = document.createElement('canvas');
            diffCanvas.width = width;
            diffCanvas.height = height;
            const diffCtx = diffCanvas.getContext('2d')!;
            const diffData = diffCtx.createImageData(width, height);

            const threshold = 5;

            for (let i = 0; i < originalData.data.length; i += 4) {
                const r1 = originalData.data[i];
                const g1 = originalData.data[i + 1];
                const b1 = originalData.data[i + 2];

                const r2 = darkData.data[i];
                const g2 = darkData.data[i + 1];
                const b2 = darkData.data[i + 2];

                const diffR = Math.abs(r1 - r2);
                const diffG = Math.abs(g1 - g2);
                const diffB = Math.abs(b1 - b2);
                const maxDiff = Math.max(diffR, diffG, diffB);

                if (maxDiff <= threshold) {
                    diffData.data[i] = 0;
                    diffData.data[i + 1] = 0;
                    diffData.data[i + 2] = 0;
                    diffData.data[i + 3] = 0;
                } else {
                    diffData.data[i] = diffR;
                    diffData.data[i + 1] = diffG;
                    diffData.data[i + 2] = diffB;
                    diffData.data[i + 3] = Math.max(maxDiff, 50);
                }
            }

            diffCtx.putImageData(diffData, 0, 0);
            maskCanvasRef.current = diffCanvas;
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

    // Focused Spotlight - casts light ONLY in the direction the arrow points
    const drawLightMask = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const groundX = lightSpec.position.x * width;
        const groundY = lightSpec.position.y * height;

        // Calculate light direction based on rotation
        const pitchAngle = -(lightSpec.rotationX || 0) * (Math.PI / 2); // Inverted for correct direction
        const yawAngle = (lightSpec.rotationY || 0) * Math.PI * 2;
        const rollAngle = (lightSpec.rotationZ || 0) * (Math.PI / 2);

        // Calculate the actual 3D position of the light source (bottom center of box)
        const lightHeight = 50 + lightSpec.depth * 150;

        // Box bottom center in local space (before rotation)
        let boxBottomX = 0;
        let boxBottomY = -10; // Half height of box
        let boxBottomZ = 0;

        // Apply rotations (same order as in RelightControl)
        // Roll (Z)
        const cosRoll = Math.cos(rollAngle);
        const sinRoll = Math.sin(rollAngle);
        let tempX = boxBottomX * cosRoll - boxBottomY * sinRoll;
        let tempY = boxBottomX * sinRoll + boxBottomY * cosRoll;
        boxBottomX = tempX;
        boxBottomY = tempY;

        // Pitch (X)
        const cosPitch = Math.cos(pitchAngle);
        const sinPitch = Math.sin(pitchAngle);
        tempY = boxBottomY * cosPitch - boxBottomZ * sinPitch;
        let tempZ = boxBottomY * sinPitch + boxBottomZ * cosPitch;
        boxBottomY = tempY;
        boxBottomZ = tempZ;

        // Yaw (Y)
        const cosYaw = Math.cos(yawAngle);
        const sinYaw = Math.sin(yawAngle);
        tempX = boxBottomX * cosYaw + boxBottomZ * sinYaw;
        tempZ = -boxBottomX * sinYaw + boxBottomZ * cosYaw;
        boxBottomX = tempX;
        boxBottomZ = tempZ;

        // Translate to world position
        const worldX = boxBottomX;
        const worldY = boxBottomY + lightHeight;
        const worldZ = boxBottomZ;

        // Project to 2D (same projection as RelightControl)
        const cameraZ = 400;
        const perspective = cameraZ / (cameraZ + worldZ);
        const projectedSourceX = groundX + worldX * perspective;
        const projectedSourceY = groundY - worldY * perspective;

        // The "down" vector in local space (where light emits)
        let dirX = 0;
        let dirY = 1; // Changed from -1 to match arrow direction
        let dirZ = 0;

        // Apply pitch (rotation around X-axis) - reuse already calculated values
        const newDirY = dirY * cosPitch - dirZ * sinPitch;
        const newDirZ = dirY * sinPitch + dirZ * cosPitch;
        dirY = newDirY;
        dirZ = newDirZ;

        // Apply yaw (rotation around Y-axis) - reuse already calculated values
        const newDirX = dirX * cosYaw + dirZ * sinYaw;
        dirZ = -dirX * sinYaw + dirZ * cosYaw;
        dirX = newDirX;

        // Project direction onto 2D plane and normalize
        const projLen = Math.sqrt(dirX * dirX + dirY * dirY);
        const normalizedDirX = projLen > 0.01 ? dirX / projLen : 0;
        const normalizedDirY = projLen > 0.01 ? dirY / projLen : 0;

        ctx.clearRect(0, 0, width, height);

        // Spotlight parameters
        const coneAngle = Math.PI / 6; // 30 degrees cone angle
        const maxDistance = Math.max(width, height) * (0.4 + lightSpec.depth * 0.6);

        // Create image data for pixel-by-pixel spotlight
        const imageData = ctx.createImageData(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Vector from ACTUAL light source to this pixel
                const dx = x - projectedSourceX;
                const dy = y - projectedSourceY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 1) {
                    // At light source - full intensity
                    const idx = (y * width + x) * 4;
                    const intensity = Math.floor(lightSpec.intensity * 255);
                    imageData.data[idx] = intensity;
                    imageData.data[idx + 1] = intensity;
                    imageData.data[idx + 2] = intensity;
                    imageData.data[idx + 3] = intensity;
                    continue;
                }

                // Normalize pixel direction
                const pixelDirX = dx / distance;
                const pixelDirY = dy / distance;

                // Calculate angle between light direction and pixel
                const dotProduct = normalizedDirX * pixelDirX + normalizedDirY * pixelDirY;
                const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

                // Only light pixels within the cone
                if (angle <= coneAngle) {
                    const angleFalloff = 1 - (angle / coneAngle);
                    const distanceFalloff = Math.max(0, 1 - (distance / maxDistance));

                    // Smoothstep for soft edges
                    const smoothAngle = angleFalloff * angleFalloff * (3 - 2 * angleFalloff);
                    const smoothDistance = distanceFalloff * distanceFalloff * (3 - 2 * distanceFalloff);

                    const finalIntensity = smoothAngle * smoothDistance * lightSpec.intensity;

                    const idx = (y * width + x) * 4;
                    const intensity = Math.floor(finalIntensity * 255);
                    imageData.data[idx] = intensity;
                    imageData.data[idx + 1] = intensity;
                    imageData.data[idx + 2] = intensity;
                    imageData.data[idx + 3] = intensity;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Soft blur for smooth edges
        ctx.filter = 'blur(3px)';
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';
    };

    const renderCompositedPreview = useCallback(() => {
        const previewCanvas = previewCanvasRef.current;
        const diffCanvas = maskCanvasRef.current;
        const originalImg = originalImageRef.current;

        if (!previewCanvas || !diffCanvas || !originalImg) return;

        const ctx = previewCanvas.getContext('2d');
        if (!ctx) return;

        const width = previewCanvas.width;
        const height = previewCanvas.height;

        ctx.clearRect(0, 0, width, height);

        // 1. Draw Original Image
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(originalImg, 0, 0, width, height);

        // 2. Create Light Mask (The 3D Light footprint)
        const lightMaskCanvas = document.createElement('canvas');
        lightMaskCanvas.width = width;
        lightMaskCanvas.height = height;
        const lightMaskCtx = lightMaskCanvas.getContext('2d')!;
        drawLightMask(lightMaskCtx, width, height);

        // 3. Create Tinted & Masked Difference Layer
        const tintCanvas = document.createElement('canvas');
        tintCanvas.width = width;
        tintCanvas.height = height;
        const tintCtx = tintCanvas.getContext('2d')!;

        // Draw the difference map
        tintCtx.globalCompositeOperation = 'source-over';
        tintCtx.drawImage(diffCanvas, 0, 0);

        // Apply tint color
        tintCtx.globalCompositeOperation = 'source-atop';
        tintCtx.fillStyle = lightSpec.color;
        tintCtx.fillRect(0, 0, width, height);

        // Mask with light footprint
        tintCtx.globalCompositeOperation = 'destination-in';
        tintCtx.drawImage(lightMaskCanvas, 0, 0);

        // 4. Composite tinted light over original
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(tintCanvas, 0, 0);

        ctx.globalCompositeOperation = 'source-over';

    }, [lightSpec]);

    useEffect(() => {
        if (darkImageUrl && uploadedImageUrl) {
            computeDifferenceMap();
        }
    }, [darkImageUrl, uploadedImageUrl, computeDifferenceMap]);

    useEffect(() => {
        if (maskCanvasRef.current && originalImageRef.current) {
            renderCompositedPreview();
        }
    }, [lightSpec, renderCompositedPreview]);

    const handleDone = async () => {
        const previewCanvas = previewCanvasRef.current;
        if (!previewCanvas || !runwareService) return;

        setIsProcessingFinal(true);
        try {
            renderCompositedPreview();
            await new Promise(resolve => setTimeout(resolve, 50));

            const blob = await new Promise<Blob>((resolve, reject) => {
                previewCanvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to export canvas'));
                }, 'image/png');
            });

            const file = new File([blob], 'relit.png', { type: 'image/png' });
            const imageUrl = await runwareService.uploadImageForURL(file);

            const result = await runwareService.prepareLiveLightEdit({
                referenceImage: imageUrl,
                positivePrompt: BLEND_PROMPT,
                turbo: true,
            });

            // Fetch as blob to bypass CORS
            try {
                const response = await fetch(result.imageURL);
                const imageBlob = await response.blob();
                const localUrl = URL.createObjectURL(imageBlob);
                setFinalImageUrl(localUrl);
            } catch (fetchError) {
                console.warn('Blob fetch failed, using direct URL:', fetchError);
                setFinalImageUrl(result.imageURL);
            }

            toast.success('Final image generated!');
        } catch (error) {
            console.error(error);
            toast.error('Failed processing');
        } finally {
            setIsProcessingFinal(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6 bg-ai-surface border-border shadow-card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                        <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Live Relight</h2>
                        <p className="text-sm text-muted-foreground">3D Directional Light Component</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <Label className="text-sm font-medium">Upload Image</Label>
                        <Button
                            variant="outline"
                            className="w-full h-32 border-dashed mt-2"
                            onClick={() => document.getElementById('liverelight-input')?.click()}
                        >
                            <Upload className="w-6 h-6 mr-2" />
                            {uploadedImage ? uploadedImage.name : 'Choose Image'}
                        </Button>
                        <input
                            id="liverelight-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>

                    {uploadedImageUrl && (
                        <div className="border rounded-lg overflow-hidden relative group">
                            <img src={uploadedImageUrl} className="w-full h-48 object-cover" alt="Source" />
                        </div>
                    )}

                    {isProcessingDark && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing scene lights...
                        </div>
                    )}

                    {darkImageUrl && !isProcessingDark && (
                        <div className="space-y-4 border rounded-lg p-4 bg-ai-surface-elevated">
                            <div className="flex items-center justify-between">
                                <Label>Light Color</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={lightSpec.color}
                                        onChange={e => setLightSpec({ ...lightSpec, color: e.target.value })}
                                        className="w-8 h-8 rounded border-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Intensity (Power)</Label>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={lightSpec.intensity}
                                    onChange={e => setLightSpec({ ...lightSpec, intensity: parseFloat(e.target.value) })}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Depth (Distance)</Label>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={lightSpec.depth}
                                    onChange={e => setLightSpec({ ...lightSpec, depth: parseFloat(e.target.value) })}
                                    className="w-full"
                                />
                            </div>

                            <div className="border-t border-border pt-4 mt-4">
                                <Label className="text-xs text-muted-foreground mb-3 block">Rotation Controls</Label>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <Label className="text-xs">Pitch (X-Axis)</Label>
                                            <span className="text-xs text-muted-foreground">{Math.round(lightSpec.rotationX * 90)}°</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-1" max="1" step="0.01"
                                            value={lightSpec.rotationX}
                                            onChange={e => setLightSpec({ ...lightSpec, rotationX: parseFloat(e.target.value) })}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <Label className="text-xs">Yaw (Y-Axis)</Label>
                                            <span className="text-xs text-muted-foreground">{Math.round(lightSpec.rotationY * 360)}°</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.01"
                                            value={lightSpec.rotationY}
                                            onChange={e => setLightSpec({ ...lightSpec, rotationY: parseFloat(e.target.value) })}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <Label className="text-xs">Roll (Z-Axis)</Label>
                                            <span className="text-xs text-muted-foreground">{Math.round(lightSpec.rotationZ * 90)}°</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-1" max="1" step="0.01"
                                            value={lightSpec.rotationZ}
                                            onChange={e => setLightSpec({ ...lightSpec, rotationZ: parseFloat(e.target.value) })}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {darkImageUrl && !isProcessingDark && (
                        <Button onClick={handleDone} disabled={isProcessingFinal} className="w-full">
                            {isProcessingFinal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                            Export & Blend
                        </Button>
                    )}
                </div>

                {/* Hidden canvases for computation */}
                <canvas ref={originalCanvasRef} style={{ display: 'none' }} />
                <canvas ref={darkCanvasRef} style={{ display: 'none' }} />

            </Card>

            <Card className="p-6 bg-ai-surface border-border shadow-card flex flex-col">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Interactive View
                </h3>

                <div className="flex-1 relative min-h-[400px] border rounded-lg overflow-hidden bg-black/50 select-none">
                    {darkImageUrl ? (
                        <>
                            {/* The Composited Preview (Background) */}
                            <canvas
                                ref={previewCanvasRef}
                                className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
                            />

                            {/* The 3D Light Control Layer (Foreground Interaction) */}
                            <RelightControl
                                lightSpec={lightSpec}
                                onChange={(updates) => setLightSpec(prev => ({ ...prev, ...updates }))}
                                isSelected={isSelected}
                            />
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            Upload an image to start relighting
                        </div>
                    )}
                </div>

                {finalImageUrl && (
                    <div className="mt-4">
                        <Label>Final Result</Label>
                        <img src={finalImageUrl} className="w-full rounded-lg mt-2 border" alt="Result" />
                    </div>
                )}
            </Card>
        </div>
    );
};
