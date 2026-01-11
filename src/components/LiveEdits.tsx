import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ImageUpload';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { RunwareService } from '@/services/RunwareService';

interface LiveEditsProps {
  runwareService: RunwareService;
}

export const LiveEdits: React.FC<LiveEditsProps> = ({ runwareService }) => {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [segmentationImageUrl, setSegmentationImageUrl] = useState<string>("");
  const [selectedAreaImage, setSelectedAreaImage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<{ x: number, y: number } | null>(null);

  /* New state for multi-selection */
  const [selectedColors, setSelectedColors] = useState<{ r: number, g: number, b: number }[]>([]);
  const [isMultiSelectEnabled, setIsMultiSelectEnabled] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const segmentationImageRef = useRef<HTMLImageElement>(null);
  const segmentationDataRef = useRef<ImageData | null>(null);

  // ... (keeping effects as they match the original file structure, just showing context for state addition)

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!segmentationImageUrl || !hoveredSegment) return;

    const segmentColor = getSegmentColor(hoveredSegment.x, hoveredSegment.y);
    if (!segmentColor) return;

    const isMultiSelect = isMultiSelectEnabled || e.ctrlKey || e.metaKey;

    setSelectedColors(prev => {
      const tolerance = 10;
      const existingIndex = prev.findIndex(c =>
        Math.abs(c.r - segmentColor.r) < tolerance &&
        Math.abs(c.g - segmentColor.g) < tolerance &&
        Math.abs(c.b - segmentColor.b) < tolerance
      );

      if (isMultiSelect) {
        // Toggle behavior
        if (existingIndex >= 0) {
          // Toggle off
          const updated = [...prev];
          updated.splice(existingIndex, 1);
          return updated;
        } else {
          // Toggle on
          return [...prev, segmentColor];
        }
      } else {
        // Single select behavior (replace unless clicking the same one, in which case maybe deselect?)
        // Standard UX: Single click replaces selection. Clicking same one again replaces with itself (no change) or deselects?
        // Let's go with "replace selection".
        if (existingIndex >= 0 && prev.length === 1) {
          // Clicking the only selected segment -> deselect it? Or keep it?
          // "Select" implies keeping it. But acts as toggle often.
          // Let's make single click replace. If I click A, only A is selected. If I click A again, A stays selected.
          // If I want to clear, I use the clear button or multi-select toggle.
          // Actually, if I click the SAME segment in single mode, and it's invalid to have 0 selection? No, 0 is valid.
          // Let's make it toggle if it's the *only* one selected? No, consistent replace is better?
          // User asked: "allow multi select... checkbox... also allow it when I hold ctr button".
          // Implies default is single select.
          return [segmentColor];
        } else {
          return [segmentColor];
        }
      }
    });

    toast.success(isMultiSelect ? 'Selection updated' : 'Segment selected');
  };

  useEffect(() => {
    if (uploadedImage) {
      const url = URL.createObjectURL(uploadedImage);
      setUploadedImageUrl(url);
      handlePreprocessSegmentation(uploadedImage);

      // Clear selection on new image
      setSelectedColors([]);
      setSelectedAreaImage("");

      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedImage]);

  useEffect(() => {
    if (uploadedImageUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = uploadedImageUrl;
    }
  }, [uploadedImageUrl]);

  useEffect(() => {
    if (segmentationImageUrl && overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        segmentationImageRef.current = img;

        // Store segmentation data for efficient access
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0);
          segmentationDataRef.current = tempCtx.getImageData(0, 0, img.width, img.height);
        }
      };
      img.src = segmentationImageUrl;
    }
  }, [segmentationImageUrl]);

  /* Effect to update the output image whenever selection changes */
  useEffect(() => {
    updateSelectedAreaImage();
  }, [selectedColors]);

  const handlePreprocessSegmentation = async (imageFile: File) => {
    setIsProcessing(true);
    try {
      const uploadedId = await runwareService.uploadImage(imageFile);

      const result = await runwareService.preprocessControlNet({
        inputImage: uploadedId,
        preProcessorType: 'seg',
        height: 1024,
        width: 1024,
        outputType: ['URL'],
        outputFormat: 'WEBP',
        includeCost: true
      });

      setSegmentationImageUrl(result.imageURL);
      toast.success('Segmentation preprocessing complete!');
    } catch (error) {
      console.error('Preprocessing failed:', error);
      toast.error('Failed to preprocess image');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSegmentColor = (x: number, y: number): { r: number, g: number, b: number } | null => {
    if (!segmentationDataRef.current) return null;

    const data = segmentationDataRef.current.data;
    const width = segmentationDataRef.current.width;
    const index = (y * width + x) * 4;

    if (index < 0 || index >= data.length) return null;

    return { r: data[index], g: data[index + 1], b: data[index + 2] };
  };

  const highlightSegment = (x: number, y: number) => {
    if (!overlayCanvasRef.current || !segmentationDataRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const segmentColor = getSegmentColor(x, y);
    if (!segmentColor) return;

    const width = canvas.width;
    const height = canvas.height;
    const segData = segmentationDataRef.current.data;

    const highlightData = ctx.createImageData(width, height);
    const highlight = highlightData.data;

    const tolerance = 10;

    const isMatch = (idx: number, color: { r: number, g: number, b: number }) => {
      if (idx < 0 || idx >= segData.length) return false;
      return Math.abs(segData[idx] - color.r) < tolerance &&
        Math.abs(segData[idx + 1] - color.g) < tolerance &&
        Math.abs(segData[idx + 2] - color.b) < tolerance;
    };

    for (let i = 0; i < segData.length; i += 4) {
      if (isMatch(i, segmentColor)) {
        const pxIndex = i / 4;
        const cx = pxIndex % width;
        const cy = Math.floor(pxIndex / width);

        let isBorder = false;

        // Check neighbors to detect border
        if (cx > 0 && !isMatch(i - 4, segmentColor)) isBorder = true;
        else if (cx < width - 1 && !isMatch(i + 4, segmentColor)) isBorder = true;
        else if (cy > 0 && !isMatch(i - width * 4, segmentColor)) isBorder = true;
        else if (cy < height - 1 && !isMatch(i + width * 4, segmentColor)) isBorder = true;

        if (isBorder) {
          // Darker blue border
          highlight[i] = 0;
          highlight[i + 1] = 80;
          highlight[i + 2] = 200;
          highlight[i + 3] = 255; // Opaque
        } else {
          // Blue highlight with 10% opacity
          highlight[i] = 0;
          highlight[i + 1] = 120;
          highlight[i + 2] = 255;
          highlight[i + 3] = 26; // ~10% of 255
        }
      }
    }

    ctx.putImageData(highlightData, 0, 0);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!segmentationImageUrl) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    setHoveredSegment({ x, y });
    highlightSegment(x, y);
  };

  const handleCanvasMouseLeave = () => {
    setHoveredSegment(null);
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
    }
  };


  const updateSelectedAreaImage = () => {
    if (selectedColors.length === 0) {
      setSelectedAreaImage("");
      return;
    }

    if (!segmentationDataRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const originalImageData = ctx.getImageData(0, 0, width, height);
    const originalData = originalImageData.data;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    const segData = segmentationDataRef.current.data;
    const segWidth = segmentationDataRef.current.width;
    const segHeight = segmentationDataRef.current.height;

    const outputImageData = outputCtx.createImageData(width, height);
    const outputData = outputImageData.data;
    const tolerance = 10;

    // Iterate over original image pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Scale coordinates
        const sx = Math.floor(x * (segWidth / width));
        const sy = Math.floor(y * (segHeight / height));

        const segIndex = (sy * segWidth + sx) * 4;

        if (segIndex >= 0 && segIndex < segData.length) {
          const r = segData[segIndex];
          const g = segData[segIndex + 1];
          const b = segData[segIndex + 2];

          // Check if matches ANY selected color
          const isSelected = selectedColors.some(sc =>
            Math.abs(r - sc.r) < tolerance &&
            Math.abs(g - sc.g) < tolerance &&
            Math.abs(b - sc.b) < tolerance
          );

          if (isSelected) {
            const i = (y * width + x) * 4;
            outputData[i] = originalData[i];
            outputData[i + 1] = originalData[i + 1];
            outputData[i + 2] = originalData[i + 2];
            outputData[i + 3] = 255;
          }
        }
      }
    }

    outputCtx.putImageData(outputImageData, 0, 0);

    outputCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setSelectedAreaImage(url);
      }
    }, 'image/png');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-6 bg-ai-surface border-border shadow-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Image
        </h3>

        <ImageUpload
          onImageSelect={setUploadedImage}
          selectedImage={uploadedImage}
        />

        {isProcessing && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Processing segmentation...
          </div>
        )}

        {uploadedImageUrl && (
          <div className="mt-6 relative">
            <h4 className="text-sm font-semibold mb-2">Interactive Canvas</h4>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                Hover to highlight, click to select
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isMultiSelectEnabled}
                  onChange={(e) => setIsMultiSelectEnabled(e.target.checked)}
                  className="rounded border-border bg-background"
                />
                Multi-select
              </label>
            </div>
            <div className="relative inline-block">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto border border-border rounded"
              />
              <canvas
                ref={overlayCanvasRef}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
                onClick={handleCanvasClick}
                className="absolute top-0 left-0 max-w-full h-auto cursor-pointer"
                style={{ opacity: 1 }}
              />
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-ai-surface border-border shadow-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Selected Segment</h3>
          {selectedColors.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedColors([]);
                toast.info("Selection cleared");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {selectedAreaImage ? (
          <div className="space-y-4">
            <img
              src={selectedAreaImage}
              alt="Selected segment"
              className="w-full h-auto border border-border rounded bg-white/5"
            />
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement('a');
                link.href = selectedAreaImage;
                link.download = 'selected-segment.png';
                link.click();
              }}
              className="w-full"
            >
              Download Segment
            </Button>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ai-surface-elevated flex items-center justify-center">
              <Upload className="w-8 h-8 opacity-50" />
            </div>
            <p>Upload an image and click on segments to combine them here</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-ai-surface-elevated rounded-lg border border-border">
          <h4 className="text-sm font-semibold mb-2">How to use:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
            <li>Upload an image</li>
            <li>Wait for automatic segmentation</li>
            <li>Click multiple segments to combine them</li>
            <li>Click a selected segment again to remove it</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};
