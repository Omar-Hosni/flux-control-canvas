import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ImageIcon } from 'lucide-react';

interface OutputNodeProps {
  id: string;
  data: {
    label?: string;
    generatedImage?: string;
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  };
}

const getNodeDimensions = (aspectRatio: string = '1:1') => {
  const dimensions: Record<string, { width: number; height: number }> = {
    '1:1': { width: 320, height: 320 },
    '16:9': { width: 480, height: 270 },
    '9:16': { width: 270, height: 480 },
    '4:3': { width: 400, height: 300 },
    '3:4': { width: 300, height: 400 },
  };
  return dimensions[aspectRatio] || dimensions['1:1'];
};

export const OutputNode = memo(({ id, data }: OutputNodeProps) => {
  const dimensions = getNodeDimensions(data.aspectRatio);

  return (
    <>
      {/* Override ALL default ReactFlow styling */}
      <style>{`
        .react-flow__node[data-id="${id}"] {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        .react-flow__node[data-id="${id}"]:hover {
          box-shadow: none !important;
        }
      `}</style>

      <div
        className="relative"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          background: 'transparent',
        }}
      >
        {data.generatedImage ? (
          /* Premium Image Display */
          <div className="w-full h-full relative group">
            <img
              src={data.generatedImage}
              alt="Output"
              className="w-full h-full object-cover rounded-xl shadow-2xl"
              style={{
                borderRadius: '0.75rem',
              }}
            />
            {/* Subtle hover overlay for premium feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
          </div>
        ) : (
          /* Premium Empty State */
          <div
            className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
              borderRadius: '0.75rem',
            }}
          >
            {/* Subtle grid pattern for premium feel */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="p-4 rounded-2xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50">
                <ImageIcon className="w-12 h-12 text-zinc-600" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-zinc-500">Output Preview</p>
            </div>
          </div>
        )}

        {/* Premium Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white hover:!scale-125 !transition-transform !shadow-lg"
        />
      </div>
    </>
  );
});

OutputNode.displayName = 'OutputNode';