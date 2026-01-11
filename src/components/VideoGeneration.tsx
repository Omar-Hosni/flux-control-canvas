import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/ImageUpload';
import { Video, Film, Image as ImageIcon, Sparkles, AlertCircle, Download, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { RunwareService, type VideoInferenceParams } from '@/services/RunwareService';

interface VideoGenerationProps {
    runwareService: RunwareService;
}

export const VideoGeneration: React.FC<VideoGenerationProps> = ({ runwareService }) => {
    const [activeTab, setActiveTab] = useState<string>("text2video");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);

    // Common Settings
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [seed, setSeed] = useState<number | null>(null);
    const [steps, setSteps] = useState(25);
    const [cfgScale, setCfgScale] = useState(7);

    // Video Specific Settings
    const [model, setModel] = useState("runware:109@1"); // Default T2V model
    const [duration, setDuration] = useState(4); // seconds
    const [fps, setFps] = useState(16);
    const [aspectRatio, setAspectRatio] = useState("16:9");

    // LoRA Settings
    const [loras, setLoras] = useState<{ model: string, weight: number, transformer: "high" | "low" | "both" }[]>([]);

    // Inputs
    const [inputImage, setInputImage] = useState<File | null>(null);
    const [inputVideo, setInputVideo] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setInputVideo(file);
            setVideoPreviewUrl(URL.createObjectURL(file));
        }
    };

    const addLora = () => {
        setLoras([...loras, { model: "", weight: 1.0, transformer: "both" }]);
    };

    const removeLora = (index: number) => {
        setLoras(loras.filter((_, i) => i !== index));
    };

    const updateLora = (index: number, field: keyof typeof loras[0], value: any) => {
        const newLoras = [...loras];
        newLoras[index] = { ...newLoras[index], [field]: value };
        setLoras(newLoras);
    };

    const getHeightWidth = (ratio: string) => {
        const map: Record<string, { w: number, h: number }> = {
            "16:9": { w: 854, h: 480 },
            "9:16": { w: 480, h: 854 },
            "1:1": { w: 512, h: 512 },
            "4:3": { w: 640, h: 480 },
            "21:9": { w: 1024, h: 428 }, // Approximate
            "custom": { w: 512, h: 512 } // Fallback
        };
        return map[ratio] || map["16:9"];
    };

    const handleGenerate = async () => {
        if (!permissionCheck()) return;

        setIsGenerating(true);
        setGeneratedVideo(null);

        try {
            let uploadedInputUrl = undefined;
            let referenceVideos = undefined;

            // Upload input image if needed (I2V)
            if (activeTab === 'img2video' && inputImage) {
                uploadedInputUrl = await runwareService.uploadImageForURL(inputImage);
            }

            // Upload input video if needed (V2V) -> This assumes uploadImageForURL works for videos, OR we need a video uploader?
            // RunwareService only has uploadImageForURL using FileReader for dataURI or blob. 
            // If the API supports video uploads via the same mechanism (it does support data URI for small videos, but large ones?)
            // The API docs say "URL pointing to the video". We might need to implement general file upload if not present.
            // But looking at RunwareService, it lacks a generic file uploader. 
            // For now, let's assume `uploadImageForURL` *might* work if it just sends a data URI, 
            // BUT `imageUpload` taskType implies images.
            // Wait, V2V usually requires a URL. 
            // If `runwareService` doesn't support video upload, we are stuck for V2V unless we add `videoUpload` support or use external URL.
            // Let's stick to I2V and T2V for now or blindly try `uploadImageForURL`? 
            // Actually `videoInference` accepts `referenceVideos` as UUIDs or URLs.
            // Let's postpone V2V upload implementation detail and just use URL input for now or try the image uploader (might fail).
            // Re-reading docs: "imageUpload" task type. 
            // Okay, I will implement V2V UI but maybe disable actual upload if I can't confirm it allows video.
            // Actually, standard `uploadImage` sends `image` field. API probably validates mime type.
            // Let's stick to T2V and I2V as primary. V2V might be risky without verified upload.

            // Dimensions
            const dims = getHeightWidth(aspectRatio);

            // Filter valid LoRAs
            const validLoras = loras.filter(l => l.model.trim() !== "");

            const params: VideoInferenceParams = {
                model: model,
                positivePrompt: prompt,
                negativePrompt: negativePrompt,
                steps: steps,
                CFGScale: cfgScale,
                width: dims.w,
                height: dims.h,
                duration: duration,
                fps: fps,
                outputFormat: "MP4",
                inputImage: uploadedInputUrl, // mapped to referenceImages in service if needed
                lora: validLoras.length > 0 ? validLoras : undefined
            };

            const result = await runwareService.generateVideo(params);

            if (result.videoURL) {
                setGeneratedVideo(result.videoURL);
                toast.success("Video generated successfully!");
            }
        } catch (error: any) {
            console.error("Video generation failed:", error);
            toast.error(error.message || "Failed to generate video");
        } finally {
            setIsGenerating(false);
        }
    };

    const permissionCheck = () => {
        if (!prompt) {
            toast.error("Please enter a prompt");
            return false;
        }
        if (activeTab === 'img2video' && !inputImage) {
            toast.error("Please select an input image");
            return false;
        }
        return true;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Inputs & Settings */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="text2video" className="gap-2">
                                <Film className="w-4 h-4" /> T2V
                            </TabsTrigger>
                            <TabsTrigger value="img2video" className="gap-2">
                                <ImageIcon className="w-4 h-4" /> I2V
                            </TabsTrigger>
                            {/* V2V disabled for V1 pending upload support */}
                            <TabsTrigger value="video2video" className="gap-2" disabled>
                                <Video className="w-4 h-4" /> V2V
                            </TabsTrigger>
                        </TabsList>

                        <div className="space-y-6">
                            {/* Image Input for I2V */}
                            {activeTab === 'img2video' && (
                                <div className="space-y-2">
                                    <Label>Input Image</Label>
                                    <ImageUpload
                                        onImageSelect={setInputImage}
                                        selectedImage={inputImage}
                                    />
                                    <p className="text-xs text-muted-foreground">The video will be animated from this image.</p>
                                </div>
                            )}

                            {/* Prompt Input */}
                            <div className="space-y-2">
                                <Label>Prompt</Label>
                                <Textarea
                                    placeholder="Describe the video you want to generate..."
                                    className="h-24 resize-none bg-background/50"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Negative Prompt</Label>
                                <Input
                                    placeholder="What to avoid..."
                                    className="bg-background/50"
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                />
                            </div>

                            {/* LoRAs */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label>LoRAs</Label>
                                    <Button variant="outline" size="sm" onClick={addLora} className="h-7 text-xs">
                                        + Add LoRA
                                    </Button>
                                </div>

                                {loras.map((lora, index) => (
                                    <div key={index} className="p-3 bg-background/30 rounded-lg space-y-3 border border-border/50">
                                        <div className="space-y-1">
                                            <Label className="text-xs">LoRA AIR</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="civitai:132942@146296"
                                                    className="h-8 text-xs font-mono"
                                                    value={lora.model}
                                                    onChange={(e) => updateLora(index, 'model', e.target.value)}
                                                />
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeLora(index)}>
                                                    <span className="text-lg">×</span>
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span>Weight: {lora.weight}</span>
                                                </div>
                                                <Slider
                                                    value={[lora.weight]}
                                                    min={-2.0}
                                                    max={2.0}
                                                    step={0.1}
                                                    onValueChange={(vals) => updateLora(index, 'weight', vals[0])}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Transformer Stage</Label>
                                                <Select value={lora.transformer} onValueChange={(val) => updateLora(index, 'transformer', val)}>
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="both">Both</SelectItem>
                                                        <SelectItem value="high">High</SelectItem>
                                                        <SelectItem value="low">Low</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Separator className="bg-border/50" />

                            {/* Settings */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Model AIR</Label>
                                        <Select onValueChange={(val) => setModel(val)}>
                                            <SelectTrigger className="w-[140px] h-7 text-xs">
                                                <span className="truncate">Load Preset</span>
                                            </SelectTrigger>
                                            <SelectContent align="end">
                                                <SelectItem value="runware:109@1">Runware T2V</SelectItem>
                                                <SelectItem value="runware:105@1">Stable Video (I2V)</SelectItem>
                                                <SelectItem value="civitai:123@1">Custom Example</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Input
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="provider:model@version"
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Duration (s)</Label>
                                        <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="2">2s</SelectItem>
                                                <SelectItem value="4">4s</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>FPS</Label>
                                        <Select value={fps.toString()} onValueChange={(v) => setFps(parseInt(v))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="16">16 (Fast)</SelectItem>
                                                <SelectItem value="24">24 (Film)</SelectItem>
                                                <SelectItem value="30">30 (Smooth)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Aspect Ratio</Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['16:9', '9:16', '1:1', '4:3', '21:9'].map((ratio) => (
                                            <Button
                                                key={ratio}
                                                variant={aspectRatio === ratio ? "secondary" : "outline"}
                                                size="sm"
                                                onClick={() => setAspectRatio(ratio)}
                                                className="text-xs px-1"
                                            >
                                                {ratio}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs>
                </Card>
            </div>

            {/* Right Column: Generation & Results */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="p-6 bg-ai-surface border-border shadow-card min-h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Generated Output
                        </h3>
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="min-w-[140px] shadow-lg shadow-primary/20"
                        >
                            {isGenerating ? (
                                <>
                                    <Zap className="w-4 h-4 mr-2 animate-pulse" /> Generating...
                                </>
                            ) : (
                                <>
                                    <Film className="w-4 h-4 mr-2" /> Generate Video
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="flex-1 rounded-xl border-2 border-dashed border-border/50 bg-black/20 overflow-hidden relative flex items-center justify-center">
                        {generatedVideo ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                <video
                                    ref={videoRef}
                                    src={generatedVideo}
                                    controls
                                    autoPlay
                                    loop
                                    className="max-h-full max-w-full object-contain"
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="absolute top-4 right-4 gap-2"
                                    onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = generatedVideo;
                                        a.download = `generated-video-${Date.now()}.mp4`;
                                        a.click();
                                    }}
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground p-8">
                                {isGenerating ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="animate-pulse">Rendering video frames...</p>
                                        <p className="text-xs opacity-50">This may take 30-60 seconds</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Film className="w-16 h-16 mx-auto opacity-20" />
                                        <p>Configure settings and click generate to create a video</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
