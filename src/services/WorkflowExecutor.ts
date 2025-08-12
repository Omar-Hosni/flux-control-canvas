import { Node, Edge } from '@xyflow/react';
import { RunwareService } from '@/services/RunwareService';
import { useWorkflowStore } from '@/stores/workflowStore';

export class WorkflowExecutor {
  private runwareService: RunwareService;
  private processedImages: Map<string, string> = new Map();

  constructor(runwareService: RunwareService) {
    this.runwareService = runwareService;
  }

  clearProcessedImages() {
    this.processedImages.clear();
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
      case 'rerendering':
        result = await this.processGeneration(node, inputs);
        break;
      case 'tool':
        result = await this.processTool(node, inputs);
        break;
      case 'engine':
        result = await this.processEngine(node, inputs);
        break;
      case 'gear':
        result = await this.processGear(node, inputs);
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
      // Upload the image file to Runware and persist it for later use
      const uploadedUrl = await this.runwareService.uploadImageForURL(node.data.imageFile as File);
      // Update node data with the uploaded URL for persistence
      useWorkflowStore.getState().updateNodeData(node.id, { imageUrl: uploadedUrl });
      return uploadedUrl;
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
    const { rerenderingType, model, sizeRatio, creativity, strength } = node.data;
    const inputImages = Object.values(inputs).filter(input => input.startsWith('http'));
    const textInputs = Object.values(inputs).filter(input => !input.startsWith('http'));
    const prompt = textInputs[0] || '';
    const useFluxKontextPro = model === 'flux-kontext-pro';

    try {
      switch (rerenderingType) {
        case 'reimagine':
          if (inputImages.length === 0) return null;
          // Re-imagine uses standard generation with seed image, not Flux Kontext Pro
          const reimagineParams: any = {
            positivePrompt: 're-imagine image',
            model: 'runware:101@1', // Use standard Flux Dev model
            seedImage: inputImages[0],
            strength: (strength as number) || 0.6,
            width: 1152,
            height: 896,
            steps: 28,
            CFGScale: 3.5,
            numberResults: 1,
            outputFormat: 'JPEG',
            includeCost: true,
            outputType: ['URL']
          };
          
          const reimagineResult = await this.runwareService.generateImage(reimagineParams);
          return reimagineResult.imageURL;

        case 'reference':
          if (inputImages.length === 0) return null;
          
          // Step 1: Standard generation
          const firstGenParams: any = {
            positivePrompt: prompt || 'generate an image',
            model: 'runware:101@1',
            width: 1152,
            height: 896,
            steps: 28,
            CFGScale: 3.5,
            numberResults: 1,
            outputFormat: 'JPEG',
            includeCost: true,
            outputType: ['URL']
          };
          
          const firstResult = await this.runwareService.generateImage(firstGenParams);
          if (!firstResult.imageURL) return null;
          
          // Step 2: Flux Kontext generation with first output + reference image
          const referenceType = (node.data.referenceType as string) || 'style';
          let secondPrompt = '';
          
          switch (referenceType) {
            case 'style':
              secondPrompt = 'Blend the style of this image with that image';
              break;
            case 'product':
              secondPrompt = 'Use the first output image as the background for this product image';
              break;
            case 'character':
              secondPrompt = 'Make the character\'s face/body match this output image';
              break;
            case 'composition':
              secondPrompt = 'Adapt the design to the first output image and blend it with the input image connected to the reference node';
              break;
            default:
              secondPrompt = 'Blend the style of this image with that image';
          }
          
          const secondGenParams: any = {
            positivePrompt: secondPrompt,
            model: 'bfl:3@1', // Flux Kontext
            width: 1152,
            height: 896,
            numberResults: 1,
            outputFormat: 'JPEG',
            includeCost: true,
            outputType: ['URL'],
            referenceImages: [firstResult.imageURL, inputImages[0]]
          };
          
          const finalResult = await this.runwareService.generateImage(secondGenParams);
          return finalResult.imageURL;

        case 'rescene':
          if (inputImages.length < 2) return null;
          const sceneResult = await this.runwareService.generateReScene(
            inputImages[0], // object
            inputImages[1], // scene
            useFluxKontextPro,
            sizeRatio as string
          );
          return sceneResult.imageURL;

        case 'reangle':
          if (inputImages.length === 0) return null;
          const angleResult = await this.runwareService.generateReAngle(
            inputImages[0],
            (node.data.degrees as number) || 15,
            (node.data.direction as string) || 'right',
            useFluxKontextPro,
            sizeRatio as string
          );
          return angleResult.imageURL;

        case 'remix':
          if (inputImages.length === 0) return null;
          const remixResult = await this.runwareService.generateReMix(
            inputImages,
            useFluxKontextPro,
            sizeRatio as string
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
    const allNodes = useWorkflowStore.getState().nodes;
    const allEdges = useWorkflowStore.getState().edges;
    const nodeMap = new Map(Object.keys(inputs).map(nodeId => [nodeId, allNodes.find(n => n.id === nodeId)]));
    const inputImages = Object.values(inputs).filter(input => input.startsWith('http'));
    const textInputs = Object.values(inputs).filter(input => !input.startsWith('http'));
    
    // Categorize images based on source node types
    const controlNetImages = inputImages.filter(imageUrl => {
      const sourceNodeId = Object.keys(inputs).find(key => inputs[key] === imageUrl);
      const sourceNode = sourceNodeId ? nodeMap.get(sourceNodeId) : null;
      return sourceNode?.type === 'controlNet';
    });
    
    const toolImages = inputImages.filter(imageUrl => {
      const sourceNodeId = Object.keys(inputs).find(key => inputs[key] === imageUrl);
      const sourceNode = sourceNodeId ? nodeMap.get(sourceNodeId) : null;
      return sourceNode?.type === 'tool';
    });
    
    const rerenderingImages = inputImages.filter(imageUrl => {
      const sourceNodeId = Object.keys(inputs).find(key => inputs[key] === imageUrl);
      const sourceNode = sourceNodeId ? nodeMap.get(sourceNodeId) : null;
      return sourceNode?.type === 'rerendering';
    });
    
    const seedImages = inputImages.filter(imageUrl => {
      const sourceNodeId = Object.keys(inputs).find(key => inputs[key] === imageUrl);
      const sourceNode = sourceNodeId ? nodeMap.get(sourceNodeId) : null;
      return sourceNode?.type === 'imageInput';
    });

    // Get connected gear nodes for LoRAs
    const connectedGearEdges = allEdges.filter(edge => edge.target === node.id);
    const gearNodes = connectedGearEdges
      .map(edge => allNodes.find(n => n.id === edge.source))
      .filter(n => n?.type === 'gear');

    const prompt = textInputs[0] || 'generate an image';
    
    // Determine if this is Flux Kontext model
    const modelValue = (node.data.model as string) || 'runware:101@1';
    const isFluxKontext = modelValue === 'runware:502@1';
    
    // Handle Flux Kontext differently - only specific parameters allowed
    if (isFluxKontext) {
      const params: any = {
        positivePrompt: prompt,
        model: 'bfl:3@1',
        width: (node.data.width as number) || 1024,
        height: (node.data.height as number) || 1024,
        numberResults: 1,
        outputFormat: 'JPEG',
        includeCost: true,
        outputType: ['URL']
      };

      // Add reference images if available
      if (seedImages.length > 0) {
        params.referenceImages = seedImages;
      }

      try {
        const result = await this.runwareService.generateImage(params);
        return result.imageURL;
      } catch (error) {
        console.error('Flux Kontext generation failed:', error);
        return null;
      }
    }
    
    // Standard handling for other models
    const params: any = {
      positivePrompt: prompt,
      model: modelValue,
      width: (node.data.width as number) || 1024,
      height: (node.data.height as number) || 1024,
      steps: (node.data.steps as number) || 28,
      CFGScale: (node.data.cfgScale as number) || 3.5,
    };

    // Add LoRAs from connected gear nodes
    const loras = gearNodes.map(gearNode => ({
      model: gearNode!.data.loraModel as string,
      weight: (gearNode!.data.weight as number) || 1.0
    }));
    
    if (loras.length > 0) {
      params.lora = loras;
    }

    // Legacy LoRA support for backward compatibility
    if (node.data.loras && Array.isArray(node.data.loras) && node.data.loras.length > 0) {
      params.lora = [...(params.lora || []), ...node.data.loras];
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

    // Add IP adapters for rerendering images
    if (rerenderingImages.length > 0) {
      params.ipAdapters = rerenderingImages.map((imageUrl, index) => ({
        model: 'runware:105@1',
        guideImage: imageUrl,
        weight: 1.0
      }));
    }

    // Add seed image from rerendering nodes that process images as seed
    if (rerenderingImages.length > 0 && !seedImages.length) {
      params.seedImage = rerenderingImages[0];
      params.strength = (node.data.strength as number) || 0.8;
    }

    // Add seed image from image input nodes
    if (seedImages.length > 0) {
      params.seedImage = seedImages[0];
      params.strength = (node.data.strength as number) || 0.8;
    }

    // Add processed tool images as seed images if no other seed image
    if (toolImages.length > 0 && !seedImages.length) {
      params.seedImage = toolImages[0];
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

  private async processGear(node: Node, inputs: Record<string, string>): Promise<string | null> {
    // Gear nodes don't process images, they just provide LoRA configuration
    // Return a placeholder that indicates this gear is configured
    return `gear:${node.data.loraModel}:${node.data.weight}`;
  }

  private async processOutput(node: Node, inputs: Record<string, string>): Promise<string | null> {
    // Output node just displays the final result
    const imageInput = Object.values(inputs).find(input => input.startsWith('http'));
    return imageInput || null;
  }
}