import { Node, Edge } from '@xyflow/react';
import { RunwareService } from '@/services/RunwareService';
import { useWorkflowStore } from '@/stores/workflowStore';

export class WorkflowExecutor {
  private runwareService: RunwareService;
  private processedImages: Map<string, string> = new Map();

  constructor(runwareService: RunwareService) {
    this.runwareService = runwareService;
  }

  async executeWorkflow(nodes: Node[], edges: Edge[], targetNodeId: string): Promise<string | null> {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const edgeMap = new Map<string, Edge[]>();
    
    // Build edge map for quick lookup
    edges.forEach(edge => {
      if (!edgeMap.has(edge.target)) {
        edgeMap.set(edge.target, []);
      }
      edgeMap.get(edge.target)!.push(edge);
    });

    // Execute nodes in dependency order
    return await this.executeNode(targetNodeId, nodeMap, edgeMap);
  }

  private async executeNode(nodeId: string, nodeMap: Map<string, Node>, edgeMap: Map<string, Edge[]>): Promise<string | null> {
    if (this.processedImages.has(nodeId)) {
      return this.processedImages.get(nodeId)!;
    }

    const node = nodeMap.get(nodeId);
    if (!node) return null;

    // Get input edges for this node
    const inputEdges = edgeMap.get(nodeId) || [];
    const inputs: Record<string, string> = {};

    // Process all input nodes first
    for (const edge of inputEdges) {
      const inputResult = await this.executeNode(edge.source, nodeMap, edgeMap);
      if (inputResult) {
        inputs[edge.source] = inputResult;
      }
    }

    // Execute the current node based on its type
    let result: string | null = null;

    switch (node.type) {
      case 'imageInput':
        result = await this.processImageInput(node);
        break;
      case 'textInput':
        result = (node.data.prompt as string) || '';
        break;
      case 'controlNet':
        result = await this.processControlNet(node, inputs);
        break;
      case 'processing':
        result = await this.processGeneration(node, inputs);
        break;
      case 'tool':
        result = await this.processTool(node, inputs);
        break;
      case 'engine':
        result = await this.processEngine(node, inputs);
        break;
      case 'output':
        result = await this.processOutput(node, inputs);
        break;
      default:
        console.warn(`Unknown node type: ${node.type}`);
    }

    if (result) {
      this.processedImages.set(nodeId, result);
      useWorkflowStore.getState().setProcessedImage(nodeId, result);
    }

    return result;
  }

  private async processImageInput(node: Node): Promise<string | null> {
    if (node.data.imageFile) {
      // Upload the image file and return the URL
      return await this.runwareService.uploadImage(node.data.imageFile as File);
    }
    return (node.data.imageUrl as string) || null;
  }

  private async processControlNet(node: Node, inputs: Record<string, string>): Promise<string | null> {
    const inputImageUrl = Object.values(inputs)[0];
    if (!inputImageUrl) return null;

    try {
      // Create a temporary file object from URL for preprocessing
      const response = await fetch(inputImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'input.jpg', { type: 'image/jpeg' });
      
      const result = await this.runwareService.preprocessImage(file, node.data.preprocessor as string);
      return result.imageURL;
    } catch (error) {
      console.error('ControlNet processing failed:', error);
      return null;
    }
  }

  private async processGeneration(node: Node, inputs: Record<string, string>): Promise<string | null> {
    const { processingType } = node.data;
    const inputImages = Object.values(inputs).filter(input => input.startsWith('http'));
    const textInputs = Object.values(inputs).filter(input => !input.startsWith('http'));
    const prompt = textInputs[0] || '';

    try {
      switch (processingType) {
        case 'reimagine':
          if (inputImages.length === 0) return null;
          const result = await this.runwareService.generateImageToImage({
            positivePrompt: prompt || 'reimagine this image',
            inputImage: inputImages[0],
            strength: (node.data.creativity as number) || 0.8
          });
          return result.imageURL;

        case 'reference':
          if (inputImages.length === 0) return null;
          const referencePrompt = `Apply ${(node.data.referenceType as string) || 'style'} reference: ${prompt}`;
          const refResult = await this.runwareService.generateReference(
            inputImages[0], 
            referencePrompt, 
            (node.data.referenceType as string) || 'style'
          );
          return refResult.imageURL;

        case 'rescene':
          if (inputImages.length < 2) return null;
          const sceneResult = await this.runwareService.generateReScene(
            inputImages[0], // object
            inputImages[1]  // scene
          );
          return sceneResult.imageURL;

        case 'reangle':
          if (inputImages.length === 0) return null;
          const angleResult = await this.runwareService.generateReAngle(
            inputImages[0],
            (node.data.degrees as number) || 15,
            (node.data.direction as string) || 'right'
          );
          return angleResult.imageURL;

        case 'remix':
          if (inputImages.length === 0) return null;
          const remixResult = await this.runwareService.generateReMix(
            inputImages,
            false // useFluxKontextPro parameter
          );
          return remixResult.imageURL;

        default:
          return null;
      }
    } catch (error) {
      console.error('Generation processing failed:', error);
      return null;
    }
  }

  private async processTool(node: Node, inputs: Record<string, string>): Promise<string | null> {
    const { toolType } = node.data;
    const inputImageUrl = Object.values(inputs).find(input => input.startsWith('http'));
    if (!inputImageUrl) return null;

    try {
      switch (toolType) {
        case 'removebg':
          const bgResult = await this.runwareService.removeBackground({
            inputImage: inputImageUrl
          });
          return bgResult.imageURL;

        case 'upscale':
          const upscaleResult = await this.runwareService.upscaleImage({
            inputImage: inputImageUrl,
            upscaleFactor: ((node.data.upscaleFactor as number) || 2) as 2 | 3 | 4
          });
          return upscaleResult.imageURL;

        case 'inpaint':
          if (!node.data.maskImage) return null;
          const inpaintResult = await this.runwareService.inpaintImage({
            seedImage: inputImageUrl,
            maskImage: node.data.maskImage as string,
            positivePrompt: (node.data.inpaintPrompt as string) || 'fill the masked area naturally'
          });
          return inpaintResult.imageURL;

        case 'outpaint':
          const outpaintResult = await this.runwareService.outpaintImage({
            inputImage: inputImageUrl,
            positivePrompt: (node.data.outpaintPrompt as string) || 'extend the image naturally',
            outpaintDirection: (node.data.outpaintDirection as 'up' | 'down' | 'left' | 'right' | 'all') || 'all',
            outpaintAmount: (node.data.outpaintAmount as number) || 50
          });
          return outpaintResult.imageURL;

        default:
          return null;
      }
    } catch (error) {
      console.error('Tool processing failed:', error);
      return null;
    }
  }

  private async processEngine(node: Node, inputs: Record<string, string>): Promise<string | null> {
    const inputImages = Object.values(inputs).filter(input => input.startsWith('http'));
    const textInputs = Object.values(inputs).filter(input => !input.startsWith('http'));
    const controlNetImages = inputImages.filter(imageUrl => {
      // Check if this image came from a ControlNet node
      const sourceNodeId = Object.keys(inputs).find(key => inputs[key] === imageUrl);
      return sourceNodeId ? sourceNodeId.includes('controlNet') : false;
    });

    const prompt = textInputs[0] || 'generate an image';
    
    // Build generation parameters
    const params: any = {
      positivePrompt: prompt,
      model: (node.data.model as string) || 'runware:101@1',
      width: (node.data.width as number) || 1024,
      height: (node.data.height as number) || 1024,
      steps: (node.data.steps as number) || 28,
      CFGScale: (node.data.cfgScale as number) || 3.5,
    };

    // Add LoRA if specified
    if (node.data.loras && Array.isArray(node.data.loras) && node.data.loras.length > 0) {
      params.lora = node.data.loras;
    }

    // Add ControlNet if available
    if (controlNetImages.length > 0) {
      params.controlNet = controlNetImages.map((imageUrl, index) => ({
        model: 'runware:29@1',
        guideImage: imageUrl,
        weight: 1,
        startStep: 1,
        endStep: Math.max(1, (params.steps || 28) - 1),
        controlMode: 'balanced'
      }));
    }

    // Add seed image if available
    if (inputImages.length > 0 && !controlNetImages.includes(inputImages[0])) {
      params.inputImage = inputImages[0];
      params.strength = (node.data.strength as number) || 0.8;
    }

    try {
      const result = await this.runwareService.generateImage(params);
      return result.imageURL;
    } catch (error) {
      console.error('Engine processing failed:', error);
      return null;
    }
  }

  private async processOutput(node: Node, inputs: Record<string, string>): Promise<string | null> {
    // Output node just displays the final result
    const imageInput = Object.values(inputs).find(input => input.startsWith('http'));
    return imageInput || null;
  }
}