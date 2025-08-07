import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CONTROL_NET_PREPROCESSORS, type ControlNetPreprocessor } from '@/services/RunwareService';
import { cn } from '@/lib/utils';
import { Zap, Eye, Users, Layers } from 'lucide-react';

interface ControlNetSelectorProps {
  selectedPreprocessor: string | null;
  onPreprocessorSelect: (preprocessor: string) => void;
  onPreprocess: () => void;
  isProcessing: boolean;
  disabled?: boolean;
}

const getPreprocessorIcon = (id: string) => {
  switch (id) {
    case 'canny': return <Zap className="w-5 h-5" />;
    case 'depth': return <Layers className="w-5 h-5" />;
    case 'pose': return <Users className="w-5 h-5" />;
    case 'normal': return <Eye className="w-5 h-5" />;
    default: return <Zap className="w-5 h-5" />;
  }
};

const getPreprocessorColor = (id: string) => {
  switch (id) {
    case 'canny': return 'from-purple-500 to-pink-500';
    case 'depth': return 'from-blue-500 to-cyan-500';
    case 'pose': return 'from-green-500 to-emerald-500';
    case 'normal': return 'from-orange-500 to-yellow-500';
    default: return 'from-purple-500 to-pink-500';
  }
};

export const ControlNetSelector = ({
  selectedPreprocessor,
  onPreprocessorSelect,
  onPreprocess,
  isProcessing,
  disabled = false
}: ControlNetSelectorProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          ControlNet Preprocessor
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose how to process your input image for ControlNet guidance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CONTROL_NET_PREPROCESSORS.map((preprocessor) => (
          <Card
            key={preprocessor.id}
            className={cn(
              "p-4 cursor-pointer transition-all duration-300 hover:shadow-card",
              "bg-ai-surface border-border hover:border-primary/50",
              selectedPreprocessor === preprocessor.preprocessor && 
              "border-primary bg-gradient-glow shadow-ai",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && onPreprocessorSelect(preprocessor.preprocessor)}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-br",
                getPreprocessorColor(preprocessor.id)
              )}>
                {getPreprocessorIcon(preprocessor.id)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground">
                    {preprocessor.name}
                  </h4>
                  {selectedPreprocessor === preprocessor.preprocessor && (
                    <Badge variant="secondary" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {preprocessor.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedPreprocessor && (
        <div className="pt-4 border-t border-border">
          <Button
            variant="ai"
            size="lg"
            onClick={onPreprocess}
            disabled={isProcessing || disabled}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing Image...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Preprocess Image
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};