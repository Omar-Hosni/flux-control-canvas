import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

interface ImageTypeSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: 'object' | 'scene' | 'fuse') => void;
}

export const ImageTypeSelectionDialog = memo(({ isOpen, onOpenChange, onSelect }: ImageTypeSelectionDialogProps) => {
  const handleSelect = (type: 'object' | 'scene' | 'fuse') => {
    onSelect(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-ai-surface border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Select Image Type</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Choose the type of image for this re-scene connection:
          </p>
          <Button
            onClick={() => handleSelect('object')}
            variant="outline"
            className="justify-start h-auto p-4"
          >
            <div className="text-left">
              <div className="font-medium">Object Image</div>
              <div className="text-xs text-muted-foreground">The object to be placed in the scene</div>
            </div>
          </Button>
          <Button
            onClick={() => handleSelect('scene')}
            variant="outline"
            className="justify-start h-auto p-4"
          >
            <div className="text-left">
              <div className="font-medium">Scene Image</div>
              <div className="text-xs text-muted-foreground">The background scene for the object</div>
            </div>
          </Button>
          <Button
            onClick={() => handleSelect('fuse')}
            variant="outline"
            className="justify-start h-auto p-4"
          >
            <div className="text-left">
              <div className="font-medium">Fuse Image</div>
              <div className="text-xs text-muted-foreground">Image containing both object and scene to separate</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ImageTypeSelectionDialog.displayName = 'ImageTypeSelectionDialog';