import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    Upload,
    Sparkles,
    Download,
    Image as ImageIcon,
    FileCode,
    Loader2
} from 'lucide-react';
import { RunwareService, type VectorizeParams, type VectorizeResult } from '@/services/RunwareService';

interface ImageVectorizerProps {
    runwareService: RunwareService;
}

const VECTORIZE_MODELS = [
    { id: 'recraft:1@1', name: 'Recraft Vectorize', description: 'High-quality vector conversion' },
    { id: 'picsart:1@1', name: 'Picsart Image Vectorizer', description: 'Fast and accurate vectorization' },
];

export const ImageVectorizer: React.FC<ImageVectorizerProps> = ({ runwareService }) => {
    const [inputImage, setInputImage] = useState<File | null>(null);
    const [inputImageUrl, setInputImageUrl] = useState<string>('');
    const [inputType, setInputType] = useState<'upload' | 'url'>('upload');
    const [model, setModel] = useState<'recraft:1@1' | 'picsart:1@1'>('recraft:1@1');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<VectorizeResult | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleImageSelect = (file: File | null) => {
        setInputImage(file);
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
        setResult(null);
    };

    const handleVectorize = async () => {
        if (!runwareService) {
            toast.error('Service not initialized');
            return;
        }

        let imageToProcess: string;

        if (inputType === 'upload') {
            if (!inputImage) {
                toast.error('Please select an image to vectorize');
                return;
            }
            // Upload the image first
            try {
                imageToProcess = await runwareService.uploadImageForURL(inputImage);
            } catch (error) {
                toast.error('Failed to upload image');
                return;
            }
        } else {
            if (!inputImageUrl.trim()) {
                toast.error('Please enter an image URL');
                return;
            }
            imageToProcess = inputImageUrl.trim();
        }

        setIsProcessing(true);
        try {
            const params: VectorizeParams = {
                inputImage: imageToProcess,
                model: model,
                outputFormat: 'SVG',
                outputType: 'URL',
            };

            const vectorResult = await runwareService.vectorizeImage(params);
            setResult(vectorResult);
            toast.success('Image vectorized successfully!');
        } catch (error) {
            console.error('Vectorization failed:', error);
            toast.error('Failed to vectorize image. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadSVG = () => {
        if (result?.imageURL) {
            const link = document.createElement('a');
            link.href = result.imageURL;
            link.download = 'vectorized-image.svg';
            link.click();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Input & Settings */}
            <div className="space-y-6">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                            <FileCode className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Image Vectorizer
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Convert raster images to scalable SVG vectors
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Input Type Toggle */}
                        <div className="flex gap-2">
                            <Button
                                variant={inputType === 'upload' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setInputType('upload')}
                                className="flex-1"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Image
                            </Button>
                            <Button
                                variant={inputType === 'url' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setInputType('url')}
                                className="flex-1"
                            >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Image URL
                            </Button>
                        </div>

                        {/* Image Input */}
                        {inputType === 'upload' ? (
                            <div>
                                <Label className="text-sm font-medium mb-2 block">Upload Image (PNG, JPG, WEBP)</Label>
                                <Button
                                    variant="outline"
                                    className="w-full h-32 border-dashed flex flex-col gap-2"
                                    onClick={() => document.getElementById('vectorize-input')?.click()}
                                >
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="h-24 w-auto object-contain rounded" />
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                                {inputImage ? inputImage.name : 'Choose Image'}
                                            </span>
                                        </>
                                    )}
                                </Button>
                                <input
                                    id="vectorize-input"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                            </div>
                        ) : (
                            <div>
                                <Label className="text-sm font-medium mb-2 block">Image URL</Label>
                                <Input
                                    placeholder="https://example.com/image.png"
                                    value={inputImageUrl}
                                    onChange={(e) => setInputImageUrl(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Model Selection */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Vectorization Model</Label>
                            <Select value={model} onValueChange={(v: any) => setModel(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {VECTORIZE_MODELS.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <div className="flex flex-col">
                                                <span>{m.name}</span>
                                                <span className="text-xs text-muted-foreground">{m.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Vectorize Button */}
                        <Button
                            onClick={handleVectorize}
                            disabled={isProcessing || (inputType === 'upload' ? !inputImage : !inputImageUrl.trim())}
                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Vectorizing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Convert to SVG
                                </>
                            )}
                        </Button>
                    </div>
                </Card>

                {/* Cost Display */}
                {result?.cost !== undefined && (
                    <Card className="p-4 bg-ai-surface border-border">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Processing Cost</span>
                            <span className="text-sm font-medium text-foreground">${result.cost.toFixed(4)}</span>
                        </div>
                    </Card>
                )}
            </div>

            {/* Right Column - Result */}
            <div>
                <Card className="p-6 bg-ai-surface border-border shadow-card min-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                                <FileCode className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    SVG Output
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Vectorized result
                                </p>
                            </div>
                        </div>
                        {result?.imageURL && (
                            <Button variant="outline" size="sm" onClick={handleDownloadSVG}>
                                <Download className="w-4 h-4 mr-2" />
                                Download SVG
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 flex items-center justify-center rounded-lg border border-border/50 bg-background/50 overflow-hidden">
                        {isProcessing ? (
                            <div className="text-center space-y-4">
                                <div className="relative">
                                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/20 border-t-purple-500 mx-auto" />
                                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-purple-500 animate-pulse" />
                                </div>
                                <p className="text-muted-foreground">Converting to vector...</p>
                            </div>
                        ) : result?.imageURL ? (
                            <div className="w-full h-full p-4 flex items-center justify-center">
                                <img
                                    src={result.imageURL}
                                    alt="Vectorized SVG"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="text-center space-y-3 text-muted-foreground">
                                <div className="p-4 rounded-full bg-muted/30 mx-auto w-fit">
                                    <FileCode className="w-12 h-12" />
                                </div>
                                <p>Your vectorized SVG will appear here</p>
                                <p className="text-sm">Upload an image and click Convert</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
