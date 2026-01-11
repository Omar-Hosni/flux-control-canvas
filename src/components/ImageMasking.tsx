import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/ImageUpload';
import { Sparkles, Download, Scan, Eye, Hand, User } from 'lucide-react';
import { toast } from 'sonner';
import { RunwareService, type ImageMaskingParams, type ImageMaskingResult } from '@/services/RunwareService';

interface ImageMaskingProps {
    runwareService: RunwareService;
}

// Model definitions based on user-provided documentation
const MASKING_MODELS = {
    fullFace: [
        { id: "runware:35@1", name: "face_yolov8n", description: "Lightweight model for 2D/realistic face detection" },
        { id: "runware:35@2", name: "face_yolov8s", description: "Enhanced face detection with improved accuracy" },
        { id: "runware:35@6", name: "mediapipe_face_full", description: "Specialized for realistic face detection" },
        { id: "runware:35@7", name: "mediapipe_face_short", description: "Optimized face detection with reduced complexity" },
        { id: "runware:35@8", name: "mediapipe_face_mesh", description: "Advanced face detection with mesh mapping" },
    ],
    facialFeatures: [
        { id: "runware:35@9", name: "mediapipe_face_mesh_eyes_only", description: "Focused detection of eye regions" },
        { id: "runware:35@15", name: "eyes_mesh_mediapipe", description: "Specialized eyes detection" },
        { id: "runware:35@13", name: "nose_mesh_mediapipe", description: "Specialized nose detection" },
        { id: "runware:35@14", name: "lips_mesh_mediapipe", description: "Specialized lips detection" },
        { id: "runware:35@10", name: "eyes_lips_mesh", description: "Detection of eyes and lips areas" },
        { id: "runware:35@11", name: "nose_eyes_mesh", description: "Detection of nose and eyes areas" },
        { id: "runware:35@12", name: "nose_lips_mesh", description: "Detection of nose and lips areas" },
    ],
    bodyParts: [
        { id: "runware:35@3", name: "hand_yolov8n", description: "Specialized for 2D/realistic hand detection" },
        { id: "runware:35@4", name: "person_yolov8n-seg", description: "Person detection and segmentation" },
        { id: "runware:35@5", name: "person_yolov8s-seg", description: "Advanced person detection with higher precision" },
    ]
};

export const ImageMasking: React.FC<ImageMaskingProps> = ({ runwareService }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [inputImage, setInputImage] = useState<File | null>(null);
    const [result, setResult] = useState<ImageMaskingResult | null>(null);

    // Settings
    const [category, setCategory] = useState<"fullFace" | "facialFeatures" | "bodyParts">("fullFace");
    const [selectedModel, setSelectedModel] = useState(MASKING_MODELS.fullFace[0].id);
    const [confidence, setConfidence] = useState(0.5);
    const [maxDetections, setMaxDetections] = useState(10);
    const [maskPadding, setMaskPadding] = useState(0);
    const [maskBlur, setMaskBlur] = useState(0);

    const handleCategoryChange = (newCategory: "fullFace" | "facialFeatures" | "bodyParts") => {
        setCategory(newCategory);
        // Reset to first model in new category
        setSelectedModel(MASKING_MODELS[newCategory][0].id);
    };

    const handleGenerate = async () => {
        if (!inputImage) {
            toast.error("Please select an image first");
            return;
        }

        setIsGenerating(true);
        setResult(null);

        try {
            // Upload image first
            const uploadedImageUrl = await runwareService.uploadImageForURL(inputImage);

            const params: ImageMaskingParams = {
                inputImage: uploadedImageUrl,
                model: selectedModel,
                confidence,
                maxDetections,
                maskPadding,
                maskBlur,
                outputFormat: "PNG",
                outputType: ["URL"]
            };

            const maskResult = await runwareService.generateImageMask(params);
            setResult(maskResult);
            toast.success(`Mask generated! Found ${maskResult.detections.length} detection(s)`);
        } catch (error: any) {
            console.error("Mask generation failed:", error);
            toast.error(error.message || "Failed to generate mask");
        } finally {
            setIsGenerating(false);
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case "fullFace": return <Eye className="w-4 h-4" />;
            case "facialFeatures": return <Scan className="w-4 h-4" />;
            case "bodyParts": return <User className="w-4 h-4" />;
            default: return <Eye className="w-4 h-4" />;
        }
    };

    const currentModels = MASKING_MODELS[category];
    const selectedModelInfo = currentModels.find(m => m.id === selectedModel);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Image Upload */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-gradient-primary">
                            <Scan className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Input Image
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Upload an image to generate masks
                            </p>
                        </div>
                    </div>

                    <ImageUpload
                        onImageSelect={setInputImage}
                        selectedImage={inputImage}
                    />
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
                                Masking Settings
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Configure detection parameters
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Category Selection */}
                        <div className="space-y-2">
                            <Label>Detection Category</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant={category === "fullFace" ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => handleCategoryChange("fullFace")}
                                    className="flex items-center gap-1"
                                >
                                    <Eye className="w-3 h-3" />
                                    Face
                                </Button>
                                <Button
                                    variant={category === "facialFeatures" ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => handleCategoryChange("facialFeatures")}
                                    className="flex items-center gap-1"
                                >
                                    <Scan className="w-3 h-3" />
                                    Features
                                </Button>
                                <Button
                                    variant={category === "bodyParts" ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => handleCategoryChange("bodyParts")}
                                    className="flex items-center gap-1"
                                >
                                    <Hand className="w-3 h-3" />
                                    Body
                                </Button>
                            </div>
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-2">
                            <Label>Detection Model</Label>
                            <Select value={selectedModel} onValueChange={setSelectedModel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {currentModels.map((model) => (
                                        <SelectItem key={model.id} value={model.id}>
                                            {model.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedModelInfo && (
                                <p className="text-xs text-muted-foreground">
                                    {selectedModelInfo.description}
                                </p>
                            )}
                        </div>

                        <Separator />

                        {/* Confidence Threshold */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Confidence Threshold</Label>
                                <span className="text-sm text-muted-foreground">{confidence.toFixed(2)}</span>
                            </div>
                            <Slider
                                value={[confidence]}
                                onValueChange={(v) => setConfidence(v[0])}
                                min={0.1}
                                max={1}
                                step={0.05}
                            />
                            <p className="text-xs text-muted-foreground">
                                Higher values = fewer but more confident detections
                            </p>
                        </div>

                        {/* Max Detections */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Max Detections</Label>
                                <span className="text-sm text-muted-foreground">{maxDetections}</span>
                            </div>
                            <Slider
                                value={[maxDetections]}
                                onValueChange={(v) => setMaxDetections(v[0])}
                                min={1}
                                max={50}
                                step={1}
                            />
                        </div>

                        {/* Mask Padding */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Mask Padding (px)</Label>
                                <span className="text-sm text-muted-foreground">{maskPadding}</span>
                            </div>
                            <Slider
                                value={[maskPadding]}
                                onValueChange={(v) => setMaskPadding(v[0])}
                                min={-50}
                                max={100}
                                step={5}
                            />
                            <p className="text-xs text-muted-foreground">
                                Positive = expand mask, Negative = shrink mask
                            </p>
                        </div>

                        {/* Mask Blur */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Mask Blur (px)</Label>
                                <span className="text-sm text-muted-foreground">{maskBlur}</span>
                            </div>
                            <Slider
                                value={[maskBlur]}
                                onValueChange={(v) => setMaskBlur(v[0])}
                                min={0}
                                max={50}
                                step={1}
                            />
                            <p className="text-xs text-muted-foreground">
                                Adds feathered edge for smooth blending
                            </p>
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={!inputImage || isGenerating}
                            className="w-full"
                        >
                            {isGenerating ? "Generating Mask..." : "Generate Mask"}
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
                            Generated Mask
                        </h3>
                        {result?.maskImageURL && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = result.maskImageURL!;
                                    a.download = `mask-${Date.now()}.png`;
                                    a.click();
                                }}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 rounded-xl border-2 border-dashed border-border/50 bg-black/20 overflow-hidden relative flex items-center justify-center">
                        {result?.maskImageURL ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                <img
                                    src={result.maskImageURL}
                                    alt="Generated mask"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground p-8">
                                {isGenerating ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="animate-pulse">Generating mask...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Scan className="w-16 h-16 mx-auto opacity-20" />
                                        <p>Upload an image and configure settings to generate a mask</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Detection Info */}
                    {result && result.detections.length > 0 && (
                        <div className="mt-4 p-3 bg-background/50 rounded-lg">
                            <p className="text-sm font-medium mb-2">
                                Detections: {result.detections.length}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground max-h-32 overflow-y-auto">
                                {result.detections.map((det, idx) => (
                                    <div key={idx} className="p-2 bg-background rounded">
                                        #{idx + 1}: ({det.x_min}, {det.y_min}) → ({det.x_max}, {det.y_max})
                                    </div>
                                ))}
                            </div>
                            {result.cost && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Cost: ${result.cost.toFixed(4)}
                                </p>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
