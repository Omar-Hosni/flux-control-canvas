import { toast } from "sonner";

const API_ENDPOINT = "wss://ws-api.runware.ai/v1";

export interface IpAdapter {
  model: string;
  guideImage: string;
  weight: number;
}

export interface GenerateImageParams {
  positivePrompt: string;
  negativePrompt?: string;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  CFGScale?: number;
  scheduler?: string;
  strength?: number;
  promptWeighting?: "compel" | "sdEmbeds";
  seed?: number | null;
  lora?: Array<{
    model: string;
    weight: number;
  }>;
  width?: number;
  height?: number;
  steps?: number;
  // Extended parameters
  vae?: string;
  clipSkip?: number;
  maskImage?: string;
  maskMargin?: number;
  // Advanced features
  advancedFeatures?: {
    layerDiffuse?: boolean;
    hiresfix?: boolean;
  };
  // Extended accelerator options
  acceleratorOptions?: {
    teaCache?: boolean;
    teaCacheDistance?: number;
    fbCache?: boolean;
    fbCacheThreshold?: number;
    deepCache?: boolean;
    deepCacheInterval?: number;
    deepCacheBranchId?: number;
    cacheStartStep?: number;
    cacheStartStepPercentage?: number;
    cacheEndStep?: number;
    cacheEndStepPercentage?: number;
    cacheMaxConsecutiveSteps?: number;
  };
  controlNet?: Array<{
    model: string;
    guideImage: string;
    weight?: number;
    startStep?: number;
    startStepPercentage?: number;
    endStep?: number;
    endStepPercentage?: number;
    controlMode?: "balanced" | "prompt" | "controlnet";
  }>;
  seedImage?: string;
  ipAdapters?: IpAdapter[];
  referenceImages?: string[];
}

export interface FluxKontextParams {
  positivePrompt: string;
  referenceImages: string[];
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  CFGScale?: number;
  width?: number;
  height?: number;
  steps?: number;
  sizeRatio?: string;
  lora?: Array<{
    model: string;
    weight: number;
  }>;
}

export interface ImageToImageParams {
  positivePrompt: string;
  inputImage: string;
  strength: number;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  width?: number;
  height?: number;
  steps?: number;
  CFGScale?: number;
  scheduler?: string;
}

export interface GeneratedImage {
  imageURL: string;
  positivePrompt: string;
  seed: number;
  NSFWContent: boolean;
  cost?: number;
}

export interface PreprocessedImage {
  imageURL: string;
  preprocessor: string;
}

export interface ControlNetPreprocessor {
  id: string;
  name: string;
  description: string;
  taskType: string;
  preprocessor: string;
}

export interface RemoveBackgroundParams {
  inputImage: string;
  outputFormat?: string;
}

export interface UpscaleParams {
  inputImage: string;
  upscaleFactor: 2 | 3 | 4;
  outputFormat?: string;
}

export interface InpaintParams {
  seedImage: string;
  maskImage: string;
  positivePrompt: string;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  width?: number;
  height?: number;
  steps?: number;
  CFGScale?: number;
}

export interface OutpaintParams {
  seedImage: string;
  positivePrompt: string;
  width: number;
  height: number;
  strength: number;
  outpaint: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  steps?: number;
  CFGScale?: number;
}

export interface ProcessedImageResult {
  imageURL: string;
  taskType: string;
  cost?: number;
}

export interface ModelUploadCheckpointParams {
  taskUUID?: string;
  category: "checkpoint";
  architecture: string;
  format: string;
  air: string;
  uniqueIdentifier: string;
  name: string;
  version: string;
  downloadURL: string;
  defaultWeight: number;
  private: boolean;
  heroImageURL: string;
  tags: string[];
  positiveTriggerWords: string;
  shortDescription: string;
  comment: string;
}

export interface ModelUploadLoraParams {
  taskUUID?: string;
  category: "lora";
  architecture: string;
  format: string;
  air: string;
  uniqueIdentifier: string;
  name: string;
  version: string;
  downloadURL: string;
  defaultWeight: number;
  private: boolean;
  heroImageURL: string;
  tags: string[];
  positiveTriggerWords: string;
  shortDescription: string;
  comment: string;
}

export interface ModelUploadControlNetParams {
  taskUUID?: string;
  category: "controlnet";
  architecture: string;
  conditioning: string;
  format: string;
  air: string;
  uniqueIdentifier: string;
  name: string;
  version: string;
  downloadUrl: string;
  private: boolean;
  heroImageUrl: string;
  tags: string[];
  shortDescription: string;
  comment: string;
}

export interface ControlNetPreprocessParams {
  inputImage: string;
  preProcessorType: string;
  height?: number;
  width?: number;
  outputType?: string[];
  outputFormat?: string;
  includeCost?: boolean;
}

export type ModelUploadParams = ModelUploadCheckpointParams | ModelUploadLoraParams | ModelUploadControlNetParams;

export interface ModelUploadResult {
  taskType: string;
  taskUUID: string;
  success: boolean;
  message?: string;
}

export interface CaptionParams {
  taskType: "caption";
  taskUUID: string;
  inputImage: string;
  model: string;
  prompt?: string;
}

export interface TranscriptionParams {
  taskType: "transcription";
  taskUUID: string;
  model: string;
  inputs: {
    video: string;
  };
}

export interface CaptionResult {
  taskType: string;
  taskUUID: string;
  caption?: string;
  text?: string;
  cost?: number;
}

export interface VideoInferenceParams {
  positivePrompt?: string;
  negativePrompt?: string;
  model: string;
  steps?: number;
  CFGScale?: number;
  scheduler?: string;
  seed?: number;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  numberResults?: number;
  outputFormat?: "MP4" | "WEBM" | "MOV";
  outputType?: "URL"[];
  outputQuality?: number;
  inputImage?: string;
  referenceImages?: string[];
  inputAudios?: string[];
  referenceVideos?: string[];
  frameImages?: string[];
  lora?: Array<{
    model: string;
    weight: number;
    transformer?: "high" | "low" | "both";
  }>;
}

export interface ImageMaskingParams {
  inputImage: string;
  model: string;  // runware:35@X variants
  confidence?: number;  // 0-1, detection threshold
  maxDetections?: number;  // limit number of detections
  maskPadding?: number;  // pixels to extend/shrink mask
  maskBlur?: number;  // pixels for blur fade effect
  outputFormat?: "PNG" | "JPG" | "WEBP";
  outputType?: ("URL" | "dataURI" | "base64Data")[];
}

export interface ImageMaskingResult {
  taskType: string;
  taskUUID: string;
  inputImageUUID?: string;
  maskImageURL?: string;
  maskImageDataURI?: string;
  maskImageBase64Data?: string;
  maskImageUUID?: string;
  detections: Array<{
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  }>;
  cost?: number;
}

export interface VideoInferenceResult {
  taskType: string;
  taskUUID: string;
  videoUUID: string;
  videoURL: string;
  seed: number;
  cost?: number;
}

export interface VectorizeParams {
  inputImage: string;
  model: "recraft:1@1" | "picsart:1@1";
  outputFormat?: "SVG";
  outputType?: "URL" | "base64Data" | "dataURI";
}

export interface VectorizeResult {
  taskType: string;
  taskUUID: string;
  imageUUID: string;
  imageURL?: string;
  imageBase64Data?: string;
  imageDataURI?: string;
  cost?: number;
}

export class RunwareService {
  private ws: WebSocket | null = null;
  private apiKey: string | null = null;
  private connectionSessionUUID: string | null = null;
  private messageCallbacks: Map<string, (data: any) => void> = new Map();
  private isAuthenticated: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private authFailed: boolean = false;
  private hasShownAuthError: boolean = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.connectionPromise = this.connect();
  }

  private connect(): Promise<void> {
    // Don't reconnect if auth has failed
    if (this.authFailed) {
      return Promise.reject(new Error("Authentication failed - invalid API key"));
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(API_ENDPOINT);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.authenticate().then(resolve).catch(reject);
      };

      this.ws.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        const response = JSON.parse(event.data);

        if (response.error || response.errors) {
          console.error("WebSocket error response:", response);
          const errorMessage = response.errorMessage || response.errors?.[0]?.message || "An error occurred";

          // Check if this is an authentication error
          const isAuthError = response.errors?.some((e: any) =>
            e.code === "invalidApiKey" || e.taskType === "authentication"
          );

          if (isAuthError) {
            this.authFailed = true;
            // Only show auth error once to prevent spam
            if (!this.hasShownAuthError) {
              this.hasShownAuthError = true;
              toast.error("Invalid API key. Please check your API key and refresh the page.");
            }
            return;
          }

          toast.error(errorMessage);

          // Reject any pending promises for this error
          if (response.errors && Array.isArray(response.errors)) {
            response.errors.forEach((error: any) => {
              if (error.taskUUID && error.taskUUID !== "N/A") {
                const callback = this.messageCallbacks.get(error.taskUUID);
                if (callback) {
                  callback({ error: true, errorMessage: error.message });
                  this.messageCallbacks.delete(error.taskUUID);
                }
              }
            });
          }

          // If no specific taskUUID, reject the most recent callback as fallback
          if (this.messageCallbacks.size > 0) {
            const lastKey = Array.from(this.messageCallbacks.keys()).pop();
            if (lastKey) {
              const callback = this.messageCallbacks.get(lastKey);
              if (callback) {
                callback({ error: true, errorMessage });
                this.messageCallbacks.delete(lastKey);
              }
            }
          }
          return;
        }

        if (response.data) {
          response.data.forEach((item: any) => {
            if (item.taskType === "authentication") {
              console.log("Authentication successful, session UUID:", item.connectionSessionUUID);
              this.connectionSessionUUID = item.connectionSessionUUID;
              this.isAuthenticated = true;
              this.authFailed = false;
            } else {
              const callback = this.messageCallbacks.get(item.taskUUID);
              if (callback) {
                callback(item);
                this.messageCallbacks.delete(item.taskUUID);
              }
            }
          });
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (!this.authFailed) {
          toast.error("Connection error. Please try again.");
        }
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed");
        this.isAuthenticated = false;
        // Only reconnect if auth didn't fail
        if (!this.authFailed) {
          console.log("Attempting to reconnect...");
          setTimeout(() => {
            this.connectionPromise = this.connect();
          }, 1000);
        }
      };
    });
  }

  private authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not ready for authentication"));
        return;
      }

      const authMessage = [{
        taskType: "authentication",
        apiKey: this.apiKey,
        ...(this.connectionSessionUUID && { connectionSessionUUID: this.connectionSessionUUID }),
      }];

      console.log("Sending authentication message");

      const authCallback = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.data?.[0]?.taskType === "authentication") {
          this.ws?.removeEventListener("message", authCallback);
          resolve();
        }
      };

      this.ws.addEventListener("message", authCallback);
      this.ws.send(JSON.stringify(authMessage));
    });
  }

  async preprocessImage(imageFile: File, preprocessor: string): Promise<PreprocessedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    // First upload the image
    const uploadedImageUrl = await this.uploadImageForURL(imageFile);

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageControlNetPreProcess",
        taskUUID,
        inputImage: uploadedImageUrl,
        preProcessorType: preprocessor,
        outputType: ["URL"],
        outputFormat: "PNG"
      }];

      console.log("Sending preprocessing message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            imageURL: data.guideImageURL || data.guideImageUUID,
            preprocessor
          });
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  async preprocessControlNet(params: ControlNetPreprocessParams): Promise<PreprocessedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageControlNetPreProcess",
        taskUUID,
        inputImage: params.inputImage,
        preProcessorType: params.preProcessorType,
        ...(params.height && { height: params.height }),
        ...(params.width && { width: params.width }),
        outputType: params.outputType || ["URL"],
        outputFormat: params.outputFormat || "WEBP",
        ...(params.includeCost !== undefined && { includeCost: params.includeCost })
      }];

      console.log("Sending ControlNet preprocessing message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            imageURL: data.guideImageURL || data.guideImageUUID,
            preprocessor: params.preProcessorType
          });
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }


  // Upload image and get UUID for upscaling operations
  async uploadImage(imageFile: File): Promise<string> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;

        const message = [{
          taskType: "imageUpload",
          taskUUID,
          image: dataUri, // Send the full data URI including the data:image/... prefix
          outputType: "UUID"
        }];

        console.log("Sending image upload message for UUID");

        this.messageCallbacks.set(taskUUID, (data) => {
          if (data.error) {
            reject(new Error(data.errorMessage));
          } else {
            console.log("Upload response:", data);
            // Return UUID for upscaling operations
            resolve(data.imageUUID);
          }
        });

        this.ws.send(JSON.stringify(message));
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(imageFile);
    });
  }

  // Upload image and get URL for other operations
  async uploadImageForURL(imageFile: File): Promise<string> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;

        const message = [{
          taskType: "imageUpload",
          taskUUID,
          image: dataUri, // Send the full data URI including the data:image/... prefix
          outputType: "URL"
        }];

        console.log("Sending image upload message for URL");

        this.messageCallbacks.set(taskUUID, (data) => {
          if (data.error) {
            reject(new Error(data.errorMessage));
          } else {
            // Return URL for other operations
            resolve(data.imageURL);
          }
        });

        this.ws.send(JSON.stringify(message));
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(imageFile);
    });
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message: any = [{
        taskType: "imageInference",
        taskUUID,
        model: params.model || "runware:100@1",
        width: params.width || 1024,
        height: params.height || 1024,
        numberResults: params.numberResults || 1,
        outputFormat: params.outputFormat || "WEBP",
        includeCost: true,
        outputType: ["URL"],
        positivePrompt: params.positivePrompt,
        ...(params.negativePrompt && { negativePrompt: params.negativePrompt }),
        ...(params.acceleratorOptions && { acceleratorOptions: params.acceleratorOptions }),
        ...(params.controlNet && { controlNet: params.controlNet }),
        ...(params.seedImage && { seedImage: params.seedImage }),
        ...(params.strength && { strength: params.strength }),
        ...(params.ipAdapters && { ipAdapters: params.ipAdapters }),
        ...(params.referenceImages && { referenceImages: params.referenceImages }),
        // Extended parameters
        ...(params.vae && { vae: params.vae }),
        ...(params.clipSkip !== undefined && { clipSkip: params.clipSkip }),
        ...(params.maskImage && { maskImage: params.maskImage }),
        ...(params.maskMargin !== undefined && { maskMargin: params.maskMargin }),
        ...(params.promptWeighting && { promptWeighting: params.promptWeighting }),
        ...(params.seed !== undefined && params.seed !== null && { seed: params.seed }),
        ...(params.advancedFeatures && { advancedFeatures: params.advancedFeatures }),
      }];

      // Only add these parameters if they exist in the original params
      // Do NOT add defaults - let the API use its own defaults
      if (params.steps !== undefined) {
        message[0].steps = params.steps;
      }

      if (params.CFGScale !== undefined) {
        message[0].CFGScale = params.CFGScale;
      }

      if (params.scheduler !== undefined) {
        message[0].scheduler = params.scheduler;
      }

      if (params.lora !== undefined) {
        message[0].lora = params.lora;
      }

      console.log("Sending image generation message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Image-to-Image generation (re-imagine)
  async generateImageToImage(params: ImageToImageParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageInference",
        taskUUID,
        model: params.model || "runware:101@1",
        numberResults: params.numberResults || 1,
        outputFormat: params.outputFormat || "JPEG",
        width: params.width || 1024,
        height: params.height || 1024,
        steps: params.steps || 28,
        CFGScale: params.CFGScale || 3.5,
        scheduler: params.scheduler || "FlowMatchEulerDiscreteScheduler",
        includeCost: true,
        outputType: ["URL"],
        positivePrompt: params.positivePrompt,
        inputImage: params.inputImage,
        strength: params.strength
      }];

      console.log("Sending image-to-image generation message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Flux Kontext generation
  async generateFluxKontext(params: FluxKontextParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message: any = [{
        taskType: "imageInference",
        taskUUID,
        model: params.model || "runware:106@1", // Updated Flux Kontext model
        numberResults: params.numberResults || 1,
        outputFormat: params.outputFormat || "JPEG",
        steps: params.steps || 28,
        CFGScale: params.CFGScale || 2.5,
        scheduler: "Default",
        includeCost: true,
        outputType: ["dataURI", "URL"],
        positivePrompt: params.positivePrompt,
        referenceImages: params.referenceImages, // Use referenceImages instead of inputImages
        outputQuality: 85,
        advancedFeatures: {
          guidanceEndStepPercentage: 75
        }
      }];

      // Only add LoRA if it exists and has valid models
      if (params.lora && params.lora.length > 0) {
        const validLoras = params.lora.filter(lora => lora.model && lora.model.trim() !== '');
        if (validLoras.length > 0) {
          message[0].lora = validLoras;
        }
      }

      console.log("Sending Flux Kontext generation message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Flux Kontext Pro generation with size ratios
  async generateFluxKontextPro(params: FluxKontextParams & { sizeRatio?: string }): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    // Map size ratios to dimensions
    const sizeMap: Record<string, { width: number; height: number }> = {
      "1:1": { width: 1024, height: 1024 },
      "21:9": { width: 1568, height: 672 },
      "16:9": { width: 1344, height: 768 },
      "4:3": { width: 1152, height: 896 },
      "3:2": { width: 1216, height: 832 }
    };

    const dimensions = params.sizeRatio ? sizeMap[params.sizeRatio] : { width: 1024, height: 1024 };

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message: any = [{
        taskType: "imageInference",
        taskUUID,
        model: "bfl:3@1", // Flux Kontext Pro model
        numberResults: params.numberResults || 1,
        outputFormat: params.outputFormat || "JPEG",
        width: params.width || dimensions.width,
        height: params.height || dimensions.height,
        includeCost: true,
        outputType: ["dataURI", "URL"],
        positivePrompt: params.positivePrompt,
        referenceImages: params.referenceImages,
        outputQuality: 85,
        advancedFeatures: {
          guidanceEndStepPercentage: 75
        }
      }];

      // Only add LoRA if it exists and has valid models
      if (params.lora && params.lora.length > 0) {
        const validLoras = params.lora.filter(lora => lora.model && lora.model.trim() !== '');
        if (validLoras.length > 0) {
          message[0].lora = validLoras;
        }
      }

      console.log("Sending Flux Kontext Pro generation message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Background removal
  async removeBackground(params: RemoveBackgroundParams): Promise<ProcessedImageResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageBackgroundRemoval",
        taskUUID,
        model: "runware:110@1",
        inputImage: params.inputImage,
        outputFormat: params.outputFormat || "PNG",
        outputType: ["URL"]
      }];

      console.log("Sending background removal message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            imageURL: data.imageURL,
            taskType: "imageBackgroundRemoval",
            cost: data.cost
          });
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Image upscaling 
  async upscaleImage(params: UpscaleParams): Promise<ProcessedImageResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageUpscale",
        taskUUID,
        inputImage: params.inputImage, // This should be a UUID from uploadImage
        upscaleFactor: params.upscaleFactor,
        outputFormat: params.outputFormat || "JPG",
        outputType: ["URL"]
      }];

      console.log("Sending upscale message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            imageURL: data.imageURL,
            taskType: "imageUpscale",
            cost: data.cost
          });
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Image inpainting
  async inpaintImage(params: InpaintParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageInference",
        taskUUID,
        model: params.model || "runware:100@1",
        outputFormat: params.outputFormat || "JPEG",
        width: params.width || 1024,
        height: params.height || 1024,
        steps: params.steps || 28,
        CFGScale: params.CFGScale || 3.5,
        includeCost: true,
        outputType: ["URL"],
        positivePrompt: params.positivePrompt,
        seedImage: params.seedImage, // Use seedImage instead of inputImage
        maskImage: params.maskImage
      }];

      console.log("Sending inpainting message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Image outpainting
  async outpaintImage(params: OutpaintParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageInference",
        taskUUID,
        model: params.model || "runware:102@1",
        outputFormat: params.outputFormat || "JPEG",
        steps: params.steps || 40,
        CFGScale: params.CFGScale || 3.5,
        includeCost: true,
        outputType: ["URL"],
        positivePrompt: params.positivePrompt || "__BLANK__",
        seedImage: params.seedImage,
        width: params.width,
        height: params.height,
        strength: params.strength || 0.9,
        outpaint: params.outpaint
      }];

      console.log("Sending outpainting message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Specialized Flux Kontext methods for different node types

  // Reference node: apply changes based on reference type
  async generateReference(inputImage: string, prompt: string, referenceType: string, useFluxKontextPro: boolean = false, sizeRatio?: string, lora?: Array<{ model: string; weight: number }>): Promise<GeneratedImage> {
    const enhancedPrompt = `Apply ${referenceType} reference: ${prompt}`;
    if (useFluxKontextPro) {
      return this.generateFluxKontextPro({
        positivePrompt: enhancedPrompt,
        referenceImages: [inputImage],
        sizeRatio,
        lora
      });
    } else {
      return this.generateFluxKontext({
        positivePrompt: enhancedPrompt,
        referenceImages: [inputImage],
        lora
      });
    }
  }

  // Re-scene node: blend object with scene (takes two images)
  async generateReScene(objectImage: string, sceneImage: string, useFluxKontextPro: boolean = false, sizeRatio?: string, lora?: Array<{ model: string; weight: number }>): Promise<GeneratedImage> {
    const prompt = "Blend this object into this scene while maintaining all details and realistic lighting";
    if (useFluxKontextPro) {
      return this.generateFluxKontextPro({
        positivePrompt: prompt,
        referenceImages: [objectImage, sceneImage],
        sizeRatio,
        lora
      });
    } else {
      return this.generateFluxKontext({
        positivePrompt: prompt,
        referenceImages: [objectImage, sceneImage],
        lora
      });
    }
  }

  // Re-angle node: change camera angle
  async generateReAngle(inputImage: string, degrees: number, direction: string, useFluxKontextPro: boolean = false, sizeRatio?: string, lora?: Array<{ model: string; weight: number }>): Promise<GeneratedImage> {
    const prompt = `Change camera angle of this image by ${degrees} degrees to ${direction} direction`;
    if (useFluxKontextPro) {
      return this.generateFluxKontextPro({
        positivePrompt: prompt,
        referenceImages: [inputImage],
        sizeRatio,
        lora
      });
    } else {
      return this.generateFluxKontext({
        positivePrompt: prompt,
        referenceImages: [inputImage],
        lora
      });
    }
  }

  // Re-mix node: blend multiple images using ipadapters
  async generateReMix(inputImages: string[], useFluxKontextPro: boolean = false, sizeRatio?: string, lora?: Array<{ model: string; weight: number }>): Promise<GeneratedImage> {
    const prompt = "Creatively blend and remix these images into a cohesive composition";
    if (useFluxKontextPro) {
      return this.generateFluxKontextPro({
        positivePrompt: prompt,
        referenceImages: inputImages,
        sizeRatio,
        lora
      });
    } else {
      return this.generateFluxKontext({
        positivePrompt: prompt,
        referenceImages: inputImages,
        lora
      });
    }
  }

  // Re-imagine: transform uploaded image based on prompt
  async generateReImagine(inputImage: string, prompt: string, useFluxKontextPro: boolean = false, sizeRatio?: string, creativity?: number, lora?: Array<{ model: string; weight: number }>): Promise<GeneratedImage> {
    if (useFluxKontextPro) {
      return this.generateFluxKontextPro({
        positivePrompt: prompt,
        referenceImages: [inputImage],
        sizeRatio,
        lora
      });
    } else {
      return this.generateFluxKontext({
        positivePrompt: prompt,
        referenceImages: [inputImage],
        lora
      });
    }
  }

  // Model upload
  async uploadModel(params: ModelUploadParams): Promise<ModelUploadResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const { taskUUID: _, ...paramsWithoutTaskUUID } = params as any;

      const message = [{
        taskType: "modelUpload",
        taskUUID,
        ...paramsWithoutTaskUUID
      }];

      console.log("Sending model upload message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            taskType: data.taskType,
            taskUUID: data.taskUUID,
            success: true,
            message: data.message || "Model uploaded successfully"
          });
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Image caption generation
  async generateCaption(params: CaptionParams): Promise<CaptionResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    return new Promise((resolve, reject) => {
      const message = [params];

      console.log("Sending caption generation message:", message);

      this.messageCallbacks.set(params.taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            taskType: data.taskType,
            taskUUID: data.taskUUID,
            caption: data.caption,
            text: data.text,
            cost: data.cost
          });
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Video transcription
  async generateTranscription(params: TranscriptionParams): Promise<CaptionResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    return new Promise((resolve, reject) => {
      const message = [params];

      console.log("Sending transcription generation message:", message);

      this.messageCallbacks.set(params.taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            taskType: data.taskType,
            taskUUID: data.taskUUID,
            caption: data.caption,
            text: data.text,
            cost: data.cost
          });
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Video Generation
  async generateVideo(params: VideoInferenceParams): Promise<VideoInferenceResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message: any = [{
        taskType: "videoInference",
        taskUUID,
        model: params.model,
        outputType: params.outputType || ["URL"],
        outputFormat: params.outputFormat || "MP4",
        includeCost: true,
        ...(params.positivePrompt && { positivePrompt: params.positivePrompt }),
        ...(params.negativePrompt && { negativePrompt: params.negativePrompt }),
        ...(params.width && { width: params.width }),
        ...(params.height && { height: params.height }),
        ...(params.steps && { steps: params.steps }),
        ...(params.CFGScale && { CFGScale: params.CFGScale }),
        ...(params.scheduler && { scheduler: params.scheduler }),
        ...(params.seed && { seed: params.seed }),
        ...(params.duration && { duration: params.duration }),
        ...(params.fps && { fps: params.fps }),
        ...(params.numberResults && { numberResults: params.numberResults }),
        ...(params.outputQuality && { outputQuality: params.outputQuality }),
        ...(params.referenceImages && { referenceImages: params.referenceImages }),
        ...(params.inputAudios && { inputAudios: params.inputAudios }),
        ...(params.referenceVideos && { referenceVideos: params.referenceVideos }),
        ...(params.frameImages && { frameImages: params.frameImages }),
        ...(params.lora && { lora: params.lora }),
      }];

      // Handle Image-to-Video (Runware often uses referenceImages or frameImages depending on model)
      if (params.inputImage && !params.referenceImages && !params.frameImages) {
        message[0].referenceImages = [params.inputImage];
      }

      console.log("Sending video generation message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Image masking - generates masks for faces, hands, and people
  async generateImageMask(params: ImageMaskingParams): Promise<ImageMaskingResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageMasking",
        taskUUID,
        inputImage: params.inputImage,
        model: params.model,
        ...(params.confidence !== undefined && { confidence: params.confidence }),
        ...(params.maxDetections !== undefined && { maxDetections: params.maxDetections }),
        ...(params.maskPadding !== undefined && { maskPadding: params.maskPadding }),
        ...(params.maskBlur !== undefined && { maskBlur: params.maskBlur }),
        outputFormat: params.outputFormat || "PNG",
        outputType: params.outputType || ["URL"],
        includeCost: true
      }];

      console.log("Sending image masking message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            taskType: data.taskType,
            taskUUID: data.taskUUID,
            inputImageUUID: data.inputImageUUID,
            maskImageURL: data.maskImageURL,
            maskImageDataURI: data.maskImageDataURI,
            maskImageBase64Data: data.maskImageBase64Data,
            maskImageUUID: data.maskImageUUID,
            detections: data.detections || [],
            cost: data.cost
          });
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Image Vectorization - converts raster images to SVG
  async vectorizeImage(params: VectorizeParams): Promise<VectorizeResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "vectorize",
        taskUUID,
        model: params.model,
        outputType: params.outputType || "URL",
        outputFormat: params.outputFormat || "SVG",
        includeCost: true,
        inputs: {
          image: params.inputImage
        }
      }];

      console.log("Sending vectorize message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  // Live Light Edit - uses prunaai:2@1 model with correct API format
  async prepareLiveLightEdit(params: {
    referenceImage: string;
    positivePrompt: string;
    turbo?: boolean;
  }): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageInference",
        taskUUID,
        model: "prunaai:2@1",
        numberResults: 1,
        outputFormat: "JPEG",
        includeCost: true,
        outputType: ["URL"],
        positivePrompt: params.positivePrompt,
        inputs: {
          referenceImages: [params.referenceImage]
        },
        safety: {
          checkContent: false
        },
        providerSettings: {
          prunaai: {
            turbo: params.turbo !== false // default to true
          }
        }
      }];

      console.log("Sending Live Light edit message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }
}

export const CONTROL_NET_PREPROCESSORS: ControlNetPreprocessor[] = [
  {
    id: "canny",
    name: "Canny Edge",
    description: "Detects edges in the image",
    taskType: "imageControlNetPreProcess",
    preprocessor: "canny"
  },
  {
    id: "depth",
    name: "Depth Map",
    description: "Creates a depth map of the image",
    taskType: "imageControlNetPreProcess",
    preprocessor: "depth"
  },
  {
    id: "pose",
    name: "Human Pose",
    description: "Detects human poses and body structure",
    taskType: "imageControlNetPreProcess",
    preprocessor: "openpose"
  },
  {
    id: "normal",
    name: "Normal Map",
    description: "Generates surface normal information",
    taskType: "imageControlNetPreProcess",
    preprocessor: "normalbae"
  },
  {
    id: "segments",
    name: "Segmentation",
    description: "Segments objects in the image",
    taskType: "imageControlNetPreProcess",
    preprocessor: "seg"
  }
];