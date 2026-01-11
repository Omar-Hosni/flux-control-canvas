import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Upload, MousePointer2, Lasso, Scan, Brush, Eraser, Wand2,
    Sparkles, User, Package, Palette, Image as ImageIcon, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { RunwareService } from '@/services/RunwareService';
import { WavespeedService } from '@/services/wavespeedService';
import { useTimelineEditingStore } from '@/stores/timelineEditingStore';
import { TimelineBar } from '@/components/TimelineBar';

interface TimelineEditingProps {
    runwareService: RunwareService;
}

interface EditingTemplate {
    id: string;
    name: string;
    description: string;
    prompt: string;
    icon: React.ReactNode;
    service: 'seedream' | 'runware' | 'objectPlacement';
}

const EDITING_TEMPLATES: EditingTemplate[] = [
    {
        id: 'skin-enhancement',
        name: 'Skin Enhancement',
        description: 'Enhance skin texture and tone',
        prompt: 'improve skin details and texture, enhance skin texture, smooth complexion, natural beauty',
        icon: <User className="w-4 h-4" />,
        service: 'seedream'
    },
    {
        id: 'object-placement',
        name: 'Object Placement',
        description: 'Add and position objects',
        prompt: 'blend the placed object with the scene, object is comprehensively blended with light and shadows of the scene',
        icon: <Package className="w-4 h-4" />,
        service: 'objectPlacement'
    },
    {
        id: 'style-transfer',
        name: 'Style Transfer',
        description: 'Apply artistic styles',
        prompt: 'change the style of the image',
        icon: <Palette className="w-4 h-4" />,
        service: 'seedream'
    },
    {
        id: 'creative-edit',
        name: 'Creative Edit',
        description: 'AI-powered creative modifications',
        prompt: 'perform creative modifications, improve the scene details, make it more engaging, engaging vibe',
        icon: <Sparkles className="w-4 h-4" />,
        service: 'seedream'
    },
    {
        id: 'remove-background',
        name: 'Remove Background',
        description: 'Remove image background',
        prompt: 'background removal',
        icon: <Eraser className="w-4 h-4" />,
        service: 'runware'
    },
    {
        id: 'enhance-details',
        name: 'Enhance Details',
        description: 'Upscale and enhance clarity',
        prompt: 'add details to the scene, enhance existing details, upscale, enhance details',
        icon: <Wand2 className="w-4 h-4" />,
        service: 'seedream'
    }
];

export const TimelineEditing: React.FC<TimelineEditingProps> = ({ runwareService }) => {
    const {
        currentImage,
        currentImageFile,
        activeTool,
        brushSize,
        lassoPoints,
        maskDataUrl,
        isProcessing,
        editPrompt,
        selectionBorderColor,
        placedObject,
        setCurrentImage,
        setActiveTool,
        setBrushSize,
        setLassoPoints,
        addLassoPoint,
        setMaskDataUrl,
        setIsProcessing,
        setEditPrompt,
        setSelectionBorderColor,
        setPlacedObject,
        addEntry
    } = useTimelineEditingStore();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const objectFileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingObject, setIsDraggingObject] = useState(false);
    const [objectPosition, setObjectPosition] = useState({ x: 100, y: 100 });
    const [objectScale, setObjectScale] = useState(1);
    const [objectPreviewUrl, setObjectPreviewUrl] = useState<string | null>(null);
    const objectDragStart = useRef({ x: 0, y: 0 });
    const [objectSize, setObjectSize] = useState({ width: 150, height: 150 });
    const [isResizing, setIsResizing] = useState(false);
    const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
    const objectImageRef = useRef<HTMLImageElement | null>(null);

    // Object dragging handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingObject) {
                setObjectPosition({
                    x: e.clientX - objectDragStart.current.x,
                    y: e.clientY - objectDragStart.current.y
                });
            }
            if (isResizing) {
                const dx = e.clientX - resizeStart.current.x;
                const dy = e.clientY - resizeStart.current.y;
                const newWidth = Math.max(50, resizeStart.current.width + dx);
                const newHeight = Math.max(50, resizeStart.current.height + dy);
                setObjectSize({ width: newWidth, height: newHeight });
            }
        };

        const handleMouseUp = () => {
            setIsDraggingObject(false);
            setIsResizing(false);
        };

        if (isDraggingObject || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingObject, isResizing]);

    // Load image onto canvas
    useEffect(() => {
        if (!currentImage || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            imageRef.current = img;

            // Initialize mask canvas
            if (maskCanvasRef.current) {
                maskCanvasRef.current.width = img.width;
                maskCanvasRef.current.height = img.height;
            }
        };
        img.src = currentImage;
    }, [currentImage]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setCurrentImage(url, file);

        // Add as first entry
        addEntry({
            imageUrl: url,
            operation: 'Image Upload',
            prompt: file.name
        });

        toast.success('Image uploaded!');
    };

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: Math.floor((e.clientX - rect.left) * scaleX),
            y: Math.floor((e.clientY - rect.top) * scaleY)
        };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getCanvasCoordinates(e);

        if (activeTool === 'selection') {
            addLassoPoint(coords);
        } else if (activeTool === 'brush' || activeTool === 'eraser') {
            setIsDrawing(true);
            drawBrush(coords.x, coords.y, activeTool === 'eraser');
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const coords = getCanvasCoordinates(e);
        drawBrush(coords.x, coords.y, activeTool === 'eraser');
    };

    const handleCanvasMouseUp = () => {
        setIsDrawing(false);
    };

    const drawBrush = (x: number, y: number, isEraser: boolean) => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;

        const ctx = maskCanvas.getContext('2d');
        if (!ctx) return;

        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    };

    const drawLasso = () => {
        if (!canvasRef.current || lassoPoints.length < 2) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Redraw image
        if (imageRef.current) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageRef.current, 0, 0);
        }

        // Draw lasso path
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);

        for (let i = 1; i < lassoPoints.length; i++) {
            ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
        }

        if (lassoPoints.length > 2) {
            ctx.lineTo(lassoPoints[0].x, lassoPoints[0].y);
        }

        ctx.stroke();
    };

    useEffect(() => {
        if (activeTool === 'selection') {
            drawLasso();
        }
    }, [lassoPoints, activeTool]);

    const closeLasso = () => {
        if (lassoPoints.length < 3) {
            toast.error('Need at least 3 points to close lasso');
            return;
        }

        // Create mask from lasso selection
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;

        const ctx = maskCanvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);

        for (let i = 1; i < lassoPoints.length; i++) {
            ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
        }

        ctx.closePath();
        ctx.fill();

        toast.success('Lasso selection created!');
        setLassoPoints([]);
    };

    const getMaskImage = (): Promise<File | null> => {
        return new Promise((resolve) => {
            const maskCanvas = maskCanvasRef.current;
            if (!maskCanvas) {
                resolve(null);
                return;
            }

            maskCanvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], 'mask.png', { type: 'image/png' });
                    resolve(file);
                } else {
                    resolve(null);
                }
            }, 'image/png');
        });
    };

    const convertImageToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Helper: Create image with mask overlay if mask exists
    const createMaskedImageFile = async (): Promise<File> => {
        const maskCanvas = maskCanvasRef.current;
        const canvas = canvasRef.current;

        if (!maskCanvas || !canvas || !imageRef.current) {
            return currentImageFile!;
        }

        const ctx = maskCanvas.getContext('2d');
        if (!ctx) return currentImageFile!;

        const maskData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const hasMask = Array.from(maskData.data).some(val => val > 0);

        if (!hasMask) {
            return currentImageFile!;
        }

        // Create combined image with mask
        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = canvas.width;
        combinedCanvas.height = canvas.height;
        const combinedCtx = combinedCanvas.getContext('2d');

        if (!combinedCtx) return currentImageFile!;

        // Draw original image
        combinedCtx.drawImage(imageRef.current, 0, 0);
        // Overlay mask with transparency
        combinedCtx.globalAlpha = 0.5;
        combinedCtx.drawImage(maskCanvas, 0, 0);
        combinedCtx.globalAlpha = 1.0;

        // Convert to file
        const blob = await new Promise<Blob>((resolve) => {
            combinedCanvas.toBlob((b) => resolve(b!), 'image/png');
        });
        return new File([blob], 'masked-image.png', { type: 'image/png' });
    };

    // Helper: Get the currently displayed timeline image as a File
    const getTimelineImageFile = async (): Promise<File> => {
        // currentImage is from the store - it's the image at the timeline scrubber position
        if (!currentImage) throw new Error('No image available');

        // Fetch the current image and convert to File
        const response = await fetch(currentImage);
        const blob = await response.blob();
        return new File([blob], 'timeline-image.png', { type: 'image/png' });
    };

    // Helper: Create masked image from timeline-selected image
    const createMaskedTimelineImage = async (): Promise<File> => {
        const maskCanvas = maskCanvasRef.current;
        const canvas = canvasRef.current;

        if (!maskCanvas || !canvas || !imageRef.current) {
            return await getTimelineImageFile();
        }

        const ctx = maskCanvas.getContext('2d');
        if (!ctx) return await getTimelineImageFile();

        const maskData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const hasMask = Array.from(maskData.data).some(val => val > 0);

        if (!hasMask) {
            return await getTimelineImageFile();
        }

        // Create combined image with mask
        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = canvas.width;
        combinedCanvas.height = canvas.height;
        const combinedCtx = combinedCanvas.getContext('2d');

        if (!combinedCtx) return await getTimelineImageFile();

        // Draw current timeline image
        combinedCtx.drawImage(imageRef.current, 0, 0);
        // Overlay mask with transparency
        combinedCtx.globalAlpha = 0.5;
        combinedCtx.drawImage(maskCanvas, 0, 0);
        combinedCtx.globalAlpha = 1.0;

        // Convert to file
        const blob = await new Promise<Blob>((resolve) => {
            combinedCanvas.toBlob((b) => resolve(b!), 'image/png');
        });
        return new File([blob], 'masked-timeline-image.png', { type: 'image/png' });
    };

    // Helper: Create composite image of timeline image + overlayed object
    const createCompositeImage = async (): Promise<File> => {
        const canvas = canvasRef.current;
        if (!canvas || !imageRef.current) {
            return await getTimelineImageFile();
        }

        // Create composite canvas
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = canvas.width;
        compositeCanvas.height = canvas.height;
        const ctx = compositeCanvas.getContext('2d');

        if (!ctx) return await getTimelineImageFile();

        // Draw the current timeline image
        ctx.drawImage(imageRef.current, 0, 0);

        // Draw the overlayed object if exists
        if (placedObject && objectImageRef.current) {
            // Get the canvas container (parent of canvas) and canvas positions
            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = canvas.parentElement?.getBoundingClientRect();

            if (containerRect) {
                // Calculate how much the canvas is offset from container top-left (due to centering)
                const canvasOffsetX = canvasRect.left - containerRect.left;
                const canvasOffsetY = canvasRect.top - containerRect.top;

                // The scale between displayed canvas size and native canvas resolution
                const scaleX = canvas.width / canvasRect.width;
                const scaleY = canvas.height / canvasRect.height;

                // Object position is relative to container, but we need it relative to canvas
                // Subtract the canvas offset, then scale to native resolution
                const relativeX = (objectPosition.x - canvasOffsetX) * scaleX;
                const relativeY = (objectPosition.y - canvasOffsetY) * scaleY;
                const scaledWidth = objectSize.width * scaleX;
                const scaledHeight = objectSize.height * scaleY;

                ctx.drawImage(objectImageRef.current, relativeX, relativeY, scaledWidth, scaledHeight);
            }
        }

        // Convert to file
        const blob = await new Promise<Blob>((resolve) => {
            compositeCanvas.toBlob((b) => resolve(b!), 'image/png');
        });
        return new File([blob], 'composite-image.png', { type: 'image/png' });
    };

    const handleApplyTemplate = async (template: EditingTemplate) => {
        if (!currentImageFile || !currentImage) {
            toast.error('Please upload an image first');
            return;
        }

        setIsProcessing(true);
        setEditPrompt(template.prompt);

        try {
            let resultUrl: string;

            if (template.service === 'seedream') {
                // Use the timeline-selected image (with mask if exists)
                const imageFileToUpload = await createMaskedTimelineImage();

                // Upload image to Runware to get valid URL
                const uploadedImageUrl = await runwareService.uploadImageForURL(imageFileToUpload);

                // Use Wavespeed Seedream 4.5 with the uploaded URL
                resultUrl = await WavespeedService.generateSeedream45Img2Img({
                    images: [uploadedImageUrl],
                    prompt: template.prompt
                });
            } else if (template.service === 'objectPlacement') {
                toast.info('Please use the Object Placement tool below the templates');
                setIsProcessing(false);
                return;
            } else if (template.service === 'runware') {
                // Use Runware services
                if (template.id === 'remove-background') {
                    // Remove background using timeline-selected image
                    const imageFile = await getTimelineImageFile();
                    const uploadedImageUrl = await runwareService.uploadImageForURL(imageFile);
                    const result = await runwareService.removeBackground({
                        inputImage: uploadedImageUrl,
                        outputFormat: 'PNG'
                    });
                    resultUrl = result.imageURL;
                } else {
                    toast.error('Service not implemented yet');
                    setIsProcessing(false);
                    return;
                }
            } else {
                toast.error('Service not implemented yet');
                setIsProcessing(false);
                return;
            }

            // Add to timeline
            addEntry({
                imageUrl: resultUrl,
                operation: template.name,
                prompt: template.prompt
            });

            toast.success(`${template.name} applied!`);
        } catch (error) {
            console.error('Template application failed:', error);
            toast.error(`Failed to apply ${template.name}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCustomEdit = async () => {
        if (!currentImage || !editPrompt.trim()) {
            toast.error('Please upload an image and enter a prompt');
            return;
        }

        setIsProcessing(true);

        try {
            // Use the timeline-selected image (with mask if exists)
            const imageFileToUpload = await createMaskedTimelineImage();

            // Upload image to Runware to get valid URL
            const uploadedImageUrl = await runwareService.uploadImageForURL(imageFileToUpload);

            // Use Seedream 4.5 for custom edits with the uploaded URL
            const resultUrl = await WavespeedService.generateSeedream45Img2Img({
                images: [uploadedImageUrl],
                prompt: editPrompt
            });

            addEntry({
                imageUrl: resultUrl,
                operation: 'Custom Edit',
                prompt: editPrompt
            });

            toast.success('Custom edit applied!');
        } catch (error) {
            console.error('Custom edit failed:', error);
            toast.error('Failed to apply custom edit');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
            <div className="flex-1 flex min-h-0 overflow-hidden gap-4 p-4">
                {/* Left Panel - Canvas and Tools */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    {/* Tool Bar */}
                    <Card className="p-3 bg-ai-surface border-border shadow-card">
                        <div className="flex items-center gap-2">
                            <Button
                                variant={activeTool === 'pan' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('pan')}
                            >
                                <MousePointer2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={activeTool === 'selection' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('selection')}
                            >
                                <Scan className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={activeTool === 'brush' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('brush')}
                            >
                                <Brush className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={activeTool === 'eraser' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('eraser')}
                            >
                                <Eraser className="w-4 h-4" />
                            </Button>

                            <div className="h-6 w-px bg-border mx-2" />

                            {activeTool === 'brush' || activeTool === 'eraser' ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <Label className="text-xs">Size:</Label>
                                    <Slider
                                        value={[brushSize]}
                                        onValueChange={(v) => setBrushSize(v[0])}
                                        min={5}
                                        max={100}
                                        step={5}
                                        className="w-32"
                                    />
                                    <span className="text-xs text-muted-foreground">{brushSize}px</span>
                                </div>
                            ) : null}

                            {activeTool === 'selection' && lassoPoints.length > 0 ? (
                                <>
                                    <Button size="sm" onClick={closeLasso} variant="default">
                                        Close Lasso
                                    </Button>
                                    <Button size="sm" onClick={() => setLassoPoints([])} variant="outline">
                                        Clear
                                    </Button>
                                </>
                            ) : null}
                        </div>
                    </Card>

                    {/* Canvas */}
                    <Card className="flex-1 p-4 bg-ai-surface border-border shadow-card overflow-hidden min-h-0 flex items-center justify-center">
                        {currentImage ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <canvas
                                    ref={canvasRef}
                                    className="border border-border rounded"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        display: 'block'
                                    }}
                                />
                                <canvas
                                    ref={maskCanvasRef}
                                    className="absolute pointer-events-none"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        opacity: 0.5,
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                />
                                <canvas
                                    className="absolute cursor-crosshair"
                                    width={canvasRef.current?.width}
                                    height={canvasRef.current?.height}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                />

                                {/* Draggable Object Overlay */}
                                {placedObject && objectPreviewUrl && (
                                    <div
                                        className="absolute border-2 border-dashed border-blue-500 rounded"
                                        style={{
                                            left: objectPosition.x,
                                            top: objectPosition.y,
                                            width: objectSize.width,
                                            height: objectSize.height,
                                            zIndex: 50
                                        }}
                                    >
                                        {/* Drag area */}
                                        <div
                                            className="absolute inset-2 cursor-move"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsDraggingObject(true);
                                                objectDragStart.current = {
                                                    x: e.clientX - objectPosition.x,
                                                    y: e.clientY - objectPosition.y
                                                };
                                            }}
                                        />
                                        <img
                                            ref={objectImageRef}
                                            src={objectPreviewUrl}
                                            alt="Placed object"
                                            className="w-full h-full object-contain pointer-events-none"
                                            draggable={false}
                                        />
                                        {/* Corner resize handles */}
                                        {/* Bottom-right corner */}
                                        <div
                                            className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-400"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsResizing(true);
                                                resizeStart.current = {
                                                    x: e.clientX,
                                                    y: e.clientY,
                                                    width: objectSize.width,
                                                    height: objectSize.height
                                                };
                                            }}
                                        />
                                        {/* Top-left label */}
                                        <div className="absolute -top-6 left-0 text-xs text-blue-400 bg-blue-900/80 px-1 rounded whitespace-nowrap">
                                            Drag center • Resize corner
                                        </div>
                                        {/* Size indicator */}
                                        <div className="absolute -bottom-6 left-0 text-xs text-blue-300 bg-blue-900/80 px-1 rounded">
                                            {Math.round(objectSize.width)}×{Math.round(objectSize.height)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ai-surface-elevated flex items-center justify-center">
                                        <Upload className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="text-muted-foreground mb-4">Upload an image to start editing</p>
                                    <Button onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload Image
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Panel - Templates and Prompt */}
                <div className="w-96 flex flex-col gap-4 overflow-y-auto">
                    {/* Image Upload */}
                    {currentImage && (
                        <Card className="p-4 bg-ai-surface border-border shadow-card">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Change Image
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </Card>
                    )}

                    {/* Custom Edit Prompt */}
                    <Card className="p-4 bg-ai-surface border-border shadow-card">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Wand2 className="w-4 h-4" />
                            Custom Edit
                        </h3>
                        <div className="space-y-3">
                            <Textarea
                                placeholder="Describe your edit..."
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                className="h-20 resize-none"
                            />
                            <Button
                                onClick={handleCustomEdit}
                                disabled={isProcessing || !currentImage || !editPrompt.trim()}
                                className="w-full"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Apply Custom Edit
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>

                    {/* Editing Templates */}
                    <Card className="p-4 bg-ai-surface border-border shadow-card">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Editing Templates
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {EDITING_TEMPLATES.map((template) => (
                                <Button
                                    key={template.id}
                                    variant="outline"
                                    className="h-auto flex-col items-start p-3 text-left"
                                    onClick={() => handleApplyTemplate(template)}
                                    disabled={isProcessing || !currentImage}
                                >
                                    <div className="flex items-center gap-2 mb-1 w-full">
                                        {template.icon}
                                        <span className="text-xs font-semibold">{template.name}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {template.description}
                                    </p>
                                </Button>
                            ))}
                        </div>
                    </Card>

                    {/* Selection Tool - Color Picker */}
                    {activeTool === 'selection' && (
                        <Card className="p-4 bg-ai-surface border-border shadow-card">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Scan className="w-4 h-4" />
                                Selection Border Color
                            </h3>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="color"
                                    value={selectionBorderColor}
                                    onChange={(e) => setSelectionBorderColor(e.target.value)}
                                    className="w-16 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                    type="text"
                                    value={selectionBorderColor}
                                    onChange={(e) => setSelectionBorderColor(e.target.value)}
                                    className="flex-1 font-mono text-xs"
                                    placeholder="#00ff00"
                                />
                            </div>
                        </Card>
                    )}

                    {/* Object Placement Tool */}
                    <Card className="p-4 bg-ai-surface border-border shadow-card">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Object Placement
                        </h3>
                        <div className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => objectFileInputRef.current?.click()}
                                disabled={!currentImage || isProcessing}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Object (PNG/OBJ/GLB)
                            </Button>
                            <input
                                ref={objectFileInputRef}
                                type="file"
                                accept=".png,.obj,.glb,.gltf,image/png"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && currentImage) {
                                        setPlacedObject({
                                            file,
                                            x: 50,
                                            y: 50,
                                            scale: 1
                                        });
                                        // Create preview URL for PNG images
                                        if (file.type.startsWith('image/')) {
                                            const url = URL.createObjectURL(file);
                                            setObjectPreviewUrl(url);
                                            // Load image to get dimensions
                                            const img = new Image();
                                            img.onload = () => {
                                                const maxSize = 200;
                                                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                                                setObjectSize({
                                                    width: img.width * scale,
                                                    height: img.height * scale
                                                });
                                            };
                                            img.src = url;
                                        } else {
                                            setObjectPreviewUrl(null);
                                        }
                                        setObjectPosition({ x: 100, y: 100 });
                                        toast.success(`Object loaded: ${file.name}`);
                                    }
                                }}
                            />
                            {placedObject && (
                                <>
                                    <div className="text-xs text-muted-foreground">
                                        <p className="truncate">📦 {placedObject.file.name}</p>
                                        <p>Position: ({objectPosition.x}, {objectPosition.y})</p>
                                        <p>Scale: {objectScale.toFixed(2)}x</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Scale</Label>
                                        <Slider
                                            value={[objectScale]}
                                            onValueChange={(v) => setObjectScale(v[0])}
                                            min={0.1}
                                            max={3}
                                            step={0.1}
                                            className="w-full"
                                        />
                                    </div>
                                    <Button
                                        variant="default"
                                        className="w-full"
                                        onClick={async () => {
                                            if (!currentImage || !placedObject) return;
                                            setIsProcessing(true);
                                            try {
                                                // Create composite image of timeline image + overlayed object
                                                const compositeFile = await createCompositeImage();
                                                const uploadedImageUrl = await runwareService.uploadImageForURL(compositeFile);

                                                // Apply blend with Seedream
                                                const resultUrl = await WavespeedService.generateSeedream45Img2Img({
                                                    images: [uploadedImageUrl],
                                                    prompt: 'blend the placed object with the scene, object is comprehensively blended with light and shadows of the scene'
                                                });

                                                addEntry({
                                                    imageUrl: resultUrl,
                                                    operation: 'Object Placement',
                                                    prompt: 'Object blended with scene'
                                                });

                                                setPlacedObject(null);
                                                setObjectPreviewUrl(null);
                                                toast.success('Object placement completed!');
                                            } catch (error) {
                                                console.error('Object placement failed:', error);
                                                toast.error('Failed to place object');
                                            } finally {
                                                setIsProcessing(false);
                                            }
                                        }}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Done - Blend Object
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Timeline Bar */}
            <TimelineBar />
        </div>
    );
};
