import { toast } from "sonner";

export interface WavespeedTxt2ImgParams {
    prompt: string;
    resolution?: "1k" | "2k" | "4k";
    aspect_ratio?: "1:1" | "16:9" | "9:16" | "3:2" | "2:3" | "4:3" | "3:4" | "5:4" | "4:5" | "21:9";
    output_format?: "png" | "jpg" | "webp";
    enable_sync_mode?: boolean;
    enable_base64_output?: boolean;
}

export interface WavespeedImg2ImgParams {
    images: string[]; // URLs
    prompt: string;
    resolution?: "1k" | "2k" | "4k";
    aspect_ratio?: "1:1" | "16:9" | "9:16" | "3:2" | "2:3" | "4:3" | "3:4" | "5:4" | "4:5" | "21:9";
    output_format?: "png" | "jpg" | "webp";
    enable_sync_mode?: boolean;
    enable_base64_output?: boolean;
}

export interface WavespeedLayeredParams {
    image: string; // URL
    prompt: string;
    num_layers?: number; // 1-8, default 4
    enable_sync_mode?: boolean;
    enable_base64_output?: boolean;
}

export class WavespeedService {
    private static getHeaders() {
        const apiKey = import.meta.env.VITE_WAVESPEED_API_KEY;
        if (!apiKey) {
            console.error("VITE_WAVESPEED_API_KEY is not set");
            throw new Error("VITE_WAVESPEED_API_KEY is not set");
        }
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        };
    }

    private static async pollForResult(requestId: string): Promise<string> {
        const maxAttempts = 600; // 60 seconds timeout (0.1s * 600)
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(
                    `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
                    {
                        headers: {
                            "Authorization": `Bearer ${import.meta.env.VITE_WAVESPEED_API_KEY}`
                        }
                    }
                );

                if (!response.ok) {
                    // If it's a 404, it might just be too early, wait and retry
                    if (response.status === 404) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;
                        continue;
                    }
                    throw new Error(`Polling error: ${response.status} ${await response.text()}`);
                }

                const result = await response.json();
                const data = result.data;
                const status = data.status;

                if (status === "completed") {
                    if (data.outputs && data.outputs.length > 0) {
                        return data.outputs[0];
                    } else {
                        throw new Error("Task completed but no output found");
                    }
                } else if (status === "failed") {
                    throw new Error(`Task failed: ${data.error}`);
                }
                // If processing or starting, continue polling
            } catch (error) {
                console.error("Error polling Wavespeed result:", error);
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, 100)); // 0.1s wait
            attempts++;
        }
        throw new Error("Task timed out");
    }

    // Poll that returns ALL outputs (for layered extraction)
    private static async pollForLayeredResult(requestId: string): Promise<string[]> {
        const maxAttempts = 600; // 60 seconds timeout (0.1s * 600)
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(
                    `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
                    {
                        headers: {
                            "Authorization": `Bearer ${import.meta.env.VITE_WAVESPEED_API_KEY}`
                        }
                    }
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;
                        continue;
                    }
                    throw new Error(`Polling error: ${response.status} ${await response.text()}`);
                }

                const result = await response.json();
                const data = result.data;
                const status = data.status;

                if (status === "completed") {
                    if (data.outputs && data.outputs.length > 0) {
                        return data.outputs; // Return ALL outputs
                    } else {
                        throw new Error("Task completed but no output found");
                    }
                } else if (status === "failed") {
                    throw new Error(`Task failed: ${data.error}`);
                }
            } catch (error) {
                console.error("Error polling Wavespeed layered result:", error);
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error("Task timed out");
    }

    static async generateNanoBananaTxt2Img(params: WavespeedTxt2ImgParams): Promise<string> {
        const url = "https://api.wavespeed.ai/api/v3/google/nano-banana-pro/text-to-image";
        const payload = {
            prompt: params.prompt,
            resolution: params.resolution || "1k",
            aspect_ratio: params.aspect_ratio || "1:1",
            output_format: params.output_format || "png",
            enable_sync_mode: params.enable_sync_mode || false,
            enable_base64_output: params.enable_base64_output || false
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${await response.text()}`);
            }

            const result = await response.json();
            const requestId = result.data.id;
            console.log(`Wavespeed Txt2Img Task submitted. ID: ${requestId}`);

            return await this.pollForResult(requestId);
        } catch (error) {
            console.error("Wavespeed Txt2Img error:", error);
            toast.error("Failed to generate image with Wavespeed");
            throw error;
        }
    }

    static async generateNanobananaImg2Imag(params: WavespeedImg2ImgParams): Promise<string> {
        const url = "https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit";
        const payload = {
            images: params.images,
            prompt: params.prompt,
            resolution: params.resolution || "1k",
            aspect_ratio: params.aspect_ratio || "1:1",
            output_format: params.output_format || "png",
            enable_sync_mode: params.enable_sync_mode || false,
            enable_base64_output: params.enable_base64_output || false
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${await response.text()}`);
            }

            const result = await response.json();
            const requestId = result.data.id;
            console.log(`Wavespeed Img2Img Task submitted. ID: ${requestId}`);

            return await this.pollForResult(requestId);
        } catch (error) {
            console.error("Wavespeed Img2Img error:", error);
            toast.error("Failed to edit image with Wavespeed");
            throw error;
        }
    }

    static async generateSeedream45Img2Img(params: { images: string[], prompt: string }): Promise<string> {
        const url = "https://api.wavespeed.ai/api/v3/bytedance/seedream-v4.5/edit";
        const payload = {
            enable_base64_output: false,
            enable_sync_mode: false,
            images: params.images,
            prompt: params.prompt
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${await response.text()}`);
            }

            const result = await response.json();
            const requestId = result.data.id;
            console.log(`Seedream 4.5 Task submitted. ID: ${requestId}`);

            return await this.pollForResult(requestId);
        } catch (error) {
            console.error("Seedream 4.5 edit error:", error);
            toast.error("Failed to edit image with Seedream");
            throw error;
        }
    }
    static async generateVeo3Txt2Video(params: {
        prompt: string;
        resolution?: "720p" | "1080p";
        aspect_ratio?: "16:9" | "9:16";
        duration?: number;
        generate_audio?: boolean;
    }): Promise<string> {
        const url = "https://api.wavespeed.ai/api/v3/google/veo3.1/text-to-video";
        const payload = {
            prompt: params.prompt,
            resolution: params.resolution || "720p",
            aspect_ratio: params.aspect_ratio || "16:9",
            duration: params.duration || 8,
            generate_audio: params.generate_audio !== undefined ? params.generate_audio : true
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${await response.text()}`);
            }

            const result = await response.json();
            const requestId = result.data.id;
            console.log(`Wavespeed Veo3 Txt2Video Task submitted. ID: ${requestId}`);

            return await this.pollForResult(requestId);
        } catch (error) {
            console.error("Wavespeed Veo3 Txt2Video error:", error);
            toast.error("Failed to generate video with Wavespeed");
            throw error;
        }
    }

    static async generateVeo3Img2Video(params: {
        image: string;
        last_image?: string;
        prompt: string;
        resolution?: "720p" | "1080p";
        aspect_ratio?: "16:9" | "9:16";
        duration?: number;
        generate_audio?: boolean;
    }): Promise<string> {
        const url = "https://api.wavespeed.ai/api/v3/google/veo3.1/image-to-video";
        const payload = {
            image: params.image,
            last_image: params.last_image,
            prompt: params.prompt,
            resolution: params.resolution || "720p",
            aspect_ratio: params.aspect_ratio || "16:9",
            duration: params.duration || 8,
            generate_audio: params.generate_audio !== undefined ? params.generate_audio : true
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${await response.text()}`);
            }

            const result = await response.json();
            const requestId = result.data.id;
            console.log(`Wavespeed Veo3 Img2Video Task submitted. ID: ${requestId}`);

            return await this.pollForResult(requestId);
        } catch (error) {
            console.error("Wavespeed Veo3 Img2Video error:", error);
            toast.error("Failed to generate video with Wavespeed");
            throw error;
        }
    }

    // Layered image extraction - returns array of layer URLs
    static async generateQwenLayeredImg2Img(params: WavespeedLayeredParams): Promise<string[]> {
        const url = "https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/layered";
        const payload = {
            enable_base64_output: params.enable_base64_output || false,
            enable_sync_mode: params.enable_sync_mode || false,
            image: params.image,
            num_layers: params.num_layers || 4,
            prompt: params.prompt
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${await response.text()}`);
            }

            const result = await response.json();
            const requestId = result.data.id;
            console.log(`Wavespeed Qwen Layered Task submitted. ID: ${requestId}`);

            return await this.pollForLayeredResult(requestId);
        } catch (error) {
            console.error("Wavespeed Qwen Layered error:", error);
            toast.error("Failed to extract layers with Wavespeed");
            throw error;
        }
    }

    // Qwen Edit 2511 - edit image with prompt
    static async generateQwenEdit2511Img2Img(params: { images: string[], prompt: string }): Promise<string> {
        const url = "https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-2511";
        const payload = {
            images: params.images,
            prompt: params.prompt
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${await response.text()}`);
            }

            const result = await response.json();
            const requestId = result.data.id;
            console.log(`Wavespeed Qwen Edit 2511 Task submitted. ID: ${requestId}`);

            return await this.pollForResult(requestId);
        } catch (error) {
            console.error("Wavespeed Qwen Edit 2511 error:", error);
            toast.error("Failed to edit image with Wavespeed");
            throw error;
        }
    }
}
