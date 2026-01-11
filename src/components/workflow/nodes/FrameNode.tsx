import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

interface FrameNodeProps {
    id: string;
    data: {
        label: string;
        width?: number;
        height?: number;
        backgroundColor?: string;
    };
    selected?: boolean;
}

export const FrameNode = memo(({ id, data, selected }: FrameNodeProps) => {
    return (
        <>
            <NodeResizer
                minWidth={200}
                minHeight={150}
                isVisible={selected}
                lineClassName="!border-blue-500"
                handleClassName="!w-3 !h-3 !bg-white !border-2 !border-blue-500"
            />

            <div
                className="w-full h-full relative rounded-lg border-2 transition-all"
                style={{
                    backgroundColor: data.backgroundColor || '#ffffff',
                    borderColor: selected ? '#3b82f6' : '#e5e7eb',
                    minWidth: `${data.width || 400}px`,
                    minHeight: `${data.height || 300}px`,
                }}
            >
                {/* Frame Label */}
                <div className="absolute -top-6 left-0 px-2 py-0.5 bg-zinc-900 text-white text-xs rounded">
                    {data.label}
                </div>
            </div>
        </>
    );
});

FrameNode.displayName = 'FrameNode';
