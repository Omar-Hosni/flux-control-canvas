import { MousePointer2, Hand, Pencil, Lasso } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BottomToolbarProps {
    activeTool: 'cursor' | 'hand' | 'draw' | 'lasso';
    onToolChange: (tool: 'cursor' | 'hand' | 'draw' | 'lasso') => void;
}

export const BottomToolbar = ({ activeTool, onToolChange }: BottomToolbarProps) => {
    const tools = [
        { id: 'cursor' as const, icon: MousePointer2, label: 'Select (V)' },
        { id: 'hand' as const, icon: Hand, label: 'Pan (H)' },
        { id: 'draw' as const, icon: Pencil, label: 'Draw (D)' },
        { id: 'lasso' as const, icon: Lasso, label: 'Lasso (L)' },
    ];

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div className="flex items-center gap-1 bg-zinc-900 border-2 border-zinc-800 rounded-xl p-1.5 shadow-2xl backdrop-blur-sm">
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;

                    return (
                        <Button
                            key={tool.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => onToolChange(tool.id)}
                            className={`
                h-9 w-9 p-0 transition-all duration-200
                ${isActive
                                    ? 'bg-white text-black hover:bg-white hover:text-black'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }
              `}
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
