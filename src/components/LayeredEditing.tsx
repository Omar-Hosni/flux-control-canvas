import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
    Upload, Layers, Eye, EyeOff, GripVertical, Loader2, Wand2,
    ChevronUp, ChevronDown, Trash2, Check, Sparkles, Blend,
    MousePointer2, Brush, Eraser, User, Package, Palette, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { RunwareService } from '@/services/RunwareService';
import { WavespeedService } from '@/services/wavespeedService';

interface LayeredEditingProps {
    runwareService: RunwareService;
}

interface Layer {
    id: string;
    url: string;
    originalUrl: string;
    visible: boolean;
    name: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    scale: number;
}

interface EditingTemplate {
    id: string;
    name: string;
    description: string;
    prompt: string;
    icon: React.ReactNode;
    service: 'qwen' | 'runware';
}

const EDITING_TEMPLATES: EditingTemplate[] = [
    {
        id: 'skin-enhancement',
        name: 'Skin Enhancement',
        description: 'Enhance skin texture',
        prompt: 'improve skin details and texture, enhance skin texture, smooth complexion, natural beauty, keep the background white',
        icon: <User className="w-4 h-4" />,
        service: 'qwen'
    },
    {
        id: 'style-transfer',
        name: 'Style Transfer',
        description: 'Apply artistic styles',
        prompt: 'change the style of the image, keep the background white',
        icon: <Palette className="w-4 h-4" />,
        service: 'qwen'
    },
    {
        id: 'enhance-details',
        name: 'Enhance Details',
        description: 'Upscale and enhance',
        prompt: 'add details to the scene, enhance existing details, keep the background white',
        icon: <Wand2 className="w-4 h-4" />,
        service: 'qwen'
    },
    {
        id: 'remove-background',
        name: 'Remove BG',
        description: 'Remove background',
        prompt: 'background removal',
        icon: <Eraser className="w-4 h-4" />,
        service: 'runware'
    }
];

export const LayeredEditing: React.FC<LayeredEditingProps> = ({ runwareService }) => {
    // Upload state
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [originalDimensions, setOriginalDimensions] = useState({ width: 1024, height: 1024 });

    // Layer extraction state
    const [extractPrompt, setExtractPrompt] = useState('extract the foreground objects');
    const [numLayers, setNumLayers] = useState(4);
    const [isExtracting, setIsExtracting] = useState(false);

    // Layers state
    const [layers, setLayers] = useState<Layer[]>([]);
    const [selectedLayerIndex, setSelectedLayerIndex] = useState<number | null>(null);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editPrompt, setEditPrompt] = useState('');
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);

    // Merged preview state
    const [showMergedPreview, setShowMergedPreview] = useState(false);
    const [mergedImageUrl, setMergedImageUrl] = useState<string | null>(null);
    const [isBlending, setIsBlending] = useState(false);

    // Dragging and resizing state for merged preview
    const [draggingLayerIndex, setDraggingLayerIndex] = useState<number | null>(null);
    const [resizingLayerIndex, setResizingLayerIndex] = useState<number | null>(null);
    const dragStartPos = useRef({ x: 0, y: 0, layerX: 0, layerY: 0 });
    const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

    // Canvas refs
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mergedPreviewRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setUploadedFile(file);

        // Get original dimensions
        const img = new Image();
        img.onload = () => {
            setOriginalDimensions({ width: img.width, height: img.height });
            setUploadedImage(url);
        };
        img.src = url;

        // Reset layers
        setLayers([]);
        setSelectedLayerIndex(null);
        setShowMergedPreview(false);
        setMergedImageUrl(null);

        toast.success('Image uploaded!');
    };

    // Extract layers
    const handleExtractLayers = async () => {
        if (!uploadedFile) {
            toast.error('Please upload an image first');
            return;
        }

        setIsExtracting(true);
        try {
            // Upload image to get URL
            const uploadedUrl = await runwareService.uploadImageForURL(uploadedFile);

            // Call layer extraction API
            const layerUrls = await WavespeedService.generateQwenLayeredImg2Img({
                image: uploadedUrl,
                prompt: extractPrompt,
                num_layers: numLayers
            });

            // Create layer objects with loaded dimensions
            const newLayers: Layer[] = await Promise.all(
                layerUrls.map(async (url, index) => {
                    // Load image to get dimensions
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    await new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                        img.src = url;
                    });

                    return {
                        id: `layer-${Date.now()}-${index}`,
                        url,
                        originalUrl: url,
                        visible: true,
                        name: `Layer ${index + 1}`,
                        position: { x: 0, y: 0 },
                        size: { width: img.width || originalDimensions.width, height: img.height || originalDimensions.height },
                        scale: 1
                    };
                })
            );

            setLayers(newLayers);
            toast.success(`Extracted ${newLayers.length} layers!`);
        } catch (error) {
            console.error('Layer extraction failed:', error);
            toast.error('Failed to extract layers');
        } finally {
            setIsExtracting(false);
        }
    };

    // Move layer in z-order
    const moveLayer = (index: number, direction: 'up' | 'down') => {
        const newLayers = [...layers];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= layers.length) return;

        [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];
        setLayers(newLayers);

        // Update selection if needed
        if (selectedLayerIndex === index) {
            setSelectedLayerIndex(targetIndex);
        } else if (selectedLayerIndex === targetIndex) {
            setSelectedLayerIndex(index);
        }
    };

    // Toggle layer visibility
    const toggleLayerVisibility = (index: number) => {
        const newLayers = [...layers];
        newLayers[index].visible = !newLayers[index].visible;
        setLayers(newLayers);
    };

    // Delete layer
    const deleteLayer = (index: number) => {
        const newLayers = layers.filter((_, i) => i !== index);
        setLayers(newLayers);
        if (selectedLayerIndex === index) {
            setSelectedLayerIndex(null);
        } else if (selectedLayerIndex !== null && selectedLayerIndex > index) {
            setSelectedLayerIndex(selectedLayerIndex - 1);
        }
    };

    // Apply editing template to selected layer
    const handleApplyTemplate = async (template: EditingTemplate) => {
        if (selectedLayerIndex === null) {
            toast.error('Please select a layer to edit');
            return;
        }

        setIsProcessingEdit(true);
        try {
            const layer = layers[selectedLayerIndex];
            let resultUrl: string;

            if (template.service === 'qwen') {
                // Use Qwen Edit 2511 then remove background
                const editedUrl = await WavespeedService.generateQwenEdit2511Img2Img({
                    images: [layer.url],
                    prompt: template.prompt
                });
                // Remove background
                const bgRemovedResult = await runwareService.removeBackground({
                    inputImage: editedUrl,
                    outputFormat: 'PNG'
                });
                resultUrl = bgRemovedResult.imageURL;
            } else if (template.service === 'runware') {
                if (template.id === 'remove-background') {
                    const result = await runwareService.removeBackground({
                        inputImage: layer.url,
                        outputFormat: 'PNG'
                    });
                    resultUrl = result.imageURL;
                } else {
                    throw new Error('Unsupported template');
                }
            } else {
                throw new Error('Unsupported service');
            }

            // Update layer
            const newLayers = [...layers];
            newLayers[selectedLayerIndex].url = resultUrl;
            setLayers(newLayers);

            toast.success(`${template.name} applied!`);
        } catch (error) {
            console.error('Template application failed:', error);
            toast.error('Failed to apply template');
        } finally {
            setIsProcessingEdit(false);
        }
    };

    // Apply custom edit using Qwen Edit 2511, then remove background
    const handleCustomEdit = async () => {
        if (selectedLayerIndex === null || !editPrompt.trim()) {
            toast.error('Please select a layer and enter a prompt');
            return;
        }

        setIsProcessingEdit(true);
        try {
            const layer = layers[selectedLayerIndex];

            // Step 1: Edit layer with Qwen Edit 2511
            toast.info('Editing layer...');
            const editedUrl = await WavespeedService.generateQwenEdit2511Img2Img({
                images: [layer.url],
                prompt: editPrompt + ', keep the background white'
            });

            // Step 2: Remove background via Runware
            toast.info('Removing background...');
            const bgRemovedResult = await runwareService.removeBackground({
                inputImage: editedUrl,
                outputFormat: 'PNG'
            });

            const finalUrl = bgRemovedResult.imageURL;

            const newLayers = [...layers];
            newLayers[selectedLayerIndex].url = finalUrl;
            setLayers(newLayers);

            toast.success('Custom edit applied with background removed!');
        } catch (error) {
            console.error('Custom edit failed:', error);
            toast.error('Failed to apply edit');
        } finally {
            setIsProcessingEdit(false);
        }
    };

    // Extract more layers from selected layer
    const handleExtractMoreLayers = async () => {
        if (selectedLayerIndex === null) {
            toast.error('Please select a layer first');
            return;
        }

        setIsExtracting(true);
        try {
            const layer = layers[selectedLayerIndex];

            toast.info('Extracting sub-layers...');
            const layerUrls = await WavespeedService.generateQwenLayeredImg2Img({
                image: layer.url,
                prompt: extractPrompt,
                num_layers: numLayers
            });

            // Create new layer objects with loaded dimensions
            const newSubLayers: Layer[] = await Promise.all(
                layerUrls.map(async (url, index) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    await new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                        img.src = url;
                    });

                    return {
                        id: `layer-${Date.now()}-sub-${index}`,
                        url,
                        originalUrl: url,
                        visible: true,
                        name: `${layer.name} - Sub ${index + 1}`,
                        position: { x: 0, y: 0 },
                        size: { width: img.width || originalDimensions.width, height: img.height || originalDimensions.height },
                        scale: 1
                    };
                })
            );

            // Append new layers to existing layers
            setLayers([...layers, ...newSubLayers]);
            toast.success(`Extracted ${newSubLayers.length} sub-layers!`);
        } catch (error) {
            console.error('Extract more layers failed:', error);
            toast.error('Failed to extract more layers');
        } finally {
            setIsExtracting(false);
        }
    };

    // Render merged preview to canvas (for download/blend)
    const renderMergedPreview = useCallback(async () => {
        if (layers.length === 0 || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const visibleLayers = layers.filter(l => l.visible);
        if (visibleLayers.length === 0) return;

        // Step 1: Create a temporary canvas at original dimensions to composite all layers
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalDimensions.width;
        tempCanvas.height = originalDimensions.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Draw layers from bottom to top at full original dimensions
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (!layer.visible) continue;

            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = reject;
                    img.src = layer.url;
                });

                // Draw each layer at full original dimensions (layers should overlap/compose)
                tempCtx.drawImage(img, 0, 0, originalDimensions.width, originalDimensions.height);
            } catch (error) {
                console.error(`Failed to load layer ${i}:`, error);
            }
        }

        // Step 2: Scan pixel data to find actual content bounds (non-transparent and non-white)
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        let minX = tempCanvas.width, minY = tempCanvas.height, maxX = 0, maxY = 0;
        const threshold = 250; // Pixels with RGB all > threshold are "white/empty"

        for (let y = 0; y < tempCanvas.height; y++) {
            for (let x = 0; x < tempCanvas.width; x++) {
                const idx = (y * tempCanvas.width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                // Check if pixel has actual content (not transparent and not close to white)
                const isWhite = r > threshold && g > threshold && b > threshold;
                if (a > 10 && !isWhite) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        // If no content found, use full image
        if (minX > maxX || minY > maxY) {
            minX = 0;
            minY = 0;
            maxX = tempCanvas.width - 1;
            maxY = tempCanvas.height - 1;
        }

        // Add small padding
        const padding = 5;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(tempCanvas.width - 1, maxX + padding);
        maxY = Math.min(tempCanvas.height - 1, maxY + padding);

        // Step 3: Create final canvas with cropped content
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        ctx.drawImage(tempCanvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        console.log(`Cropped merged image: ${cropWidth}x${cropHeight} from original ${tempCanvas.width}x${tempCanvas.height}`);
    }, [layers, originalDimensions]);

    useEffect(() => {
        if (showMergedPreview) {
            renderMergedPreview();
        }
    }, [showMergedPreview, layers, renderMergedPreview]);

    // Handle done editing - merge layers
    const handleDoneEditing = async () => {
        if (layers.length === 0) {
            toast.error('No layers to merge');
            return;
        }

        await renderMergedPreview();
        setShowMergedPreview(true);

        // Get merged image URL
        if (previewCanvasRef.current) {
            const url = previewCanvasRef.current.toDataURL('image/png');
            setMergedImageUrl(url);
        }

        toast.success('Layers merged! You can now drag layers to reposition.');
    };

    // Handle blend again
    const handleBlendAgain = async () => {
        // First render all layers to canvas to get the merged image
        await renderMergedPreview();

        if (!previewCanvasRef.current) {
            toast.error('No merged image to blend');
            return;
        }

        setIsBlending(true);
        try {
            // Get merged image from canvas
            const mergedDataUrl = previewCanvasRef.current.toDataURL('image/png');

            // Convert data URL to File
            const response = await fetch(mergedDataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'merged.png', { type: 'image/png' });

            // Upload
            const uploadedUrl = await runwareService.uploadImageForURL(file);

            // Blend using Qwen Edit 2511
            toast.info('Blending lighting and shadows...');
            const blendedUrl = await WavespeedService.generateQwenEdit2511Img2Img({
                images: [uploadedUrl],
                prompt: 'blend the lighting and shadows of objects to the background'
            });

            setMergedImageUrl(blendedUrl);
            toast.success('Image blended successfully!');
        } catch (error) {
            console.error('Blend failed:', error);
            toast.error('Failed to blend image');
        } finally {
            setIsBlending(false);
        }
    };

    // Global mouse handlers for smooth dragging and resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (draggingLayerIndex !== null) {
                const dx = e.clientX - dragStartPos.current.x;
                const dy = e.clientY - dragStartPos.current.y;

                setLayers(prev => {
                    const newLayers = [...prev];
                    newLayers[draggingLayerIndex].position = {
                        x: dragStartPos.current.layerX + dx,
                        y: dragStartPos.current.layerY + dy
                    };
                    return newLayers;
                });
            }

            if (resizingLayerIndex !== null) {
                const dx = e.clientX - resizeStartPos.current.x;
                const dy = e.clientY - resizeStartPos.current.y;

                setLayers(prev => {
                    const newLayers = [...prev];
                    const layer = newLayers[resizingLayerIndex];
                    // Maintain aspect ratio
                    const aspectRatio = layer.size.width / layer.size.height;
                    const newWidth = Math.max(50, resizeStartPos.current.width + dx);
                    const newHeight = newWidth / aspectRatio;

                    newLayers[resizingLayerIndex].size = {
                        width: newWidth,
                        height: newHeight
                    };
                    return newLayers;
                });
            }
        };

        const handleMouseUp = () => {
            setDraggingLayerIndex(null);
            setResizingLayerIndex(null);
        };

        if (draggingLayerIndex !== null || resizingLayerIndex !== null) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingLayerIndex, resizingLayerIndex]);

    // Start dragging a layer
    const handleLayerDragStart = (e: React.MouseEvent, layerIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        const layer = layers[layerIndex];
        setDraggingLayerIndex(layerIndex);
        setSelectedLayerIndex(layerIndex);
        dragStartPos.current = {
            x: e.clientX,
            y: e.clientY,
            layerX: layer.position.x,
            layerY: layer.position.y
        };
    };

    // Start resizing a layer
    const handleLayerResizeStart = (e: React.MouseEvent, layerIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        const layer = layers[layerIndex];
        setResizingLayerIndex(layerIndex);
        setSelectedLayerIndex(layerIndex);
        resizeStartPos.current = {
            x: e.clientX,
            y: e.clientY,
            width: layer.size.width,
            height: layer.size.height
        };
    };

    // Download merged image
    const handleDownload = () => {
        if (!mergedImageUrl) return;

        const link = document.createElement('a');
        link.download = 'merged-layers.png';
        link.href = mergedImageUrl;
        link.click();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] overflow-hidden bg-background">
            <div className="flex-1 flex min-h-0 overflow-hidden gap-4 p-4">
                {/* Left Panel - Upload and Layer Gallery */}
                <div className="w-80 flex flex-col gap-4 overflow-y-auto">
                    {/* Upload Card */}
                    <Card className="p-4 bg-ai-surface border-border shadow-card">
                        <div className="flex items-center gap-2 mb-4">
                            <Layers className="w-5 h-5" />
                            <h3 className="font-semibold">Layered Editing</h3>
                        </div>

                        {!uploadedImage ? (
                            <Button
                                variant="outline"
                                className="w-full h-32 border-dashed"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-6 h-6 mr-2" />
                                Upload Image
                            </Button>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative aspect-video rounded overflow-hidden bg-black/20">
                                    <img
                                        src={uploadedImage}
                                        alt="Uploaded"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Change Image
                                </Button>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </Card>

                    {/* Layer Extraction Settings */}
                    {uploadedImage && (
                        <Card className="p-4 bg-ai-surface border-border shadow-card">
                            <h4 className="font-medium mb-3">Extract Layers</h4>

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs">Extraction Prompt</Label>
                                    <Textarea
                                        value={extractPrompt}
                                        onChange={(e) => setExtractPrompt(e.target.value)}
                                        placeholder="Describe what to extract..."
                                        className="h-20 resize-none text-sm"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs">Number of Layers: {numLayers}</Label>
                                    <Slider
                                        value={[numLayers]}
                                        onValueChange={(v) => setNumLayers(v[0])}
                                        min={2}
                                        max={8}
                                        step={1}
                                        className="mt-2"
                                    />
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleExtractLayers}
                                    disabled={isExtracting}
                                >
                                    {isExtracting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Extracting...
                                        </>
                                    ) : (
                                        <>
                                            <Layers className="w-4 h-4 mr-2" />
                                            Extract Layers
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Layer Panel (Photoshop-style) */}
                    {layers.length > 0 && (
                        <Card className="p-4 bg-ai-surface border-border shadow-card flex-1 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Layers</h4>
                                <span className="text-xs text-muted-foreground">{layers.length} layers</span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1">
                                {/* Layers displayed in reverse order (top layer first) */}
                                {[...layers].reverse().map((layer, reversedIndex) => {
                                    const actualIndex = layers.length - 1 - reversedIndex;
                                    return (
                                        <div
                                            key={layer.id}
                                            className={`
                                                flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                                                ${selectedLayerIndex === actualIndex
                                                    ? 'bg-primary/20 border border-primary'
                                                    : 'bg-ai-surface-elevated hover:bg-ai-surface-elevated/80'
                                                }
                                            `}
                                            onClick={() => setSelectedLayerIndex(actualIndex)}
                                        >
                                            {/* Layer thumbnail */}
                                            <div className="w-10 h-10 rounded overflow-hidden bg-black/20 flex-shrink-0">
                                                <img
                                                    src={layer.url}
                                                    alt={layer.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>

                                            {/* Layer info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{layer.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {layer.visible ? 'Visible' : 'Hidden'}
                                                </p>
                                            </div>

                                            {/* Layer controls */}
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleLayerVisibility(actualIndex);
                                                    }}
                                                >
                                                    {layer.visible ? (
                                                        <Eye className="w-3 h-3" />
                                                    ) : (
                                                        <EyeOff className="w-3 h-3" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveLayer(actualIndex, 'up');
                                                    }}
                                                    disabled={actualIndex === 0}
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveLayer(actualIndex, 'down');
                                                    }}
                                                    disabled={actualIndex === layers.length - 1}
                                                >
                                                    <ChevronUp className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Download layer
                                                        const link = document.createElement('a');
                                                        link.download = `${layer.name}.png`;
                                                        link.href = layer.url;
                                                        link.target = '_blank';
                                                        link.click();
                                                    }}
                                                    title="Download layer"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteLayer(actualIndex);
                                                    }}
                                                    title="Delete layer"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Center - Preview Canvas */}
                <div className="flex-1 flex flex-col gap-4 min-w-0" ref={containerRef}>
                    <Card className="flex-1 p-4 bg-ai-surface border-border shadow-card overflow-hidden flex items-center justify-center">
                        {showMergedPreview ? (
                            <div
                                ref={mergedPreviewRef}
                                className="relative w-full h-full overflow-hidden bg-black/10 rounded-lg"
                                style={{
                                    aspectRatio: `${originalDimensions.width}/${originalDimensions.height}`
                                }}
                                onClick={() => setSelectedLayerIndex(null)}
                            >
                                {/* Blended image if available (after blend again) */}
                                {mergedImageUrl && !mergedImageUrl.startsWith('data:') && (
                                    <img
                                        src={mergedImageUrl}
                                        alt="Blended result"
                                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                    />
                                )}

                                {/* Layer overlays - only show if not blended yet */}
                                {(!mergedImageUrl || mergedImageUrl.startsWith('data:')) && layers.map((layer, index) => {
                                    if (!layer.visible) return null;
                                    const isSelected = selectedLayerIndex === index;
                                    const isDragging = draggingLayerIndex === index;
                                    const isResizing = resizingLayerIndex === index;

                                    return (
                                        <div
                                            key={layer.id}
                                            className={`
                                                absolute cursor-move
                                                ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                                                ${isDragging || isResizing ? 'z-50' : ''}
                                            `}
                                            style={{
                                                left: layer.position.x,
                                                top: layer.position.y,
                                                width: layer.size.width,
                                                height: layer.size.height,
                                                zIndex: index + 1
                                            }}
                                            onMouseDown={(e) => handleLayerDragStart(e, index)}
                                        >
                                            <img
                                                src={layer.url}
                                                alt={layer.name}
                                                className="w-full h-full object-contain pointer-events-none"
                                                draggable={false}
                                            />

                                            {/* Selection border and resize handle */}
                                            {isSelected && (
                                                <>
                                                    {/* Resize handle - bottom right */}
                                                    <div
                                                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-400 z-10"
                                                        onMouseDown={(e) => handleLayerResizeStart(e, index)}
                                                    />
                                                    {/* Layer label */}
                                                    <div className="absolute -top-6 left-0 text-xs text-blue-400 bg-blue-900/90 px-2 py-0.5 rounded whitespace-nowrap">
                                                        {layer.name}
                                                    </div>
                                                    {/* Size indicator */}
                                                    <div className="absolute -bottom-6 left-0 text-xs text-blue-300 bg-blue-900/90 px-2 py-0.5 rounded">
                                                        {Math.round(layer.size.width)}×{Math.round(layer.size.height)}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Overlay controls */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                                    <Button
                                        onClick={handleBlendAgain}
                                        disabled={isBlending}
                                        className="gap-2"
                                    >
                                        {isBlending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Blend className="w-4 h-4" />
                                        )}
                                        Blend Again
                                    </Button>
                                    <Button variant="outline" onClick={handleDownload}>
                                        Download
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowMergedPreview(false);
                                            setMergedImageUrl(null);
                                        }}
                                    >
                                        Back to Editing
                                    </Button>
                                </div>

                                {/* Hidden canvas for final render */}
                                <canvas ref={previewCanvasRef} className="hidden" />
                            </div>
                        ) : layers.length > 0 && selectedLayerIndex !== null ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <img
                                    src={layers[selectedLayerIndex].url}
                                    alt={layers[selectedLayerIndex].name}
                                    className="max-w-full max-h-full object-contain border border-border rounded"
                                />
                            </div>
                        ) : layers.length > 0 ? (
                            <div className="text-center text-muted-foreground">
                                <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Select a layer to view and edit</p>
                            </div>
                        ) : uploadedImage ? (
                            <div className="text-center text-muted-foreground">
                                <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Extract layers to get started</p>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Upload an image to start</p>
                            </div>
                        )}
                    </Card>

                    {/* Action Buttons */}
                    {layers.length > 0 && !showMergedPreview && (
                        <Card className="p-3 bg-ai-surface border-border shadow-card">
                            <div className="flex justify-center gap-3">
                                <Button
                                    size="lg"
                                    onClick={handleDoneEditing}
                                    className="gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Done Editing - Merge Layers
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right Panel - Editing Templates */}
                {layers.length > 0 && !showMergedPreview && (
                    <div className="w-72 flex flex-col gap-4 overflow-y-auto">
                        {/* Templates */}
                        <Card className="p-4 bg-ai-surface border-border shadow-card">
                            <h4 className="font-medium mb-3">
                                {selectedLayerIndex !== null
                                    ? `Edit: ${layers[selectedLayerIndex].name}`
                                    : 'Select a Layer to Edit'
                                }
                            </h4>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {EDITING_TEMPLATES.map((template) => (
                                    <Button
                                        key={template.id}
                                        variant="outline"
                                        className="flex flex-col h-auto py-3 gap-1"
                                        disabled={selectedLayerIndex === null || isProcessingEdit}
                                        onClick={() => handleApplyTemplate(template)}
                                    >
                                        {isProcessingEdit ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            template.icon
                                        )}
                                        <span className="text-xs">{template.name}</span>
                                    </Button>
                                ))}
                            </div>
                        </Card>

                        {/* Custom Edit */}
                        <Card className="p-4 bg-ai-surface border-border shadow-card">
                            <h4 className="font-medium mb-3">Custom Edit</h4>

                            <div className="space-y-3">
                                <Textarea
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    placeholder="Describe your edit..."
                                    className="h-20 resize-none text-sm"
                                    disabled={selectedLayerIndex === null}
                                />

                                <Button
                                    className="w-full"
                                    disabled={selectedLayerIndex === null || !editPrompt.trim() || isProcessingEdit}
                                    onClick={handleCustomEdit}
                                >
                                    {isProcessingEdit ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Applying...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Apply Edit
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>

                        {/* Extract More Layers - only show when layer is selected */}
                        {selectedLayerIndex !== null && (
                            <Card className="p-4 bg-ai-surface border-border shadow-card">
                                <h4 className="font-medium mb-3">Extract Sub-Layers</h4>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Extract more layers from "{layers[selectedLayerIndex]?.name}"
                                </p>
                                <div className="space-y-3">
                                    <Textarea
                                        value={extractPrompt}
                                        onChange={(e) => setExtractPrompt(e.target.value)}
                                        placeholder="Describe what to extract..."
                                        className="h-16 resize-none text-sm"
                                    />
                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        disabled={isExtracting}
                                        onClick={handleExtractMoreLayers}
                                    >
                                        {isExtracting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Extracting...
                                            </>
                                        ) : (
                                            <>
                                                <Layers className="w-4 h-4 mr-2" />
                                                Extract More Layers
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Layer Info */}
                        {selectedLayerIndex !== null && (
                            <Card className="p-4 bg-ai-surface border-border shadow-card">
                                <h4 className="font-medium mb-3">Layer Settings</h4>

                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs">Layer Name</Label>
                                        <Input
                                            value={layers[selectedLayerIndex].name}
                                            onChange={(e) => {
                                                const newLayers = [...layers];
                                                newLayers[selectedLayerIndex].name = e.target.value;
                                                setLayers(newLayers);
                                            }}
                                            className="h-8"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-xs">
                                            Scale: {(layers[selectedLayerIndex].scale * 100).toFixed(0)}%
                                        </Label>
                                        <Slider
                                            value={[layers[selectedLayerIndex].scale * 100]}
                                            onValueChange={(v) => {
                                                const newLayers = [...layers];
                                                newLayers[selectedLayerIndex].scale = v[0] / 100;
                                                setLayers(newLayers);
                                            }}
                                            min={10}
                                            max={200}
                                            step={5}
                                            className="mt-2"
                                        />
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                            const newLayers = [...layers];
                                            newLayers[selectedLayerIndex].url =
                                                newLayers[selectedLayerIndex].originalUrl;
                                            newLayers[selectedLayerIndex].scale = 1;
                                            newLayers[selectedLayerIndex].position = { x: 0, y: 0 };
                                            setLayers(newLayers);
                                            toast.success('Layer reset to original');
                                        }}
                                    >
                                        Reset Layer
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Hidden canvas for rendering */}
            <canvas ref={previewCanvasRef} className="hidden" />
        </div>
    );
};
