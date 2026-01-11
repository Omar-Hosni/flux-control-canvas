import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InterpolationCurve, useKeyframeEditingStore } from '@/stores/keyframeEditingStore';
import { evaluateInterpolation, INTERPOLATION_PRESETS } from '@/utils/interpolationUtils';

interface InterpolationGraphEditorProps {
    keyframeId: string | null;
}

export const InterpolationGraphEditor: React.FC<InterpolationGraphEditorProps> = ({ keyframeId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [draggingPoint, setDraggingPoint] = useState<number | null>(null);

    const { keyframes, setInterpolation } = useKeyframeEditingStore();

    const keyframe = keyframes.find(kf => kf.id === keyframeId);
    const curve = keyframe?.interpolation || { type: 'ease-in-out' };

    const CANVAS_WIDTH = 300;
    const CANVAS_HEIGHT = 300;
    const PADDING = 40;
    const GRAPH_WIDTH = CANVAS_WIDTH - 2 * PADDING;
    const GRAPH_HEIGHT = CANVAS_HEIGHT - 2 * PADDING;

    // Convert normalized coordinates (0-1) to canvas coordinates
    const toCanvasX = (x: number) => PADDING + x * GRAPH_WIDTH;
    const toCanvasY = (y: number) => CANVAS_HEIGHT - PADDING - y * GRAPH_HEIGHT;

    // Convert canvas coordinates to normalized (0-1)
    const fromCanvasX = (x: number) => (x - PADDING) / GRAPH_WIDTH;
    const fromCanvasY = (y: number) => (CANVAS_HEIGHT - PADDING - y) / GRAPH_HEIGHT;

    // Draw the graph
    const drawGraph = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Set dark theme colors
        const bgColor = '#18181b';
        const gridColor = '#27272a';
        const axisColor = '#52525b';
        const curveColor = '#3b82f6';
        const controlPointColor = '#8b5cf6';
        const handleColor = '#a855f7';

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const x = PADDING + (i / 4) * GRAPH_WIDTH;
            const y = PADDING + (i / 4) * GRAPH_HEIGHT;

            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(x, PADDING);
            ctx.lineTo(x, CANVAS_HEIGHT - PADDING);
            ctx.stroke();

            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(PADDING, y);
            ctx.lineTo(CANVAS_WIDTH - PADDING, y);
            ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(PADDING, CANVAS_HEIGHT - PADDING);
        ctx.lineTo(CANVAS_WIDTH - PADDING, CANVAS_HEIGHT - PADDING);
        ctx.moveTo(PADDING, PADDING);
        ctx.lineTo(PADDING, CANVAS_HEIGHT - PADDING);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Time', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
        ctx.save();
        ctx.translate(15, CANVAS_HEIGHT / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Value', 0, 0);
        ctx.restore();

        // Draw interpolation curve
        ctx.strokeStyle = curveColor;
        ctx.lineWidth = 3;
        ctx.beginPath();

        const steps = 100;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const value = evaluateInterpolation(t, curve);
            const x = toCanvasX(t);
            const y = toCanvasY(value);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw control points for custom curves
        if (curve.type === 'custom' && curve.controlPoints && curve.controlPoints.length >= 2) {
            const cp1 = curve.controlPoints[0];
            const cp2 = curve.controlPoints[1];

            // Start and end points
            const startX = toCanvasX(0);
            const startY = toCanvasY(0);
            const endX = toCanvasX(1);
            const endY = toCanvasY(1);

            const cp1X = toCanvasX(cp1.x);
            const cp1Y = toCanvasY(cp1.y);
            const cp2X = toCanvasX(cp2.x);
            const cp2Y = toCanvasY(cp2.y);

            // Draw handles (lines from start/end to control points)
            ctx.strokeStyle = handleColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(cp1X, cp1Y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(cp2X, cp2Y);
            ctx.stroke();

            ctx.setLineDash([]);

            // Draw control point circles
            ctx.fillStyle = controlPointColor;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;

            // Control point 1
            ctx.beginPath();
            ctx.arc(cp1X, cp1Y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Control point 2
            ctx.beginPath();
            ctx.arc(cp2X, cp2Y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Draw start and end points
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = curveColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(toCanvasX(0), toCanvasY(0), 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(toCanvasX(1), toCanvasY(1), 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

    }, [curve]);

    useEffect(() => {
        drawGraph();
    }, [drawGraph]);


    // Handle mouse events for dragging control points
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!keyframeId || curve.type !== 'custom' || !curve.controlPoints) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        // Account for canvas scaling - convert from display coords to canvas coords
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Check if clicking on a control point
        const cp1X = toCanvasX(curve.controlPoints[0].x);
        const cp1Y = toCanvasY(curve.controlPoints[0].y);
        const cp2X = toCanvasX(curve.controlPoints[1].x);
        const cp2Y = toCanvasY(curve.controlPoints[1].y);

        const dist1 = Math.sqrt((x - cp1X) ** 2 + (y - cp1Y) ** 2);
        const dist2 = Math.sqrt((x - cp2X) ** 2 + (y - cp2Y) ** 2);

        if (dist1 < 15) {
            setDraggingPoint(0);
        } else if (dist2 < 15) {
            setDraggingPoint(1);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!keyframeId || draggingPoint === null || curve.type !== 'custom' || !curve.controlPoints) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        // Account for canvas scaling - convert from display coords to canvas coords
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const normalizedX = Math.max(0, Math.min(1, fromCanvasX(x)));
        const normalizedY = Math.max(-0.5, Math.min(1.5, fromCanvasY(y))); // Allow some overshoot

        const newControlPoints = [...curve.controlPoints];
        newControlPoints[draggingPoint] = { x: normalizedX, y: normalizedY };

        setInterpolation(keyframeId, {
            type: 'custom',
            controlPoints: newControlPoints
        });
    };

    const handleMouseUp = () => {
        setDraggingPoint(null);
    };

    // Apply preset curves
    const applyPreset = (presetName: string) => {
        if (!keyframeId) return;
        const preset = INTERPOLATION_PRESETS[presetName];
        if (preset) {
            setInterpolation(keyframeId, preset);
        }
    };

    // Switch to custom mode
    const enableCustom = () => {
        if (!keyframeId) return;
        setInterpolation(keyframeId, {
            type: 'custom',
            controlPoints: [
                { x: 0.25, y: 0.1 },
                { x: 0.75, y: 0.9 }
            ]
        });
    };

    if (!keyframeId) {
        return (
            <Card className="p-4 bg-[#1a1a1a] border-border/50">
                <p className="text-sm text-muted-foreground text-center py-8">
                    Select a keyframe to edit interpolation
                </p>
            </Card>
        );
    }

    return (
        <Card className="p-4 bg-[#1a1a1a] border-border/50">
            <div className="space-y-4">
                <div>
                    <Label className="text-sm font-medium">Interpolation</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                        Adjust the curve to control motion speed and rhythm
                    </p>
                </div>

                {/* Preset buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={curve.type === 'linear' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applyPreset('linear')}
                        className="text-xs"
                    >
                        Linear
                    </Button>
                    <Button
                        variant={curve.type === 'ease-in' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applyPreset('easeIn')}
                        className="text-xs"
                    >
                        Ease In
                    </Button>
                    <Button
                        variant={curve.type === 'ease-out' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applyPreset('easeOut')}
                        className="text-xs"
                    >
                        Ease Out
                    </Button>
                    <Button
                        variant={curve.type === 'ease-in-out' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applyPreset('easeInOut')}
                        className="text-xs"
                    >
                        Ease In-Out
                    </Button>
                </div>

                <Button
                    variant={curve.type === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={enableCustom}
                    className="w-full text-xs"
                >
                    Custom Curve
                </Button>

                {/* Graph canvas */}
                <div className="relative bg-[#18181b] rounded-lg border border-border/30 overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="w-full cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </div>

                <div className="text-xs text-muted-foreground">
                    {curve.type === 'custom' ? (
                        <p>Drag control points to adjust the curve</p>
                    ) : (
                        <p>Using {curve.type} interpolation</p>
                    )}
                </div>
            </div>
        </Card>
    );
};
