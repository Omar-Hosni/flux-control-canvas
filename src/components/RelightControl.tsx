import { useRef, useState, useEffect, memo } from 'react';
import './RelightControl.css';

interface LightSpec {
    position: { x: number; y: number };
    depth: number; // Depth in 3D space (0 to 1)
    color: string;
    intensity: number; // 0 to 1
    rotationX: number; // Pitch: -1 to 1 (-90° to 90°)
    rotationY: number; // Yaw: 0 to 1 (0° to 360°)
    rotationZ: number; // Roll: -1 to 1 (-90° to 90°)
    coneAngle: number;
    id?: string;
}

interface RelightControlProps {
    lightSpec: LightSpec;
    onChange: (updates: Partial<LightSpec>) => void;
    isSelected?: boolean;
}

// Simple 3D point
interface Point3D {
    x: number;
    y: number;
    z: number;
}

// Rotate point around X axis (pitch)
const rotateX = (point: Point3D, angle: number): Point3D => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: point.x,
        y: point.y * cos - point.z * sin,
        z: point.y * sin + point.z * cos,
    };
};

// Rotate point around Y axis (yaw)
const rotateY = (point: Point3D, angle: number): Point3D => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: point.x * cos + point.z * sin,
        y: point.y,
        z: -point.x * sin + point.z * cos,
    };
};

// Rotate point around Z axis (roll)
const rotateZ = (point: Point3D, angle: number): Point3D => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: point.x * cos - point.y * sin,
        y: point.x * sin + point.y * cos,
        z: point.z,
    };
};

// Apply all rotations in order: Z (roll) -> X (pitch) -> Y (yaw)
const applyRotations = (point: Point3D, rotX: number, rotY: number, rotZ: number): Point3D => {
    let p = rotateZ(point, rotZ);
    p = rotateX(p, rotX);
    p = rotateY(p, rotY);
    return p;
};

// Project 3D point to 2D using perspective
const project3D = (
    point: Point3D,
    cameraZ: number,
    centerX: number,
    centerY: number,
    scale: number
): { x: number; y: number } => {
    const perspective = cameraZ / (cameraZ + point.z);
    return {
        x: centerX + point.x * perspective * scale,
        y: centerY - point.y * perspective * scale,
    };
};

const RelightControl = memo(({ lightSpec, onChange, isSelected = true }: RelightControlProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activeControl, setActiveControl] = useState<'none' | 'move'>('none');

    const draw3DLight = (
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        spec: LightSpec,
        showControls: boolean
    ) => {
        ctx.clearRect(0, 0, width, height);

        // Light position on image plane (in pixels)
        const groundX = spec.position.x * width;
        const groundY = spec.position.y * height;

        // Visual height based on depth
        const lightHeight = 50 + spec.depth * 150;

        // Rotation angles in radians
        const pitchAngle = (spec.rotationX || 0) * (Math.PI / 2);
        const yawAngle = (spec.rotationY || 0) * Math.PI * 2;
        const rollAngle = (spec.rotationZ || 0) * (Math.PI / 2);

        // Box dimensions (half-sizes)
        const boxW = 20;
        const boxH = 12;
        const boxD = 20;

        // Define box vertices in local space (centered at origin)
        const localVertices: Point3D[] = [
            // Front face (z = -boxD)
            { x: -boxW, y: -boxH, z: -boxD }, // 0
            { x: boxW, y: -boxH, z: -boxD },  // 1
            { x: boxW, y: boxH, z: -boxD },   // 2
            { x: -boxW, y: boxH, z: -boxD },  // 3
            // Back face (z = +boxD)
            { x: -boxW, y: -boxH, z: boxD },  // 4
            { x: boxW, y: -boxH, z: boxD },   // 5
            { x: boxW, y: boxH, z: boxD },    // 6
            { x: -boxW, y: boxH, z: boxD },   // 7
        ];

        // Apply rotations to vertices
        const rotatedVertices = localVertices.map((v) =>
            applyRotations(v, pitchAngle, yawAngle, rollAngle)
        );

        // Translate to world position (light floats above groundX, groundY)
        const worldVertices = rotatedVertices.map((v) => ({
            x: v.x,
            y: v.y + lightHeight,
            z: v.z,
        }));

        // Project to 2D
        const cameraZ = 400;
        const projectedVertices = worldVertices.map((v) =>
            project3D(v, cameraZ, groundX, groundY, 1)
        );

        // Define faces with vertex indices
        const faces = [
            { indices: [0, 1, 2, 3], name: 'front' },
            { indices: [5, 4, 7, 6], name: 'back' },
            { indices: [4, 0, 3, 7], name: 'left' },
            { indices: [1, 5, 6, 2], name: 'right' },
            { indices: [3, 2, 6, 7], name: 'top' },
            { indices: [4, 5, 1, 0], name: 'bottom' },
        ];

        // Calculate face centers and normals for depth sorting and lighting
        const faceData = faces.map((face) => {
            // Average Z for depth sorting
            const avgZ = face.indices.reduce((sum, idx) => sum + worldVertices[idx].z, 0) / 4;

            // Calculate face normal for shading
            const v0 = worldVertices[face.indices[0]];
            const v1 = worldVertices[face.indices[1]];
            const v2 = worldVertices[face.indices[2]];

            const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
            const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

            // Cross product for normal
            const normal = {
                x: edge1.y * edge2.z - edge1.z * edge2.y,
                y: edge1.z * edge2.x - edge1.x * edge2.z,
                z: edge1.x * edge2.y - edge1.y * edge2.x,
            };

            // Normalize
            const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
            const normalizedNormal = { x: normal.x / len, y: normal.y / len, z: normal.z / len };

            return { face, avgZ, normal: normalizedNormal };
        });

        // Sort by depth (furthest first - painter's algorithm)
        faceData.sort((a, b) => b.avgZ - a.avgZ);

        if (showControls) {
            // Draw light rays from box bottom to ground
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = spec.color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);

            // Rays from bottom face corners
            const bottomCorners = [0, 1, 4, 5];
            bottomCorners.forEach((idx) => {
                ctx.beginPath();
                ctx.moveTo(projectedVertices[idx].x, projectedVertices[idx].y);
                ctx.lineTo(groundX, groundY);
                ctx.stroke();
            });
            ctx.setLineDash([]);
            ctx.restore();

            // Draw ground target circle with glow
            ctx.save();
            // Glow
            ctx.beginPath();
            ctx.arc(groundX, groundY, 15, 0, Math.PI * 2);
            ctx.fillStyle = spec.color + '40';
            ctx.fill();
            // Inner circle
            ctx.beginPath();
            ctx.arc(groundX, groundY, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // Draw 3D Box faces
            faceData.forEach(({ face, normal }) => {
                //Skip back-facing polygons
                if (normal.z < 0) return;

                ctx.beginPath();
                ctx.moveTo(
                    projectedVertices[face.indices[0]].x,
                    projectedVertices[face.indices[0]].y
                );
                for (let i = 1; i < face.indices.length; i++) {
                    ctx.lineTo(
                        projectedVertices[face.indices[i]].x,
                        projectedVertices[face.indices[i]].y
                    );
                }
                ctx.closePath();

                // Calculate lighting based on normal (simple diffuse)
                const lightDir = { x: 0, y: 1, z: -0.5 }; // Light from above-front
                const lightLen = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
                const normLight = { x: lightDir.x / lightLen, y: lightDir.y / lightLen, z: lightDir.z / lightLen };

                let diffuse = normal.x * normLight.x + normal.y * normLight.y + normal.z * normLight.z;
                diffuse = Math.max(0.2, Math.min(1, diffuse * 0.5 + 0.5));

                // Bottom face emits light
                if (face.name === 'bottom') {
                    // Parse color and apply glow
                    const r = parseInt(spec.color.slice(1, 3), 16);
                    const g = parseInt(spec.color.slice(3, 5), 16);
                    const b = parseInt(spec.color.slice(5, 7), 16);
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.globalAlpha = 0.95;
                } else {
                    // Regular faces with shading
                    const shade = Math.floor(60 + diffuse * 80);
                    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
                    ctx.globalAlpha = 0.9;
                }

                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.globalAlpha = 1;
            });

            // Draw direction indicator arrow from box center pointing forward
            ctx.save();
            const boxCenter = {
                x: worldVertices.reduce((s, v) => s + v.x, 0) / 8,
                y: worldVertices.reduce((s, v) => s + v.y, 0) / 8,
                z: worldVertices.reduce((s, v) => s + v.z, 0) / 8,
            };

            // Arrow tip in local space (pointing down/forward)
            const arrowTip = applyRotations({ x: 0, y: -40, z: 0 }, pitchAngle, yawAngle, rollAngle);
            const arrowTipWorld = {
                x: arrowTip.x,
                y: arrowTip.y + lightHeight,
                z: arrowTip.z,
            };

            const projectedCenter = project3D(boxCenter, cameraZ, groundX, groundY, 1);
            const projectedTip = project3D(arrowTipWorld, cameraZ, groundX, groundY, 1);

            ctx.beginPath();
            ctx.moveTo(projectedCenter.x, projectedCenter.y);
            ctx.lineTo(projectedTip.x, projectedTip.y);
            ctx.strokeStyle = spec.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Arrow head
            const angle = Math.atan2(projectedTip.y - projectedCenter.y, projectedTip.x - projectedCenter.x);
            ctx.beginPath();
            ctx.moveTo(projectedTip.x, projectedTip.y);
            ctx.lineTo(
                projectedTip.x - 10 * Math.cos(angle - 0.4),
                projectedTip.y - 10 * Math.sin(angle - 0.4)
            );
            ctx.moveTo(projectedTip.x, projectedTip.y);
            ctx.lineTo(
                projectedTip.x - 10 * Math.cos(angle + 0.4),
                projectedTip.y - 10 * Math.sin(angle + 0.4)
            );
            ctx.stroke();
            ctx.restore();
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.scale(dpr, dpr);
        draw3DLight(ctx, rect.width, rect.height, lightSpec, isSelected);
        ctx.restore();
    }, [lightSpec, isSelected]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isSelected) return;
        e.preventDefault();
        e.stopPropagation();

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const groundX = lightSpec.position.x * rect.width;
        const groundY = lightSpec.position.y * rect.height;

        // Check ground target (move)
        const distToGround = Math.sqrt((x - groundX) ** 2 + (y - groundY) ** 2);
        if (distToGround < 25) {
            setActiveControl('move');
            return;
        }

        // Check if clicking near the box (also allows move)
        const lightHeight = 50 + lightSpec.depth * 150;
        const boxTop = groundY - lightHeight - 30;
        const boxBottom = groundY - lightHeight + 30;
        if (y > boxTop && y < boxBottom && Math.abs(x - groundX) < 40) {
            setActiveControl('move');
            return;
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (activeControl === 'none') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (activeControl === 'move') {
            onChange({
                position: {
                    x: Math.max(0, Math.min(1, x / rect.width)),
                    y: Math.max(0, Math.min(1, y / rect.height)),
                },
            });
        }
    };

    const handleMouseUp = () => {
        setActiveControl('none');
    };

    useEffect(() => {
        if (activeControl !== 'none') {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [activeControl, lightSpec, onChange]);

    return (
        <div className="relight-control-container">
            <canvas
                ref={canvasRef}
                className="relight-canvas"
                onMouseDown={handleMouseDown}
                style={{ cursor: isSelected ? 'crosshair' : 'default' }}
            />
        </div>
    );
});

export default RelightControl;
