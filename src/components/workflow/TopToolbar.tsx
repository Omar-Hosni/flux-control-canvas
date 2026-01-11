import { Square, Circle, Star, Triangle, Frame, Layout, Brush } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopToolbarProps {
    onAddNode: (type: string, data: any) => void;
}

export const TopToolbar = ({ onAddNode }: TopToolbarProps) => {
    const tools = [
        {
            id: 'frame',
            icon: Frame,
            label: 'Frame',
            action: () => onAddNode('frame', { label: 'Frame', width: 400, height: 300, backgroundColor: '#ffffff' })
        },
        {
            id: 'section',
            icon: Layout,
            label: 'Section',
            action: () => onAddNode('section', { label: 'Section', width: 400, height: 300, opacity: 0.1 })
        },
        {
            id: 'square',
            icon: Square,
            label: 'Square',
            action: () => onAddNode('shape', { label: 'Square', shape: 'square', width: 150, height: 150 })
        },
        {
            id: 'circle',
            icon: Circle,
            label: 'Circle',
            action: () => onAddNode('shape', { label: 'Circle', shape: 'circle', width: 150, height: 150 })
        },
        {
            id: 'triangle',
            icon: Triangle,
            label: 'Triangle',
            action: () => onAddNode('shape', { label: 'Triangle', shape: 'triangle', width: 150, height: 150 })
        },
        {
            id: 'star',
            icon: Star,
            label: 'Star',
            action: () => onAddNode('shape', { label: 'Star', shape: 'star', width: 150, height: 150 })
        },
        {
            id: 'brush',
            icon: Brush,
            label: 'Brush',
            action: () => { } // Brush tool activates drawing mode
        },
    ];

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div className="flex items-center gap-1 bg-zinc-900 border-2 border-zinc-800 rounded-xl p-1.5 shadow-2xl backdrop-blur-sm">
                {tools.map((tool) => {
                    const Icon = tool.icon;

                    return (
                        <Button
                            key={tool.id}
                            variant="ghost"
                            size="sm"
                            onClick={tool.action}
                            className="h-9 w-9 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-200"
                            title={tool.label}
                        >
                            <Icon className="w-4 h-4" />
                        </Button>
                    );
                })}
            </div>
        </div>
    );
};
