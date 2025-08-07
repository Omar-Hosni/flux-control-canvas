import { toast } from "sonner";

const API_ENDPOINT = "wss://ws-api.runware.ai/v1";
const DEFAULT_API_KEY = "J9GGKxXu8hDhbW1mXOPaNHBH8S48QnhT";

export interface ControlNetPreprocessor {
  id: string;
  name: string;
  description: string;
  taskType: "imageControlnetPreprocessor";
  preprocessor: string;
}

export interface GenerateImageParams {
  positivePrompt: string;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  width?: number;
  height?: number;
  steps?: number;
  CFGScale?: number;
  scheduler?: string;
  controlNet?: Array<{
    model: string;
    guideImage: string;
    weight: number;
    startStep: number;
    endStep: number;
    controlMode: string;
  }>;
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

export class RunwareService {
  private ws: WebSocket | null = null;
  private apiKey: string | null = null;
  private connectionSessionUUID: string | null = null;
  private messageCallbacks: Map<string, (data: any) => void> = new Map();
  private isAuthenticated: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.connectionPromise = this.connect();
  }

  private connect(): Promise<void> {
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
          toast.error(errorMessage);
          return;
        }

        if (response.data) {
          response.data.forEach((item: any) => {
            if (item.taskType === "authentication") {
              console.log("Authentication successful, session UUID:", item.connectionSessionUUID);
              this.connectionSessionUUID = item.connectionSessionUUID;
              this.isAuthenticated = true;
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
        toast.error("Connection error. Please try again.");
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed, attempting to reconnect...");
        this.isAuthenticated = false;
        setTimeout(() => {
          this.connectionPromise = this.connect();
        }, 1000);
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
    const uploadedImageUrl = await this.uploadImage(imageFile);
    
    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageControlnetPreprocessor",
        taskUUID,
        inputImage: uploadedImageUrl,
        preprocessor,
        outputType: ["URL"],
        outputFormat: "PNG"
      }];

      console.log("Sending preprocessing message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            imageURL: data.imageURL,
            preprocessor
          });
        }
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  async uploadImage(imageFile: File): Promise<string> {
    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        
        const message = [{
          taskType: "imageUpload",
          taskUUID,
          image: base64Data
        }];

        this.messageCallbacks.set(taskUUID, (data) => {
          if (data.error) {
            reject(new Error(data.errorMessage));
          } else {
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
        ...(params.controlNet && { controlNet: params.controlNet })
      }];

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

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const CONTROL_NET_PREPROCESSORS: ControlNetPreprocessor[] = [
  {
    id: "canny",
    name: "Canny Edge",
    description: "Detects edges in the image",
    taskType: "imageControlnetPreprocessor",
    preprocessor: "canny"
  },
  {
    id: "depth",
    name: "Depth Map", 
    description: "Creates a depth map of the image",
    taskType: "imageControlnetPreprocessor",
    preprocessor: "depth"
  },
  {
    id: "pose",
    name: "Human Pose",
    description: "Detects human poses and body structure",
    taskType: "imageControlnetPreprocessor", 
    preprocessor: "openpose"
  },
  {
    id: "normal",
    name: "Normal Map",
    description: "Generates surface normal information",
    taskType: "imageControlnetPreprocessor",
    preprocessor: "normal"
  }
];