import React, { useCallback } from 'react';
import { useSceneStore, ShapeType, GizmoMode } from '@/stores/sceneStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Move,
    RotateCw,
    Maximize2,
    ChevronDown,
    ChevronRight,
    Eye,
    EyeOff,
    Trash2,
    Copy,
    Box,
    Circle,
    Triangle,
    Hexagon,
    Square,
} from 'lucide-react';
import * as THREE from 'three';

interface Vector3InputProps {
    label: string;
    value: { x: number; y: number; z: number };
    onChange: (value: { x: number; y: number; z: number }) => void;
    step?: number;
}

const Vector3Input: React.FC<Vector3InputProps> = ({ label, value, onChange, step = 0.1 }) => {
    const handleChange = (axis: 'x' | 'y' | 'z', val: string) => {
        const num = parseFloat(val) || 0;
        onChange({ ...value, [axis]: num });
    };

    return (
        <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="flex gap-1">
                <div className="flex-1 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-red-400 font-medium">X</span>
                    <Input
                        type="number"
                        value={value.x}
                        onChange={(e) => handleChange('x', e.target.value)}
                        step={step}
                        className="h-7 text-xs pl-6 bg-[#2a2a2a] border-border/50"
                    />
                </div>
                <div className="flex-1 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-green-400 font-medium">Y</span>
                    <Input
                        type="number"
                        value={value.y}
                        onChange={(e) => handleChange('y', e.target.value)}
                        step={step}
                        className="h-7 text-xs pl-6 bg-[#2a2a2a] border-border/50"
                    />
                </div>
                <div className="flex-1 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 font-medium">Z</span>
                    <Input
                        type="number"
                        value={value.z}
                        onChange={(e) => handleChange('z', e.target.value)}
                        step={step}
                        className="h-7 text-xs pl-6 bg-[#2a2a2a] border-border/50"
                    />
                </div>
            </div>
        </div>
    );
};

interface SectionProps {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, defaultOpen = true, children }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-1 hover:bg-[#2a2a2a] rounded transition-colors">
                <span className="text-xs font-medium text-foreground">{title}</span>
                {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-1 pb-3">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
};

const shapeIcons: Record<ShapeType, React.ReactNode> = {
    cube: <Box className="w-4 h-4" />,
    sphere: <Circle className="w-4 h-4" />,
    cylinder: <Hexagon className="w-4 h-4" />,
    cone: <Triangle className="w-4 h-4" />,
    torus: <Circle className="w-4 h-4" />,
    plane: <Square className="w-4 h-4" />,
    custom: <Box className="w-4 h-4" />,
};

interface ObjectPropertyPanelProps {
    onApplyAnimation?: (type: 'spin' | 'bounce' | 'float') => void;
}

export const ObjectPropertyPanel: React.FC<ObjectPropertyPanelProps> = ({ onApplyAnimation }) => {
    const {
        objects,
        selectedObjectId,
        gizmoMode,
        snapToGrid,
        updateObject,
        removeObject,
        duplicateObject,
        setGizmoMode,
        toggleSnapToGrid,
        getSelectedObject,
    } = useSceneStore();

    const selectedObject = getSelectedObject();

    const handlePositionChange = useCallback((position: { x: number; y: number; z: number }) => {
        if (!selectedObjectId) return;
        updateObject(selectedObjectId, { position });

        // Also update the mesh position
        const obj = objects.find(o => o.id === selectedObjectId);
        if (obj?.meshRef) {
            obj.meshRef.position.set(position.x, position.y, position.z);
        }
    }, [selectedObjectId, updateObject, objects]);

    const handleRotationChange = useCallback((rotation: { x: number; y: number; z: number }) => {
        if (!selectedObjectId) return;
        updateObject(selectedObjectId, { rotation });

        // Also update the mesh rotation (convert degrees to radians)
        const obj = objects.find(o => o.id === selectedObjectId);
        if (obj?.meshRef) {
            obj.meshRef.rotation.set(
                THREE.MathUtils.degToRad(rotation.x),
                THREE.MathUtils.degToRad(rotation.y),
                THREE.MathUtils.degToRad(rotation.z)
            );
        }
    }, [selectedObjectId, updateObject, objects]);

    const handleScaleChange = useCallback((scale: { x: number; y: number; z: number }) => {
        if (!selectedObjectId) return;
        updateObject(selectedObjectId, { scale });

        // Also update the mesh scale
        const obj = objects.find(o => o.id === selectedObjectId);
        if (obj?.meshRef) {
            obj.meshRef.scale.set(scale.x, scale.y, scale.z);
        }
    }, [selectedObjectId, updateObject, objects]);

    const handleMaterialChange = useCallback((updates: Partial<typeof selectedObject.material>) => {
        if (!selectedObjectId || !selectedObject) return;
        updateObject(selectedObjectId, {
            material: { ...selectedObject.material, ...updates },
        });

        // Update the mesh material
        const obj = objects.find(o => o.id === selectedObjectId);
        if (obj?.meshRef && 'material' in obj.meshRef) {
            const mesh = obj.meshRef as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (updates.color) mat.color.set(updates.color);
            if (updates.roughness !== undefined) mat.roughness = updates.roughness;
            if (updates.metalness !== undefined) mat.metalness = updates.metalness;
            if (updates.opacity !== undefined) {
                mat.opacity = updates.opacity;
                mat.transparent = updates.opacity < 1;
            }
        }
    }, [selectedObjectId, selectedObject, updateObject, objects]);

    const handleVisibilityChange = useCallback((updates: Partial<typeof selectedObject.visibility>) => {
        if (!selectedObjectId || !selectedObject) return;
        updateObject(selectedObjectId, {
            visibility: { ...selectedObject.visibility, ...updates },
        });

        // Update the mesh visibility
        const obj = objects.find(o => o.id === selectedObjectId);
        if (obj?.meshRef) {
            if (updates.visible !== undefined) obj.meshRef.visible = updates.visible;
            if (updates.castShadow !== undefined) obj.meshRef.castShadow = updates.castShadow;
            if (updates.receiveShadow !== undefined) obj.meshRef.receiveShadow = updates.receiveShadow;

            if ('material' in obj.meshRef && updates.wireframe !== undefined) {
                const mesh = obj.meshRef as THREE.Mesh;
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.wireframe = updates.wireframe;
            }
        }
    }, [selectedObjectId, selectedObject, updateObject, objects]);

    if (!selectedObject) {
        return (
            <Card className="w-full bg-[#1e1e1e] border-border/50 h-full">
                <div className="p-4 flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground text-center">
                        Select an object to view properties
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="w-full bg-[#1e1e1e] border-border/50 h-full flex flex-col">
            {/* Header */}
            <div className="p-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {shapeIcons[selectedObject.type]}
                        <span className="text-sm font-medium truncate">{selectedObject.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6"
                            onClick={() => duplicateObject(selectedObject.id)}
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 text-destructive hover:text-destructive"
                            onClick={() => removeObject(selectedObject.id)}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-1">
                    {/* Gizmo Mode */}
                    <Section title="Transform Mode" defaultOpen={true}>
                        <div className="flex gap-1 mt-2">
                            <Button
                                variant={gizmoMode === 'translate' ? 'default' : 'outline'}
                                size="sm"
                                className="flex-1 h-8"
                                onClick={() => setGizmoMode('translate')}
                            >
                                <Move className="w-3.5 h-3.5 mr-1" />
                                Move
                            </Button>
                            <Button
                                variant={gizmoMode === 'rotate' ? 'default' : 'outline'}
                                size="sm"
                                className="flex-1 h-8"
                                onClick={() => setGizmoMode('rotate')}
                            >
                                <RotateCw className="w-3.5 h-3.5 mr-1" />
                                Rotate
                            </Button>
                            <Button
                                variant={gizmoMode === 'scale' ? 'default' : 'outline'}
                                size="sm"
                                className="flex-1 h-8"
                                onClick={() => setGizmoMode('scale')}
                            >
                                <Maximize2 className="w-3.5 h-3.5 mr-1" />
                                Scale
                            </Button>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                            <Label className="text-xs text-muted-foreground">Snap to Grid</Label>
                            <Switch checked={snapToGrid} onCheckedChange={toggleSnapToGrid} />
                        </div>
                    </Section>

                    <Separator className="bg-border/30" />

                    {/* Transform */}
                    <Section title="Transform" defaultOpen={true}>
                        <div className="space-y-3 mt-2">
                            <Vector3Input
                                label="Position"
                                value={selectedObject.position}
                                onChange={handlePositionChange}
                                step={0.1}
                            />
                            <Vector3Input
                                label="Rotation (degrees)"
                                value={selectedObject.rotation}
                                onChange={handleRotationChange}
                                step={5}
                            />
                            <Vector3Input
                                label="Scale"
                                value={selectedObject.scale}
                                onChange={handleScaleChange}
                                step={0.1}
                            />
                        </div>
                    </Section>

                    <Separator className="bg-border/30" />

                    {/* Shape */}
                    <Section title="Shape" defaultOpen={false}>
                        <div className="mt-2">
                            <Label className="text-xs text-muted-foreground">Type</Label>
                            <Select value={selectedObject.type} disabled>
                                <SelectTrigger className="h-8 mt-1 bg-[#2a2a2a] border-border/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cube">Cube</SelectItem>
                                    <SelectItem value="sphere">Sphere</SelectItem>
                                    <SelectItem value="cylinder">Cylinder</SelectItem>
                                    <SelectItem value="cone">Cone</SelectItem>
                                    <SelectItem value="torus">Torus</SelectItem>
                                    <SelectItem value="plane">Plane</SelectItem>
                                    <SelectItem value="custom">Custom Model</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </Section>

                    <Separator className="bg-border/30" />

                    {/* Material */}
                    <Section title="Material" defaultOpen={true}>
                        <div className="space-y-3 mt-2">
                            <div>
                                <Label className="text-xs text-muted-foreground">Color</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={selectedObject.material.color}
                                        onChange={(e) => handleMaterialChange({ color: e.target.value })}
                                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                                    />
                                    <Input
                                        value={selectedObject.material.color}
                                        onChange={(e) => handleMaterialChange({ color: e.target.value })}
                                        className="h-7 text-xs bg-[#2a2a2a] border-border/50 font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between">
                                    <Label className="text-xs text-muted-foreground">Roughness</Label>
                                    <span className="text-xs text-muted-foreground">{selectedObject.material.roughness.toFixed(2)}</span>
                                </div>
                                <Slider
                                    value={[selectedObject.material.roughness]}
                                    onValueChange={([v]) => handleMaterialChange({ roughness: v })}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between">
                                    <Label className="text-xs text-muted-foreground">Metalness</Label>
                                    <span className="text-xs text-muted-foreground">{selectedObject.material.metalness.toFixed(2)}</span>
                                </div>
                                <Slider
                                    value={[selectedObject.material.metalness]}
                                    onValueChange={([v]) => handleMaterialChange({ metalness: v })}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between">
                                    <Label className="text-xs text-muted-foreground">Opacity</Label>
                                    <span className="text-xs text-muted-foreground">{selectedObject.material.opacity.toFixed(2)}</span>
                                </div>
                                <Slider
                                    value={[selectedObject.material.opacity]}
                                    onValueChange={([v]) => handleMaterialChange({ opacity: v })}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </Section>

                    <Separator className="bg-border/30" />

                    {/* Visibility */}
                    <Section title="Visibility" defaultOpen={true}>
                        <div className="space-y-3 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {selectedObject.visibility.visible ? (
                                        <Eye className="w-3.5 h-3.5" />
                                    ) : (
                                        <EyeOff className="w-3.5 h-3.5" />
                                    )}
                                    <Label className="text-xs">Visible</Label>
                                </div>
                                <Switch
                                    checked={selectedObject.visibility.visible}
                                    onCheckedChange={(checked) => handleVisibilityChange({ visible: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Wireframe</Label>
                                <Switch
                                    checked={selectedObject.visibility.wireframe}
                                    onCheckedChange={(checked) => handleVisibilityChange({ wireframe: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Cast Shadow</Label>
                                <Switch
                                    checked={selectedObject.visibility.castShadow}
                                    onCheckedChange={(checked) => handleVisibilityChange({ castShadow: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Receive Shadow</Label>
                                <Switch
                                    checked={selectedObject.visibility.receiveShadow}
                                    onCheckedChange={(checked) => handleVisibilityChange({ receiveShadow: checked })}
                                />
                            </div>
                        </div>
                    </Section>

                    <Separator className="bg-border/30" />

                    {/* Animation Templates */}
                    <Section title="Animation" defaultOpen={false}>
                        <div className="space-y-2 mt-2">
                            <Label className="text-xs text-muted-foreground">Quick Animations</Label>
                            <div className="grid grid-cols-3 gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => onApplyAnimation?.('spin')}
                                >
                                    Spin
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => onApplyAnimation?.('bounce')}
                                >
                                    Bounce
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => onApplyAnimation?.('float')}
                                >
                                    Float
                                </Button>
                            </div>
                        </div>
                    </Section>
                </div>
            </ScrollArea>
        </Card>
    );
};
