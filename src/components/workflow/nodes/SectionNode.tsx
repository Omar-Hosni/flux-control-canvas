import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

interface SectionNodeProps {
    id: string;
    data: {
        label: string;
        width?: number;
        height?: number;
        opacity?: number;
    };
    selected?: boolean;
}

export const SectionNode = memo(({ id, data, selected }: SectionNodeProps) => {
    return (
        <>
            <NodeResizer
                minWidth={200}
                minHeight={150}
                isVisible={selected}
                lineClassName="!border-blue-500 !border-dashed"
                handleClassName="!w-3 !h-3 !bg-white !border-2 !border-blue-500"
            />

            <div
                className="w-full h-full relative rounded-lg border-2 border-dashed transition-all"
                style={{
                    backgroundColor: `rgba(255, 255, 255, ${data.opacity || 0.05})`,
                    borderColor: selected ? '#3b82f6' : '#52525b',
                    minWidth: `${data.width || 400}px`,
                    minHeight: `${data.height || 300}px`,
                }}
            >
                {/* Section Label */}
                <div className="absolute -top-6 left-0 px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded border border-zinc-700">
                    {data.label}
                </div>
            </div>
        </>
    );
});

SectionNode.displayName = 'SectionNode';
