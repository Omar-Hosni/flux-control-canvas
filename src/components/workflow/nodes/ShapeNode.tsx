import { memo } from 'react';
import { NodeResizer } from '@xyflow/react';

interface ShapeNodeProps {
    id: string;
    data: {
        label: string;
        shape: 'square' | 'circle' | 'triangle' | 'star';
        width?: number;
        height?: number;
    };
    selected?: boolean;
}

export const ShapeNode = memo(({ id, data, selected }: ShapeNodeProps) => {
    const renderShape = () => {
        const size = data.width || 150;

        switch (data.shape) {
            case 'square':
                return (
                    <div
                        className="w-full h-full bg-white border-2 border-zinc-800 rounded-lg"
                        style={{ width: size, height: size }}
                    />
                );

            case 'circle':
                return (
                    <div
                        className="w-full h-full bg-white border-2 border-zinc-800 rounded-full"
                        style={{ width: size, height: size }}
                    />
                );

            case 'triangle':
                return (
                    <div
                        className="relative"
                        style={{ width: size, height: size }}
                    >
                        <svg width="100%" height="100%" viewBox="0 0 100 100">
                            <polygon
                                points="50,10 90,90 10,90"
                                fill="white"
                                stroke="#27272a"
                                strokeWidth="2"
                            />
                        </svg>
                    </div>
                );

            case 'star':
                return (
                    <div
                        className="relative"
                        style={{ width: size, height: size }}
                    >
                        <svg width="100%" height="100%" viewBox="0 0 100 100">
                            <polygon
                                points="50,5 61,35 92,35 68,55 78,85 50,65 22,85 32,55 8,35 39,35"
                                fill="white"
                                stroke="#27272a"
                                strokeWidth="2"
                            />
                        </svg>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            <NodeResizer
                minWidth={50}
                minHeight={50}
                isVisible={selected}
                lineClassName="!border-blue-500"
                handleClassName="!w-3 !h-3 !bg-white !border-2 !border-blue-500"
                keepAspectRatio
            />

            <div className="relative">
                {renderShape()}
            </div>
        </>
    );
});

ShapeNode.displayName = 'ShapeNode';
