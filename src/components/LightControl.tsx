import React, { useRef, useState, useEffect, memo } from 'react';

export interface LightSource {
    id: number;
    position: { x: number; y: number };
    circleAmount: number;
    size: number;
    color: string;      // "#rrggbb"
    power: number;      // 0–1
    rotation: number;   // radians
    intensity: number;  // 0–1
}

interface LightControlProps {
    lightSpec: LightSource;
    onChange: (updates: Partial<LightSource>) => void;
    isSelected: boolean;
    onSelect: () => void;
    onSelectOther?: (id: number) => void;
    otherLights?: LightSource[];
    onAddLight?: () => void;
}

export const renderLightToPNG = (lightSpec: LightSource, size = 1024): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }

        // Black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, size, size);

        // Calculate layout
        const centerX = lightSpec.position.x * size;
        const centerY = lightSpec.position.y * size;
        const circleAmount = lightSpec.circleAmount || 0.25;
        const lightSize = lightSpec.size || 0.5;
        const color = lightSpec.color || '#ffffff';
        const power = lightSpec.power !== undefined ? lightSpec.power : 1.0;
        const rotation = lightSpec.rotation !== undefined ? lightSpec.rotation : 0;
        const angle = circleAmount * Math.PI * 2;
        const rotationAngle = rotation * Math.PI * 2;
        const radius = Math.max(size, size) * lightSize;

        // Colors
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Global settings
        ctx.globalAlpha = power;
        ctx.globalCompositeOperation = 'screen';

        // Helper for gradients
        const drawLayer = (blur: number, opacity: number, radiusScale: number = 1.0) => {
            ctx.filter = `blur(${blur}px)`;
            const layerRadius = radius * radiusScale;
            const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, layerRadius);
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, layerRadius, -Math.PI / 2 - angle / 2 + rotationAngle, -Math.PI / 2 + angle / 2 + rotationAngle);
            ctx.closePath();
            ctx.fill();
        };

        // Draw standard layers
        drawLayer(8, 0.8);
        drawLayer(16, 0.5);
        drawLayer(25, 0.7);
        drawLayer(47, 0.5);

        // complex conic logic here, copying drawLight logic...
        // For renderLightToPNG, we use the user's provided logic which is more extensive.
        // Actually, to avoid code duplication, we could isolate the "draw single light" logic.
        // But for now, let's keep renderLightToPNG standalone as requested.

        // Fifth layer: Conic gradient (top layer) - 6px blur, screen blend mode
        ctx.filter = 'blur(6px)';
        ctx.globalCompositeOperation = 'screen';

        const spreadAngle = circleAmount * Math.PI * 1.4;
        const baseLeftSpan = 0.1321 - 0.0349;
        const baseRightSpan = 0.9680 - 0.8693;
        const scaleFactor = Math.max(0.3, circleAmount * 4);
        const leftSpan = baseLeftSpan * scaleFactor;
        const rightSpan = baseRightSpan * scaleFactor;
        const leftGroupAngleSpan = leftSpan * Math.PI * 2;
        const rightGroupAngleSpan = rightSpan * Math.PI * 2;

        const leftGroupStops = [
            { pos: 0.0349, color: [43, 6, 214, 0] },
            { pos: 0.0518, color: [45, 6, 213, 255] },
            { pos: 0.0694, color: [1, 183, 253, 255] },
            { pos: 0.0858, color: [17, 249, 145, 255] },
            { pos: 0.1007, color: [206, 252, 1, 255] },
            { pos: 0.1137, color: [255, 13, 0, 255] },
            { pos: 0.1321, color: [255, 13, 0, 0] }
        ];

        const rightGroupStops = [
            { pos: 0.8693, color: [255, 13, 0, 0] },
            { pos: 0.8858, color: [255, 13, 0, 255] },
            { pos: 0.8995, color: [206, 252, 1, 255] },
            { pos: 0.9156, color: [17, 249, 145, 255] },
            { pos: 0.9322, color: [1, 183, 253, 255] },
            { pos: 0.9511, color: [3, 5, 255, 255] },
            { pos: 0.9680, color: [6, 5, 251, 0] }
        ];

        const segments = 180;
        for (let i = 0; i < segments; i++) {
            const segmentAngle = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const startAngle = segmentAngle + rotationAngle;
            const endAngle = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2 + rotationAngle;

            let color1 = null;
            const leftGroupCenter = -Math.PI / 2 - spreadAngle / 2;
            const leftGroupStart = leftGroupCenter - leftGroupAngleSpan / 2;
            const leftGroupEnd = leftGroupCenter + leftGroupAngleSpan / 2;

            const normalizeAngle = (angle: number) => {
                while (angle < -Math.PI) angle += Math.PI * 2;
                while (angle > Math.PI) angle -= Math.PI * 2;
                return angle;
            };

            const normSegmentAngle = normalizeAngle(segmentAngle);
            const normLeftStart = normalizeAngle(leftGroupStart);
            const normLeftEnd = normalizeAngle(leftGroupEnd);
            let inLeftGroup = false;

            if (normLeftStart <= normLeftEnd) {
                inLeftGroup = normSegmentAngle >= normLeftStart && normSegmentAngle <= normLeftEnd;
            } else {
                inLeftGroup = normSegmentAngle >= normLeftStart || normSegmentAngle <= normLeftEnd;
            }

            if (inLeftGroup) {
                let normalizedPos;
                if (normLeftStart <= normLeftEnd) {
                    normalizedPos = (normSegmentAngle - normLeftStart) / leftGroupAngleSpan;
                } else {
                    if (normSegmentAngle >= normLeftStart) {
                        normalizedPos = (normSegmentAngle - normLeftStart) / leftGroupAngleSpan;
                    } else {
                        normalizedPos = (normSegmentAngle + Math.PI * 2 - normLeftStart) / leftGroupAngleSpan;
                    }
                }
                const mappedPos = 0.8693 + normalizedPos * baseRightSpan;
                for (let j = 0; j < rightGroupStops.length - 1; j++) {
                    if (mappedPos >= rightGroupStops[j].pos && mappedPos <= rightGroupStops[j + 1].pos) {
                        const t = (mappedPos - rightGroupStops[j].pos) / (rightGroupStops[j + 1].pos - rightGroupStops[j].pos);
                        const c1 = rightGroupStops[j].color;
                        const c2 = rightGroupStops[j + 1].color;
                        color1 = [
                            Math.round(c1[0] + (c2[0] - c1[0]) * t),
                            Math.round(c1[1] + (c2[1] - c1[1]) * t),
                            Math.round(c1[2] + (c2[2] - c1[2]) * t),
                            Math.round(c1[3] + (c2[3] - c1[3]) * t)
                        ];
                        break;
                    }
                }
            }

            const rightGroupCenter = -Math.PI / 2 + spreadAngle / 2;
            const rightGroupStart = rightGroupCenter - rightGroupAngleSpan / 2;
            const rightGroupEnd = rightGroupCenter + rightGroupAngleSpan / 2;

            if (segmentAngle >= rightGroupStart && segmentAngle <= rightGroupEnd) {
                const normalizedPos = (segmentAngle - rightGroupStart) / rightGroupAngleSpan;
                const mappedPos = 0.0349 + normalizedPos * baseLeftSpan;
                for (let j = 0; j < leftGroupStops.length - 1; j++) {
                    if (mappedPos >= leftGroupStops[j].pos && mappedPos <= leftGroupStops[j + 1].pos) {
                        const t = (mappedPos - leftGroupStops[j].pos) / (leftGroupStops[j + 1].pos - leftGroupStops[j].pos);
                        const c1 = leftGroupStops[j].color;
                        const c2 = leftGroupStops[j + 1].color;
                        color1 = [
                            Math.round(c1[0] + (c2[0] - c1[0]) * t),
                            Math.round(c1[1] + (c2[1] - c1[1]) * t),
                            Math.round(c1[2] + (c2[2] - c1[2]) * t),
                            Math.round(c1[3] + (c2[3] - c1[3]) * t)
                        ];
                        break;
                    }
                }
            }

            if (color1) {
                let opacityMultiplier = 0.30;
                if (circleAmount > 0.2) {
                    const fadeProgress = (circleAmount - 0.2) / 0.3;
                    opacityMultiplier = 0.30 - (fadeProgress * 0.20);
                }
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                const colorOpacityMultiplier = luminance;
                const finalOpacity = opacityMultiplier * colorOpacityMultiplier;
                const redWeight = color1[0] / 255;
                const blueWeight = color1[2] / 255;
                const colorBalance = (redWeight - blueWeight + 1) / 2;
                const endStop = 0.67 + (colorBalance * 0.13);

                const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
                grad.addColorStop(0, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0)`);
                grad.addColorStop(0.10, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0)`);
                grad.addColorStop(0.45, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, ${(color1[3] / 255) * finalOpacity})`);
                grad.addColorStop(endStop, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0)`);

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Inner layers
        const innerLayers = [
            { r: 0.55, blur: 7 }, { r: 0.50, blur: 6.5 }, { r: 0.45, blur: 6 },
            { r: 0.425, blur: 5.5 }, { r: 0.40, blur: 5.5 }, { r: 0.375, blur: 5 },
            { r: 0.35, blur: 5 }, { r: 0.325, blur: 4.5 }, { r: 0.30, blur: 4.5 },
            { r: 0.275, blur: 4 }, { r: 0.25, blur: 4 }, { r: 0.20, blur: 3 }, { r: 0.10, blur: 2 }
        ];

        innerLayers.forEach(l => {
            drawLayer(l.blur, 1, l.r);
        });

        resolve(canvas.toDataURL('image/png'));
    });
};

const LightControl = memo(({ lightSpec, onChange, isSelected, onSelect, onSelectOther, otherLights, onAddLight }: LightControlProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingRotation, setIsDraggingRotation] = useState(false);
    const [isDraggingPower, setIsDraggingPower] = useState(false);
    const [isDraggingSize, setIsDraggingSize] = useState(false);
    const [dragStartSize, setDragStartSize] = useState<number | null>(null);
    const [dragStartDistance, setDragStartDistance] = useState<number | null>(null);

    const drawLight = (ctx: CanvasRenderingContext2D, width: number, height: number, position: { x: number, y: number }, circleAmount: number, size: number, color: string, showControls = true) => {
        ctx.clearRect(0, 0, width, height);

        const centerX = position.x * width;
        const centerY = position.y * height;
        const angle = circleAmount * Math.PI * 2;
        // Enforce minimum radius of 50px to ensure controls are always visible and clickable
        const baseRadius = Math.max(width, height) * size;
        const radius = Math.max(50, baseRadius);
        const power = Math.max(0.3, lightSpec.power !== undefined ? lightSpec.power : 1.0); // Minimum power 0.3
        const rotation = lightSpec.rotation !== undefined ? lightSpec.rotation : 0;
        const rotationAngle = rotation * Math.PI * 2;

        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16); // This 'g' is the green channel
        const b = parseInt(color.slice(5, 7), 16);

        ctx.globalAlpha = power;
        ctx.globalCompositeOperation = 'screen';

        // Helper to draw layer
        const drawLayer = (blur: number, opacity: number, radiusScale: number = 1.0) => {
            ctx.filter = `blur(${blur}px)`;
            const layerRadius = radius * radiusScale;
            // Use 'grad' instead of 'g' to avoid shadowing variable 'g' (green)
            const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, layerRadius);
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, layerRadius, -Math.PI / 2 - angle / 2 + rotationAngle, -Math.PI / 2 + angle / 2 + rotationAngle);
            ctx.closePath();
            ctx.fill();
        };

        drawLayer(8, 0.8);
        drawLayer(16, 0.5);
        drawLayer(25, 0.7);
        drawLayer(47, 0.5);

        ctx.filter = 'blur(6px)';
        ctx.globalCompositeOperation = 'screen';

        const spreadAngle = circleAmount * Math.PI * 1.4;
        const baseLeftSpan = 0.1321 - 0.0349;
        const baseRightSpan = 0.9680 - 0.8693;
        const scaleFactor = Math.max(0.3, circleAmount * 4);
        const leftSpan = baseLeftSpan * scaleFactor;
        const rightSpan = baseRightSpan * scaleFactor;
        const leftGroupAngleSpan = leftSpan * Math.PI * 2;
        const rightGroupAngleSpan = rightSpan * Math.PI * 2;

        const leftGroupStops = [
            { pos: 0.0349, color: [43, 6, 214, 0] },
            { pos: 0.0518, color: [45, 6, 213, 255] },
            { pos: 0.0694, color: [1, 183, 253, 255] },
            { pos: 0.0858, color: [17, 249, 145, 255] },
            { pos: 0.1007, color: [206, 252, 1, 255] },
            { pos: 0.1137, color: [255, 13, 0, 255] },
            { pos: 0.1321, color: [255, 13, 0, 0] }
        ];

        const rightGroupStops = [
            { pos: 0.8693, color: [255, 13, 0, 0] },
            { pos: 0.8858, color: [255, 13, 0, 255] },
            { pos: 0.8995, color: [206, 252, 1, 255] },
            { pos: 0.9156, color: [17, 249, 145, 255] },
            { pos: 0.9322, color: [1, 183, 253, 255] },
            { pos: 0.9511, color: [3, 5, 255, 255] },
            { pos: 0.9680, color: [6, 5, 251, 0] }
        ];

        const segments = 120; // Slightly reduced for interactive frame rate
        for (let i = 0; i < segments; i++) {
            const segmentAngle = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const startAngle = segmentAngle + rotationAngle;
            const endAngle = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2 + rotationAngle;

            let color1 = null;
            const normalizeAngle = (a: number) => {
                while (a < -Math.PI) a += Math.PI * 2;
                while (a > Math.PI) a -= Math.PI * 2;
                return a;
            };

            const normSegmentAngle = normalizeAngle(segmentAngle);
            const leftGroupCenter = -Math.PI / 2 - spreadAngle / 2;
            const leftStart = normalizeAngle(leftGroupCenter - leftGroupAngleSpan / 2);
            const leftEnd = normalizeAngle(leftGroupCenter + leftGroupAngleSpan / 2);

            let inLeft = leftStart <= leftEnd ? (normSegmentAngle >= leftStart && normSegmentAngle <= leftEnd) : (normSegmentAngle >= leftStart || normSegmentAngle <= leftEnd);

            if (inLeft) {
                let nPos;
                if (leftStart <= leftEnd) nPos = (normSegmentAngle - leftStart) / leftGroupAngleSpan;
                else nPos = (normSegmentAngle >= leftStart ? (normSegmentAngle - leftStart) : (normSegmentAngle + Math.PI * 2 - leftStart)) / leftGroupAngleSpan;

                const mappedPos = 0.8693 + nPos * baseRightSpan;
                for (let j = 0; j < rightGroupStops.length - 1; j++) {
                    if (mappedPos >= rightGroupStops[j].pos && mappedPos <= rightGroupStops[j + 1].pos) {
                        const t = (mappedPos - rightGroupStops[j].pos) / (rightGroupStops[j + 1].pos - rightGroupStops[j].pos);
                        const c1 = rightGroupStops[j].color, c2 = rightGroupStops[j + 1].color;
                        color1 = c1.map((v, k) => Math.round(v + (c2[k] - v) * t));
                        break;
                    }
                }
            } else {
                const rightGroupCenter = -Math.PI / 2 + spreadAngle / 2;
                const rightStart = rightGroupCenter - rightGroupAngleSpan / 2;
                const rightEnd = rightGroupCenter + rightGroupAngleSpan / 2;
                if (segmentAngle >= rightStart && segmentAngle <= rightEnd) {
                    let nPos = (segmentAngle - rightStart) / rightGroupAngleSpan;
                    const mappedPos = 0.0349 + nPos * baseLeftSpan;
                    for (let j = 0; j < leftGroupStops.length - 1; j++) {
                        if (mappedPos >= leftGroupStops[j].pos && mappedPos <= leftGroupStops[j + 1].pos) {
                            const t = (mappedPos - leftGroupStops[j].pos) / (leftGroupStops[j + 1].pos - leftGroupStops[j].pos);
                            const c1 = leftGroupStops[j].color, c2 = leftGroupStops[j + 1].color;
                            color1 = c1.map((v, k) => Math.round(v + (c2[k] - v) * t));
                            break;
                        }
                    }
                }
            }

            if (color1) {
                let opacityMultiplier = circleAmount > 0.2 ? 0.30 - ((circleAmount - 0.2) / 0.3 * 0.20) : 0.30;
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                const finalOpacity = opacityMultiplier * lum;
                const redWeight = color1[0] / 255, blueWeight = color1[2] / 255;
                const endStop = 0.67 + ((redWeight - blueWeight + 1) / 2 * 0.13);

                const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
                grad.addColorStop(0, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0)`);
                grad.addColorStop(0.1, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0)`);
                grad.addColorStop(0.45, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, ${(color1[3] / 255) * finalOpacity})`);
                grad.addColorStop(endStop, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.arc(centerX, centerY, radius, startAngle, endAngle); ctx.fill();
            }
        }

        const innerLayers = [
            { r: 0.55, blur: 7 }, { r: 0.50, blur: 6.5 }, { r: 0.45, blur: 6 },
            { r: 0.425, blur: 5.5 }, { r: 0.40, blur: 5.5 }, { r: 0.375, blur: 5 },
            { r: 0.35, blur: 5 }, { r: 0.325, blur: 4.5 }, { r: 0.30, blur: 4.5 },
            { r: 0.275, blur: 4 }, { r: 0.25, blur: 4 }, { r: 0.20, blur: 3 }, { r: 0.10, blur: 2 }
        ];
        innerLayers.forEach(l => drawLayer(l.blur, 1, l.r));

        if (showControls) {
            ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0;
            ctx.save(); ctx.setLineDash([0.1, 9]); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(centerX, centerY, radius, -Math.PI / 2 - angle / 2 + rotationAngle, -Math.PI / 2 + angle / 2 + rotationAngle); ctx.stroke(); ctx.restore();

            const powerRadius = radius * 0.75;
            const powerArcAngle = Math.max(0.2, circleAmount) * Math.PI * 2;
            ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(centerX, centerY, powerRadius, -Math.PI / 2 - powerArcAngle / 2 + rotationAngle, -Math.PI / 2 + powerArcAngle / 2 + rotationAngle); ctx.stroke();
            ctx.strokeStyle = '#007AFF';
            ctx.beginPath();
            const curPowerAngle = powerArcAngle * power;
            ctx.arc(centerX, centerY, powerRadius, -Math.PI / 2 - powerArcAngle / 2 + rotationAngle, -Math.PI / 2 - powerArcAngle / 2 + rotationAngle + curPowerAngle); ctx.stroke();
            const pbAngle = -Math.PI / 2 - powerArcAngle / 2 + rotationAngle + curPowerAngle;
            ctx.beginPath(); ctx.arc(centerX + Math.cos(pbAngle) * powerRadius, centerY + Math.sin(pbAngle) * powerRadius, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); ctx.restore();

            ctx.beginPath(); ctx.arc(centerX, centerY, 8, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#007AFF'; ctx.lineWidth = 3.3; ctx.stroke();

            if (isSelected) {
                const bx = 6 + 11, by = 6 + 11;
                ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fillStyle = 'rgba(43,43,43,1)'; ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(bx, by - 3); ctx.lineTo(bx, by + 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.lineTo(bx + 3, by); ctx.stroke();
            }

            const minRad = Math.max(width, height) * size * 0.15, maxRad = Math.max(width, height) * size * 0.45;
            const rotRad = maxRad - ((circleAmount - 0.05) / 0.45 * (maxRad - minRad));
            const rotAng = Math.PI / 2 + rotationAngle;
            ctx.beginPath(); ctx.arc(centerX + Math.cos(rotAng) * rotRad, centerY + Math.sin(rotAng) * rotRad, 6, 0, Math.PI * 2); ctx.fillStyle = '#007AFF'; ctx.fill();
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const centerX = lightSpec.position.x * rect.width, centerY = lightSpec.position.y * rect.height;
        const distToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        if (isSelected) {
            if (Math.sqrt((x - 17) ** 2 + (y - 17) ** 2) < 13) { onAddLight?.(); return; }
            if (distToCenter < 12) { setIsDragging(true); return; }

            const size = lightSpec.size || 0.5, radius = Math.max(rect.width, rect.height) * size;
            const circleAmount = lightSpec.circleAmount || 0.25;
            const minRad = Math.max(rect.width, rect.height) * size * 0.15, maxRad = Math.max(rect.width, rect.height) * size * 0.45;
            const rotRad = maxRad - ((circleAmount - 0.05) / 0.45 * (maxRad - minRad));
            const rotation = lightSpec.rotation || 0, rotAngle = rotation * Math.PI * 2;
            const ballAngle = Math.PI / 2 + rotAngle;
            if (Math.sqrt((x - (centerX + Math.cos(ballAngle) * rotRad)) ** 2 + (y - (centerY + Math.sin(ballAngle) * rotRad)) ** 2) < 20) { setIsDraggingRotation(true); return; }

            const powerRadius = radius * 0.75;
            const power = lightSpec.power ?? 1.0;
            const powerArcAngle = Math.max(0.2, circleAmount) * Math.PI * 2;
            const curPowerAngle = powerArcAngle * power;
            const pbAngle = -Math.PI / 2 - powerArcAngle / 2 + rotAngle + curPowerAngle;
            if (Math.sqrt((x - (centerX + Math.cos(pbAngle) * powerRadius)) ** 2 + (y - (centerY + Math.sin(pbAngle) * powerRadius)) ** 2) < 15) { setIsDraggingPower(true); return; }

            const clickAngle = Math.atan2(y - centerY, x - centerX);
            let nClick = clickAngle, nStart = -Math.PI / 2 - powerArcAngle / 2 + rotAngle, nEnd = -Math.PI / 2 + powerArcAngle / 2 + rotAngle;
            const norm = (a: number) => { while (a < 0) a += Math.PI * 2; return a; };
            nClick = norm(nClick); nStart = norm(nStart); nEnd = norm(nEnd);
            const inRange = nStart <= nEnd ? (nClick >= nStart && nClick <= nEnd) : (nClick >= nStart || nClick <= nEnd);

            if (Math.abs(distToCenter - powerRadius) < 10 && inRange) { setIsDraggingPower(true); return; }

            if (otherLights) {
                for (const l of otherLights) {
                    if (Math.sqrt((x - l.position.x * rect.width) ** 2 + (y - l.position.y * rect.height) ** 2) < 20) { onSelectOther?.(l.id); return; }
                }
            }

            if (distToCenter < powerRadius - 10 && inRange) {
                setIsDraggingSize(true); setDragStartSize(lightSpec.size || 0.5); setDragStartDistance(distToCenter); return;
            }
        }

        if (!isSelected && otherLights) {
            for (const l of otherLights) {
                if (Math.sqrt((x - l.position.x * rect.width) ** 2 + (y - l.position.y * rect.height) ** 2) < 20) { onSelectOther?.(l.id); return; }
            }
        }
        onSelect();
    };

    const handleMouseMove = (e: MouseEvent) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;

        if (isDragging) {
            canvas.style.cursor = 'grabbing';
            onChange({ position: { x: Math.max(0, Math.min(1, x / rect.width)), y: Math.max(0, Math.min(1, y / rect.height)) } });
        } else if (isDraggingPower) {
            canvas.style.cursor = 'grabbing';
            const centerX = lightSpec.position.x * rect.width, centerY = lightSpec.position.y * rect.height;
            const rotation = lightSpec.rotation || 0, rotAngle = rotation * Math.PI * 2;
            const circleAmount = lightSpec.circleAmount || 0.25, powerArcAngle = Math.max(0.2, circleAmount) * Math.PI * 2;
            const arcStart = -Math.PI / 2 - powerArcAngle / 2 + rotAngle, arcEnd = -Math.PI / 2 + powerArcAngle / 2 + rotAngle;
            let angle = Math.atan2(y - centerY, x - centerX);
            if (angle < arcStart) angle += Math.PI * 2;
            if (angle > arcEnd + Math.PI) angle -= Math.PI * 2;
            const p = Math.max(0, Math.min(1, (angle - arcStart) / powerArcAngle));
            onChange({ power: p });
        } else if (isDraggingSize) {
            const rotation = lightSpec.rotation || 0;
            const cursorSvg = `data:image/svg+xml;utf8,<svg width='17' height='18' viewBox='0 0 17 18' fill='none' xmlns='http://www.w3.org/2000/svg' style='transform: rotate(${rotation * 360}deg)'><path d='M7.94922 1.16504C8.33812 0.90829 8.86544 0.951453 9.20703 1.29297L12.707 4.79297C13.0975 5.18345 13.0974 5.8165 12.707 6.20703C12.3165 6.59756 11.6835 6.59756 11.293 6.20703L9.5 4.41406V13.5859L11.293 11.793C11.6835 11.4026 12.3165 11.4026 12.707 11.793C13.0975 12.1835 13.0974 12.8165 12.707 13.207L9.20703 16.707C8.81651 17.0976 8.18349 17.0976 7.79297 16.707L4.29297 13.207C3.90253 12.8165 3.90247 12.1835 4.29297 11.793C4.68347 11.4026 5.31654 11.4026 5.70703 11.793L7.5 13.5859V4.41406L5.70703 6.20703C5.31651 6.59755 4.68349 6.59756 4.29297 6.20703C3.90253 5.8165 3.90247 5.18346 4.29297 4.79297L7.79297 1.29297L7.82812 1.26074L7.90625 1.19629L7.94922 1.16504Z' fill='white' stroke='white' stroke-linecap='round' stroke-linejoin='round'/><path d='M8.5 6.66667V16M8.5 16L12 12.5M8.5 16L5 12.5M8.5 11.3333L8.5 2M8.5 2L5 5.5M8.5 2L12 5.5' stroke='black' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
            canvas.style.cursor = `url("${cursorSvg}") 8.5 9, ns-resize`;
            const centerX = lightSpec.position.x * rect.width, centerY = lightSpec.position.y * rect.height;
            const dx = x - centerX, dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dragStartDistance !== null && dragStartSize !== null) {
                const maxDist = Math.max(rect.width, rect.height) * 0.5;
                const newSize = Math.max(0.1, Math.min(2.0, dragStartSize + (dist - dragStartDistance) / maxDist * 2));
                onChange({ size: newSize });
            }
        } else if (isDraggingRotation) {
            canvas.style.cursor = 'grabbing';
            const centerX = lightSpec.position.x * rect.width, centerY = lightSpec.position.y * rect.height;
            let angle = Math.atan2(y - centerY, x - centerX) - Math.PI / 2;
            if (angle < 0) angle += Math.PI * 2;
            const rotation = angle / (Math.PI * 2);

            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            const size = lightSpec.size || 0.5;
            const minRad = Math.max(rect.width, rect.height) * size * 0.15;
            const maxRad = Math.max(rect.width, rect.height) * size * 0.45;
            const clampDist = Math.max(minRad, Math.min(maxRad, dist));
            const circleAmount = 0.5 - ((clampDist - minRad) / (maxRad - minRad) * 0.45);
            onChange({ rotation, circleAmount });
        } else {
            // Cursor
            const centerX = lightSpec.position.x * rect.width, centerY = lightSpec.position.y * rect.height;
            const distToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            const size = lightSpec.size || 0.5, radius = Math.max(rect.width, rect.height) * size;
            const powerRadius = radius * 0.75;
            let cursorSet = false;

            if (isSelected) {
                const circleAmount = lightSpec.circleAmount || 0.25;
                const minRad = Math.max(rect.width, rect.height) * size * 0.15;
                const maxRad = Math.max(rect.width, rect.height) * size * 0.45;
                const rotRad = maxRad - ((circleAmount - 0.05) / 0.45 * (maxRad - minRad));
                const rotAng = (lightSpec.rotation || 0) * Math.PI * 2;
                const ballAng = Math.PI / 2 + rotAng;
                if (Math.sqrt((x - (centerX + Math.cos(ballAng) * rotRad)) ** 2 + (y - (centerY + Math.sin(ballAng) * rotRad)) ** 2) < 20) {
                    canvas.style.cursor = 'grab'; cursorSet = true;
                } else if (distToCenter < 12) {
                    canvas.style.cursor = 'grab'; cursorSet = true;
                } else {
                    const powerArcAngle = Math.max(0.2, circleAmount) * Math.PI * 2;
                    let clickAngle = Math.atan2(y - centerY, x - centerX);
                    let nStart = -Math.PI / 2 - powerArcAngle / 2 + rotAng, nEnd = -Math.PI / 2 + powerArcAngle / 2 + rotAng;
                    const norm = (a: number) => { while (a < 0) a += Math.PI * 2; return a; };
                    clickAngle = norm(clickAngle); nStart = norm(nStart); nEnd = norm(nEnd);
                    const inRange = nStart <= nEnd ? (clickAngle >= nStart && clickAngle <= nEnd) : (clickAngle >= nStart || clickAngle <= nEnd);

                    if (inRange) {
                        if (Math.abs(distToCenter - powerRadius) < 10) { canvas.style.cursor = 'pointer'; cursorSet = true; }
                        else if (distToCenter < powerRadius - 10) {
                            const rotation = lightSpec.rotation || 0;
                            const cursorSvg = `data:image/svg+xml;utf8,<svg width='17' height='18' viewBox='0 0 17 18' fill='none' xmlns='http://www.w3.org/2000/svg' style='transform: rotate(${rotation * 360}deg)'><path d='M7.94922 1.16504C8.33812 0.90829 8.86544 0.951453 9.20703 1.29297L12.707 4.79297C13.0975 5.18345 13.0974 5.8165 12.707 6.20703C12.3165 6.59756 11.6835 6.59756 11.293 6.20703L9.5 4.41406V13.5859L11.293 11.793C11.6835 11.4026 12.3165 11.4026 12.707 11.793C13.0975 12.1835 13.0974 12.8165 12.707 13.207L9.20703 16.707C8.81651 17.0976 8.18349 17.0976 7.79297 16.707L4.29297 13.207C3.90253 12.8165 3.90247 12.1835 4.29297 11.793C4.68347 11.4026 5.31654 11.4026 5.70703 11.793L7.5 13.5859V4.41406L5.70703 6.20703C5.31651 6.59755 4.68349 6.59756 4.29297 6.20703C3.90253 5.8165 3.90247 5.18346 4.29297 4.79297L7.79297 1.29297L7.82812 1.26074L7.90625 1.19629L7.94922 1.16504Z' fill='white' stroke='white' stroke-linecap='round' stroke-linejoin='round'/><path d='M8.5 6.66667V16M8.5 16L12 12.5M8.5 16L5 12.5M8.5 11.3333L8.5 2M8.5 2L5 5.5M8.5 2L12 5.5' stroke='black' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
                            canvas.style.cursor = `url("${cursorSvg}") 8.5 9, ns-resize`; cursorSet = true;
                        }
                    }
                }
            }
            if (!cursorSet && otherLights) {
                for (const l of otherLights) {
                    if (Math.sqrt((x - l.position.x * rect.width) ** 2 + (y - l.position.y * rect.height) ** 2) < 20) { canvas.style.cursor = 'grab'; cursorSet = true; break; }
                }
            }
            if (!cursorSet) canvas.style.cursor = 'default';
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false); setIsDraggingRotation(false); setIsDraggingPower(false); setIsDraggingSize(false);
        setDragStartSize(null); setDragStartDistance(null);
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    };

    useEffect(() => {
        if (isDragging || isDraggingRotation || isDraggingPower || isDraggingSize) {
            window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
            return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
        }
    }, [isDragging, isDraggingRotation, isDraggingPower, isDraggingSize, lightSpec, onChange]);

    useEffect(() => {
        const draw = (selected: boolean) => {
            const canvas = canvasRef.current; if (!canvas) return;
            const ctx = canvas.getContext('2d'); if (!ctx) return;
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== rect.width * (window.devicePixelRatio || 1)) {
                canvas.width = rect.width * (window.devicePixelRatio || 1); canvas.height = rect.height * (window.devicePixelRatio || 1); ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            }
            drawLight(ctx, rect.width, rect.height, lightSpec.position, lightSpec.circleAmount || 0.25, lightSpec.size || 0.5, lightSpec.color || '#ffffff', selected);
        };
        draw(isSelected);
    }, [lightSpec, isSelected, otherLights]);

    return (
        <div className="light-control-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: isSelected ? 10 : 1, mixBlendMode: isSelected ? 'normal' : 'screen' }}>
            <canvas ref={canvasRef} className="light-canvas" onMouseDown={handleMouseDown} style={{ pointerEvents: 'auto', cursor: isSelected ? 'pointer' : 'pointer', width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
});

export default LightControl;
