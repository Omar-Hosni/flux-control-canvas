import React from 'react';
import { useSceneStore, ShapeType } from '@/stores/sceneStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Box,
    Circle,
    Triangle,
    Hexagon,
    Square,
    Eye,
    EyeOff,
    Trash2,
    Copy,
    Plus,
    Upload,
    ChevronDown,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const shapeIcons: Record<ShapeType, React.ReactNode> = {
    cube: <Box className="w-4 h-4" />,
    sphere: <Circle className="w-4 h-4" />,
    cylinder: <Hexagon className="w-4 h-4" />,
    cone: <Triangle className="w-4 h-4" />,
    torus: <Circle className="w-4 h-4" />,
    plane: <Square className="w-4 h-4" />,
    custom: <Box className="w-4 h-4" />,
};

interface SceneOutlinerProps {
    onAddShape: (type: ShapeType) => void;
    onUploadModel: () => void;
}

export const SceneOutliner: React.FC<SceneOutlinerProps> = ({ onAddShape, onUploadModel }) => {
    const {
        objects,
        selectedObjectId,
        selectObject,
        removeObject,
        duplicateObject,
        updateObject,
    } = useSceneStore();

    return (
        <Card className="w-56 bg-[#1e1e1e] border-border/50 h-full flex flex-col">
            {/* Header */}
            <div className="p-2 border-b border-border/50 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scene</span>
                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-6 h-6">
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => onAddShape('cube')}>
                                <Box className="w-4 h-4 mr-2" />
                                Cube
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddShape('sphere')}>
                                <Circle className="w-4 h-4 mr-2" />
                                Sphere
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddShape('cylinder')}>
                                <Hexagon className="w-4 h-4 mr-2" />
                                Cylinder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddShape('cone')}>
                                <Triangle className="w-4 h-4 mr-2" />
                                Cone
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddShape('torus')}>
                                <Circle className="w-4 h-4 mr-2" />
                                Torus
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddShape('plane')}>
                                <Square className="w-4 h-4 mr-2" />
                                Plane
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onUploadModel}>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Model
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Object List */}
            <ScrollArea className="flex-1">
                <div className="p-1">
                    {objects.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-xs text-muted-foreground">No objects in scene</p>
                            <p className="text-xs text-muted-foreground mt-1">Click + to add shapes</p>
                        </div>
                    ) : (
                        objects.map((obj) => (
                            <div
                                key={obj.id}
                                className={`
                                    flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                                    transition-colors group
                                    ${selectedObjectId === obj.id
                                        ? 'bg-primary/20 text-primary-foreground'
                                        : 'hover:bg-[#2a2a2a] text-foreground'
                                    }
                                `}
                                onClick={() => selectObject(obj.id)}
                            >
                                <span className="text-muted-foreground">
                                    {shapeIcons[obj.type]}
                                </span>
                                <span className="flex-1 text-sm truncate">{obj.name}</span>

                                {/* Quick actions (visible on hover) */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-5 h-5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateObject(obj.id, {
                                                visibility: {
                                                    ...obj.visibility,
                                                    visible: !obj.visibility.visible,
                                                },
                                            });
                                            if (obj.meshRef) {
                                                obj.meshRef.visible = !obj.visibility.visible;
                                            }
                                        }}
                                    >
                                        {obj.visibility.visible ? (
                                            <Eye className="w-3 h-3" />
                                        ) : (
                                            <EyeOff className="w-3 h-3 text-muted-foreground" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-5 h-5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            duplicateObject(obj.id);
                                        }}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-5 h-5 text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeObject(obj.id);
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                    {objects.length} object{objects.length !== 1 ? 's' : ''} in scene
                </p>
            </div>
        </Card>
    );
};
