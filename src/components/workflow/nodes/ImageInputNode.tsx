import { memo, useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image, Upload, X } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';

interface ImageInputNodeProps {
  id: string;
  data: {
    label: string;
    imageUrl: string | null;
    imageType?: 'object' | 'scene' | 'fuse';
  };
}

export const ImageInputNode = memo(({ id, data }: ImageInputNodeProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(data.imageUrl);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      handleFileSelect(imageFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
      // Store the file for workflow execution
      const { updateNodeData } = useWorkflowStore.getState();
      updateNodeData(id, { imageFile: file });
    }
  };

  const clearImage = () => {
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="min-w-64 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded bg-gradient-to-br from-blue-500 to-cyan-500">
          <Image className="w-3 h-3 text-white" />
        </div>
        <div className="flex flex-col flex-1">
          <h3 className="text-sm font-medium text-foreground">{data.label}</h3>
          {data.imageType && (
            <span className="text-xs text-muted-foreground capitalize">
              {data.imageType} image
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {imageUrl ? (
          <div className="relative">
            <img 
              src={imageUrl} 
              alt="Input" 
              className="w-full h-32 object-cover rounded-lg border border-border"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 w-6 h-6 p-0"
              onClick={clearImage}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors duration-200 hover:border-primary/50 hover:bg-gradient-glow/50
              ${isDragOver ? 'border-primary bg-gradient-glow/50' : 'border-border'}
            `}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop image here or click to upload
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
      />
    </Card>
  );
});

ImageInputNode.displayName = 'ImageInputNode';