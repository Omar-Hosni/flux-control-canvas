import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, Lightbulb, Download, Sun, Palette, Zap, Layers, CircleDot, Blend, Move, MousePointer2, Image as ImageIcon, Box, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useNormalMapLighting } from '@/hooks/useNormalMapLighting';

// ============= UTILITY =============

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

// ============= IMAGE UPLOADER COMPONENT =============

interface ImageUploaderProps {
    label: string;
    description: string;
    image: string | null;
    onImageSelect: (url: string | null) => void;
    icon: 'image' | 'normal' | 'depth';
}

const ImageUploader = ({ label, description, image, onImageSelect, icon }: ImageUploaderProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            onImageSelect(url);
        }
    };

    const IconComponent = icon === 'normal' ? Box : icon === 'depth' ? Layers : ImageIcon;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <IconComponent className="w-3.5 h-3.5" />
                    {label}
                </label>
                {image && (
                    <button
                        onClick={() => onImageSelect(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear
                    </button>
                )}
            </div>
            {image ? (
                <div className="relative group">
                    <img
                        src={image}
                        alt={label}
                        className="w-full h-20 object-cover rounded-lg border border-border"
                    />
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-xs"
                    >
                        Replace
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    className="w-full h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
                >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{description}</span>
                </button>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
};

// ============= LIGHT CONTROLS COMPONENT =============

interface LightControlsProps {
    lightColor: string;
    lightIntensity: number;
    lightHeight: number;
    lightDepth: number;
    lightOpacity: number;
    ambientIntensity: number;
    onColorChange: (color: string) => void;
    onIntensityChange: (intensity: number) => void;
    onHeightChange: (height: number) => void;
    onDepthChange: (depth: number) => void;
    onOpacityChange: (opacity: number) => void;
    onAmbientChange: (ambient: number) => void;
}

const LightControls = ({
    lightColor,
    lightIntensity,
    lightHeight,
    lightDepth,
    lightOpacity,
    ambientIntensity,
    onColorChange,
    onIntensityChange,
    onHeightChange,
    onDepthChange,
    onOpacityChange,
    onAmbientChange
}: LightControlsProps) => {
    return (
        <div className="space-y-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sun className="w-4 h-4 text-primary" />
                Light Settings
            </h3>

            {/* Light Color */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5" />
                        Light Color
                    </label>
                    <span className="text-xs font-mono text-muted-foreground uppercase">{lightColor}</span>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={lightColor}
                        onChange={(e) => onColorChange(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                    />
                    <div className="flex-1 grid grid-cols-6 gap-1">
                        {['#ffffff', '#ffeb3b', '#ff9800', '#f44336', '#9c27b0', '#2196f3'].map((color) => (
                            <button
                                key={color}
                                onClick={() => onColorChange(color)}
                                className={`aspect-square rounded-md transition-all hover:scale-110 ${lightColor === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                                    }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Light Intensity */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" />
                        Light Intensity
                    </label>
                    <span className="text-xs font-mono text-primary">{(lightIntensity * 100).toFixed(0)}%</span>
                </div>
                <Slider
                    value={[lightIntensity]}
                    onValueChange={([v]) => onIntensityChange(v)}
                    min={0}
                    max={2}
                    step={0.01}
                    className="w-full"
                />
            </div>

            {/* Light Height (Z) */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" />
                        Light Height
                    </label>
                    <span className="text-xs font-mono text-primary">{lightHeight.toFixed(2)}</span>
                </div>
                <Slider
                    value={[lightHeight]}
                    onValueChange={([v]) => onHeightChange(v)}
                    min={0.1}
                    max={2}
                    step={0.01}
                    className="w-full"
                />
            </div>

            {/* Light Depth */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <CircleDot className="w-3.5 h-3.5" />
                        Light Depth
                    </label>
                    <span className="text-xs font-mono text-primary">{lightDepth.toFixed(2)}</span>
                </div>
                <Slider
                    value={[lightDepth]}
                    onValueChange={([v]) => onDepthChange(v)}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                />
            </div>

            {/* Light Opacity */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <Blend className="w-3.5 h-3.5" />
                        Light Opacity
                    </label>
                    <span className="text-xs font-mono text-primary">{(lightOpacity * 100).toFixed(0)}%</span>
                </div>
                <Slider
                    value={[lightOpacity]}
                    onValueChange={([v]) => onOpacityChange(v)}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                />
            </div>

            {/* Ambient Light */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <Sun className="w-3.5 h-3.5 opacity-50" />
                        Ambient Light
                    </label>
                    <span className="text-xs font-mono text-primary">{(ambientIntensity * 100).toFixed(0)}%</span>
                </div>
                <Slider
                    value={[ambientIntensity]}
                    onValueChange={([v]) => onAmbientChange(v)}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                />
            </div>
        </div>
    );
};

// ============= MAIN COMPONENT =============

export const AddLight: React.FC = () => {
    // Image URLs
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [normalMap, setNormalMap] = useState<string | null>(null);
    const [depthMap, setDepthMap] = useState<string | null>(null);

    // Loaded image elements
    const [loadedOriginal, setLoadedOriginal] = useState<HTMLImageElement | null>(null);
    const [loadedNormal, setLoadedNormal] = useState<HTMLImageElement | null>(null);
    const [loadedDepth, setLoadedDepth] = useState<HTMLImageElement | null>(null);

    // Light settings
    const [lightX, setLightX] = useState(0.5);
    const [lightY, setLightY] = useState(0.3);
    const [lightColor, setLightColor] = useState('#ffffff');
    const [lightIntensity, setLightIntensity] = useState(1.0);
    const [lightHeight, setLightHeight] = useState(0.75);
    const [lightDepth, setLightDepth] = useState(0.5);
    const [lightOpacity, setLightOpacity] = useState(1.0);
    const [ambientIntensity, setAmbientIntensity] = useState(0.2);

    const [isDragging, setIsDragging] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { applyLighting } = useNormalMapLighting();

    // Load images when URLs change
    useEffect(() => {
        if (originalImage) {
            const img = new Image();
            img.onload = () => setLoadedOriginal(img);
            img.src = originalImage;
        } else {
            setLoadedOriginal(null);
        }
    }, [originalImage]);

    useEffect(() => {
        if (normalMap) {
            const img = new Image();
            img.onload = () => setLoadedNormal(img);
            img.src = normalMap;
        } else {
            setLoadedNormal(null);
        }
    }, [normalMap]);

    useEffect(() => {
        if (depthMap) {
            const img = new Image();
            img.onload = () => setLoadedDepth(img);
            img.src = depthMap;
        } else {
            setLoadedDepth(null);
        }
    }, [depthMap]);

    // Apply lighting when settings change
    useEffect(() => {
        if (!loadedOriginal || !loadedNormal || !canvasRef.current) return;

        setCanvasSize({ width: loadedOriginal.width, height: loadedOriginal.height });

        applyLighting(
            loadedOriginal,
            loadedNormal,
            loadedDepth,
            {
                x: lightX * loadedOriginal.width,
                y: lightY * loadedOriginal.height,
                z: lightHeight,
                depth: lightDepth,
                color: hexToRgb(lightColor),
                intensity: lightIntensity,
                opacity: lightOpacity,
                ambientIntensity
            },
            canvasRef.current
        );
    }, [loadedOriginal, loadedNormal, loadedDepth, lightX, lightY, lightHeight, lightDepth, lightColor, lightIntensity, lightOpacity, ambientIntensity, applyLighting]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        setLightX(x);
        setLightY(y);
    }, [isDragging]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            setLightX(x);
            setLightY(y);
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleExport = useCallback(() => {
        if (!canvasRef.current) return;

        const link = document.createElement('a');
        link.download = 'lit-image.png';
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
        toast.success('Image exported successfully!');
    }, []);

    const handleReset = useCallback(() => {
        setLightX(0.5);
        setLightY(0.3);
        setLightHeight(0.75);
        setLightDepth(0.5);
        setLightColor('#ffffff');
        setLightIntensity(1.0);
        setLightOpacity(1.0);
        setAmbientIntensity(0.2);
        toast.success('Settings reset to defaults');
    }, []);

    const hasImages = originalImage && normalMap;

    return (
        <div className="h-full flex">
            {/* Sidebar */}
            <aside className="w-80 border-r border-border bg-card flex flex-col">
                {/* Logo */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-foreground">Add Light</h1>
                            <p className="text-xs text-muted-foreground">Dynamic lighting editor</p>
                        </div>
                    </div>
                </div>

                {/* Image Uploaders */}
                <div className="p-4 space-y-4 border-b border-border">
                    <ImageUploader
                        label="Original Image"
                        description="Drag & drop or click to upload"
                        image={originalImage}
                        onImageSelect={setOriginalImage}
                        icon="image"
                    />
                    <ImageUploader
                        label="Normal Map"
                        description="RGB encoded surface normals"
                        image={normalMap}
                        onImageSelect={setNormalMap}
                        icon="normal"
                    />
                    <ImageUploader
                        label="Depth Map (Optional)"
                        description="Grayscale depth (white = near)"
                        image={depthMap}
                        onImageSelect={setDepthMap}
                        icon="depth"
                    />
                </div>

                {/* Light Controls */}
                <div className="flex-1 p-4 overflow-y-auto">
                    <LightControls
                        lightColor={lightColor}
                        lightIntensity={lightIntensity}
                        lightHeight={lightHeight}
                        lightDepth={lightDepth}
                        lightOpacity={lightOpacity}
                        ambientIntensity={ambientIntensity}
                        onColorChange={setLightColor}
                        onIntensityChange={setLightIntensity}
                        onHeightChange={setLightHeight}
                        onDepthChange={setLightDepth}
                        onOpacityChange={setLightOpacity}
                        onAmbientChange={setAmbientIntensity}
                    />
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-border space-y-2">
                    <Button
                        onClick={handleExport}
                        disabled={!hasImages}
                        className="w-full"
                        size="lg"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Image
                    </Button>
                    <Button
                        onClick={handleReset}
                        variant="outline"
                        className="w-full"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset Settings
                    </Button>
                </div>
            </aside>

            {/* Main Canvas Area */}
            <main className="flex-1 flex flex-col bg-background">
                {/* Canvas Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MousePointer2 className="w-3.5 h-3.5" />
                        <span>Click and drag to position light source</span>
                    </div>
                    {hasImages && (
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                            <span>Light: {(lightX * 100).toFixed(0)}%, {(lightY * 100).toFixed(0)}%</span>
                        </div>
                    )}
                </div>

                {/* Canvas Area */}
                <div
                    ref={containerRef}
                    className="flex-1 flex items-center justify-center p-8 overflow-auto relative bg-black/20"
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {hasImages ? (
                        <div className="relative inline-block shadow-2xl rounded-lg overflow-hidden">
                            <canvas
                                ref={canvasRef}
                                width={canvasSize.width}
                                height={canvasSize.height}
                                className="max-w-full h-auto block"
                                style={{ maxHeight: 'calc(100vh - 200px)' }}
                            />
                            {/* Light indicator */}
                            <div
                                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{
                                    left: `${lightX * 100}%`,
                                    top: `${lightY * 100}%`
                                }}
                            >
                                <div
                                    className="absolute inset-0 rounded-full animate-ping opacity-40"
                                    style={{ backgroundColor: lightColor }}
                                />
                                <div
                                    className="absolute inset-2 rounded-full border-2 border-white shadow-lg"
                                    style={{ backgroundColor: lightColor, boxShadow: `0 0 20px ${lightColor}` }}
                                />
                                <Move className="absolute inset-0 m-auto w-3 h-3 text-white drop-shadow-lg" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-secondary/50 flex items-center justify-center">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <Move className="w-6 h-6 text-primary/50" />
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">Upload Images to Begin</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                Add an original image and its corresponding normal map to see the lighting effect in action.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
