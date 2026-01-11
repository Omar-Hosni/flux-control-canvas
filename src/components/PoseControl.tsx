import { useRef, useState, useEffect, memo } from 'react';

export interface PoseOutput {
    id: number;
    center: { x: number; y: number };
    x: number;
    y: number;
    size?: number;
    isFlipped?: boolean;
    headRotationX?: number;
    headRotationY?: number;
    headTiltSide?: number;
    headRotationZ?: number;
    head: {
        noseDistance: number;
        noseAngle: number;
        leftEyeDistance: number;
        leftEyeAngle: number;
        rightEyeDistance: number;
        rightEyeAngle: number;
        leftEarDistance: number;
        leftEarAngle: number;
        rightEarDistance: number;
        rightEarAngle: number;
    };
    rightArm: {
        shoulderDistance: number;
        shoulderAngle: number;
        elbowDistance: number;
        elbowAngle: number;
        wristDistance: number;
        wristAngle: number;
    };
    leftArm: {
        shoulderDistance: number;
        shoulderAngle: number;
        elbowDistance: number;
        elbowAngle: number;
        wristDistance: number;
        wristAngle: number;
    };
    leftLeg: {
        hipDistance: number;
        hipAngle: number;
        kneeDistance: number;
        kneeAngle: number;
        ankleDistance: number;
        ankleAngle: number;
    };
    rightLeg: {
        hipDistance: number;
        hipAngle: number;
        kneeDistance: number;
        kneeAngle: number;
        ankleDistance: number;
        ankleAngle: number;
    };
}

interface PoseControlProps {
    poseSpec: PoseOutput;
    onChange: (updates: Partial<PoseOutput>) => void;
    isSelected: boolean;
    onSelect: () => void;
    onAddPose?: () => void;
    otherPoses?: PoseOutput[];
    allPoses?: PoseOutput[];
    onSelectPose?: (id: number) => void;
    zoom?: number;
    onZoomChange?: (zoom: number) => void;
}

export const renderPoseToPNG = (poseSpec: PoseOutput, size = 1024, transparentBackground = false): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        if (!transparentBackground) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, size, size);
        }

        const centerX = poseSpec.center.x * size;
        const centerY = poseSpec.center.y * size;
        const sizeMultiplier = poseSpec.size !== undefined ? poseSpec.size : 1.0;
        const scaledSize = Math.max(size, size) * sizeMultiplier;

        const headRotX = poseSpec.headRotationX !== undefined ? poseSpec.headRotationX : 0.5;
        const rotationOffsetX = headRotX < 0.5 ? (headRotX - 0.5) * 0.12 : (headRotX - 0.5) * 0.36;
        const headRotY = poseSpec.headRotationY !== undefined ? poseSpec.headRotationY : 0.5;
        const yRotationBlend = Math.abs(headRotY - 0.5) * 2;
        const noseHorizontalOffset = -(headRotY - 0.5) * 0.08 * scaledSize;
        const headTiltSide = poseSpec.headTiltSide !== undefined ? poseSpec.headTiltSide : 0.5;
        const sideTiltRotation = (headTiltSide - 0.5) * Math.PI * 0.5;
        const headRotZ = poseSpec.headRotationZ !== undefined ? poseSpec.headRotationZ : 0.5;
        const centerWeight = 1 - Math.abs(headRotY - 0.5) * 2;
        const xRotation = (headRotZ - 0.5) * Math.PI * 0.5 * centerWeight;
        const combinedRotation = sideTiltRotation + xRotation;
        const noseDistanceMultiplier = headRotX > 0.5 ? 1 - (headRotX - 0.5) * 0.6 : 1;

        let sideTiltNeckMultiplier = 1.0;
        const distanceFromCenter = Math.abs(headRotY - 0.5) * 2;
        if (distanceFromCenter > 0) {
            let baseMultiplier = headTiltSide < 0.5 ? 1.15 - (headTiltSide / 0.5) * 0.15 : 1.0 - ((headTiltSide - 0.5) / 0.5) * 0.15;
            if (headRotY > 0.5) baseMultiplier = 2.0 - baseMultiplier;
            sideTiltNeckMultiplier = 1.0 + (baseMultiplier - 1.0) * distanceFromCenter;
        }
        const finalNoseDistanceMultiplier = noseDistanceMultiplier * sideTiltNeckMultiplier;

        let eyeEarDistanceMultiplier = headRotX <= 0.5 ? 1.25 - (headRotX / 0.5) * 0.25 : headRotX <= 0.75 ? 1.0 - ((headRotX - 0.5) / 0.25) * 0.15 : 0.85 + ((headRotX - 0.75) / 0.25) * 0.15;

        const noseRadius = poseSpec.head.noseDistance * finalNoseDistanceMultiplier * scaledSize;
        const noseAngle = poseSpec.head.noseAngle * Math.PI * 2;
        const noseX = centerX + Math.cos(noseAngle) * noseRadius + noseHorizontalOffset;
        const noseY = centerY + Math.sin(noseAngle) * noseRadius;

        const leftEyeRadius = poseSpec.head.leftEyeDistance * eyeEarDistanceMultiplier * scaledSize;
        const leftEyeAngle = (poseSpec.head.leftEyeAngle - rotationOffsetX) * Math.PI * 2 + combinedRotation;
        const leftEyeBaseX = noseX + Math.cos(leftEyeAngle) * leftEyeRadius;
        const leftEyeBaseY = noseY + Math.sin(leftEyeAngle) * leftEyeRadius;
        const rightEyeRadius = poseSpec.head.rightEyeDistance * eyeEarDistanceMultiplier * scaledSize;
        const rightEyeAngle = (poseSpec.head.rightEyeAngle + rotationOffsetX) * Math.PI * 2 + combinedRotation;
        const rightEyeBaseX = noseX + Math.cos(rightEyeAngle) * rightEyeRadius;
        const rightEyeBaseY = noseY + Math.sin(rightEyeAngle) * rightEyeRadius;

        const [leftEyeX, leftEyeY] = headRotY < 0.5 ? [leftEyeBaseX, leftEyeBaseY] : [leftEyeBaseX + (rightEyeBaseX - leftEyeBaseX) * yRotationBlend, leftEyeBaseY + (rightEyeBaseY - leftEyeBaseY) * yRotationBlend];
        const [rightEyeX, rightEyeY] = headRotY < 0.5 ? [rightEyeBaseX + (leftEyeBaseX - rightEyeBaseX) * yRotationBlend, rightEyeBaseY + (leftEyeBaseY - rightEyeBaseY) * yRotationBlend] : [rightEyeBaseX, rightEyeBaseY];

        const leftEarRadius = poseSpec.head.leftEarDistance * eyeEarDistanceMultiplier * scaledSize;
        const leftEarAngle = (poseSpec.head.leftEarAngle + rotationOffsetX) * Math.PI * 2 + combinedRotation;
        const leftEarBaseX = leftEyeBaseX + Math.cos(leftEarAngle) * leftEarRadius;
        const leftEarBaseY = leftEyeBaseY + Math.sin(leftEarAngle) * leftEarRadius;
        const rightEarRadius = poseSpec.head.rightEarDistance * eyeEarDistanceMultiplier * scaledSize;
        const rightEarAngle = (poseSpec.head.rightEarAngle - rotationOffsetX) * Math.PI * 2 + combinedRotation;
        const rightEarBaseX = rightEyeBaseX + Math.cos(rightEarAngle) * rightEarRadius;
        const rightEarBaseY = rightEyeBaseY + Math.sin(rightEarAngle) * rightEarRadius;

        const [leftEarX, leftEarY] = headRotY < 0.5 ? [leftEarBaseX, leftEarBaseY] : [leftEarBaseX + (rightEarBaseX - leftEarBaseX) * yRotationBlend, leftEarBaseY + (rightEarBaseY - leftEarBaseY) * yRotationBlend];
        const [rightEarX, rightEarY] = headRotY < 0.5 ? [rightEarBaseX + (leftEarBaseX - rightEarBaseX) * yRotationBlend, rightEarBaseY + (leftEarBaseY - rightEarBaseY) * yRotationBlend] : [rightEarBaseX, rightEarBaseY];

        const rightShoulderRadius = poseSpec.rightArm.shoulderDistance * scaledSize;
        const rightShoulderAngle = poseSpec.rightArm.shoulderAngle * Math.PI * 2;
        const rightShoulderX = centerX + Math.cos(rightShoulderAngle) * rightShoulderRadius;
        const rightShoulderY = centerY + Math.sin(rightShoulderAngle) * rightShoulderRadius;
        const rightElbowRadius = poseSpec.rightArm.elbowDistance * scaledSize;
        const rightElbowAngle = poseSpec.rightArm.elbowAngle * Math.PI * 2;
        const rightElbowX = rightShoulderX + Math.cos(rightElbowAngle) * rightElbowRadius;
        const rightElbowY = rightShoulderY + Math.sin(rightElbowAngle) * rightElbowRadius;
        const rightWristRadius = poseSpec.rightArm.wristDistance * scaledSize;
        const rightWristAngle = poseSpec.rightArm.wristAngle * Math.PI * 2;
        const rightWristX = rightElbowX + Math.cos(rightWristAngle) * rightWristRadius;
        const rightWristY = rightElbowY + Math.sin(rightWristAngle) * rightWristRadius;

        const leftShoulderRadius = poseSpec.leftArm.shoulderDistance * scaledSize;
        const leftShoulderAngle = poseSpec.leftArm.shoulderAngle * Math.PI * 2;
        const leftShoulderX = centerX + Math.cos(leftShoulderAngle) * leftShoulderRadius;
        const leftShoulderY = centerY + Math.sin(leftShoulderAngle) * leftShoulderRadius;
        const leftElbowRadius = poseSpec.leftArm.elbowDistance * scaledSize;
        const leftElbowAngle = poseSpec.leftArm.elbowAngle * Math.PI * 2;
        const leftElbowX = leftShoulderX + Math.cos(leftElbowAngle) * leftElbowRadius;
        const leftElbowY = leftShoulderY + Math.sin(leftElbowAngle) * leftElbowRadius;
        const leftWristRadius = poseSpec.leftArm.wristDistance * scaledSize;
        const leftWristAngle = poseSpec.leftArm.wristAngle * Math.PI * 2;
        const leftWristX = leftElbowX + Math.cos(leftWristAngle) * leftWristRadius;
        const leftWristY = leftElbowY + Math.sin(leftWristAngle) * leftWristRadius;

        const leftHipRadius = poseSpec.leftLeg.hipDistance * scaledSize;
        const leftHipAngle = poseSpec.leftLeg.hipAngle * Math.PI * 2;
        const leftHipX = centerX + Math.cos(leftHipAngle) * leftHipRadius;
        const leftHipY = centerY + Math.sin(leftHipAngle) * leftHipRadius;
        const leftKneeRadius = poseSpec.leftLeg.kneeDistance * scaledSize;
        const leftKneeAngle = poseSpec.leftLeg.kneeAngle * Math.PI * 2;
        const leftKneeX = leftHipX + Math.cos(leftKneeAngle) * leftKneeRadius;
        const leftKneeY = leftHipY + Math.sin(leftKneeAngle) * leftKneeRadius;
        const leftAnkleRadius = poseSpec.leftLeg.ankleDistance * scaledSize;
        const leftAnkleAngle = poseSpec.leftLeg.ankleAngle * Math.PI * 2;
        const leftAnkleX = leftKneeX + Math.cos(leftAnkleAngle) * leftAnkleRadius;
        const leftAnkleY = leftKneeY + Math.sin(leftAnkleAngle) * leftAnkleRadius;

        const rightHipRadius = poseSpec.rightLeg.hipDistance * scaledSize;
        const rightHipAngle = poseSpec.rightLeg.hipAngle * Math.PI * 2;
        const rightHipX = centerX + Math.cos(rightHipAngle) * rightHipRadius;
        const rightHipY = centerY + Math.sin(rightHipAngle) * rightHipRadius;
        const rightKneeRadius = poseSpec.rightLeg.kneeDistance * scaledSize;
        const rightKneeAngle = poseSpec.rightLeg.kneeAngle * Math.PI * 2;
        const rightKneeX = rightHipX + Math.cos(rightKneeAngle) * rightKneeRadius;
        const rightKneeY = rightHipY + Math.sin(rightKneeAngle) * rightKneeRadius;
        const rightAnkleRadius = poseSpec.rightLeg.ankleDistance * scaledSize;
        const rightAnkleAngle = poseSpec.rightLeg.ankleAngle * Math.PI * 2;
        const rightAnkleX = rightKneeX + Math.cos(rightAnkleAngle) * rightAnkleRadius;
        const rightAnkleY = rightKneeY + Math.sin(rightAnkleAngle) * rightAnkleRadius;

        const drawTaperedBone = (x1: number, y1: number, x2: number, y2: number, color: string, opacity = 1) => {
            const segments = 20;
            const baseWidth = 3;
            const maxWidth = 6.9;
            let strokeColor = color;
            if (opacity < 1) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                strokeColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineCap = 'round';
            for (let i = 0; i < segments; i++) {
                const t1 = i / segments;
                const t2 = (i + 1) / segments;
                const width1 = baseWidth + (maxWidth - baseWidth) * Math.sin(t1 * Math.PI);
                const width2 = baseWidth + (maxWidth - baseWidth) * Math.sin(t2 * Math.PI);
                ctx.lineWidth = (width1 + width2) / 2;
                ctx.beginPath();
                ctx.moveTo(x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
                ctx.lineTo(x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2);
                ctx.stroke();
            }
        };

        const drawJoint = (x: number, y: number, color: string) => {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        };

        drawJoint(rightWristX, rightWristY, '#00ff55');
        drawJoint(rightElbowX, rightElbowY, '#33ff00');
        drawJoint(rightShoulderX, rightShoulderY, '#55ff00');
        drawJoint(leftWristX, leftWristY, '#aaff00');
        drawJoint(leftElbowX, leftElbowY, '#ffff00');
        drawJoint(leftShoulderX, leftShoulderY, '#ffaa00');
        drawJoint(leftAnkleX, leftAnkleY, '#00aaff');
        drawJoint(leftKneeX, leftKneeY, '#00ffff');
        drawJoint(leftHipX, leftHipY, '#00ffaa');
        drawJoint(rightAnkleX, rightAnkleY, '#5500ff');
        drawJoint(rightKneeX, rightKneeY, '#0000ff');
        drawJoint(rightHipX, rightHipY, '#0055ff');
        drawJoint(centerX, centerY, '#ff5500');
        drawJoint(noseX, noseY, '#ff0000');
        drawJoint(leftEyeX, leftEyeY, '#aa00ff');
        drawJoint(rightEyeX, rightEyeY, '#ff00ff');
        drawJoint(leftEarX, leftEarY, '#ff00aa');
        drawJoint(rightEarX, rightEarY, '#ff0055');

        drawTaperedBone(centerX, centerY, rightShoulderX, rightShoulderY, '#993300');
        drawTaperedBone(rightShoulderX, rightShoulderY, rightElbowX, rightElbowY, '#669900');
        drawTaperedBone(rightElbowX, rightElbowY, rightWristX, rightWristY, '#339900');
        drawTaperedBone(centerX, centerY, leftShoulderX, leftShoulderY, '#990000');
        drawTaperedBone(leftShoulderX, leftShoulderY, leftElbowX, leftElbowY, '#996600');
        drawTaperedBone(leftElbowX, leftElbowY, leftWristX, leftWristY, '#999900');
        drawTaperedBone(centerX, centerY, leftHipX, leftHipY, '#009900');
        drawTaperedBone(leftHipX, leftHipY, leftKneeX, leftKneeY, '#009933');
        drawTaperedBone(leftKneeX, leftKneeY, leftAnkleX, leftAnkleY, '#009966');
        drawTaperedBone(centerX, centerY, rightHipX, rightHipY, '#009999');
        drawTaperedBone(rightHipX, rightHipY, rightKneeX, rightKneeY, '#006699');
        drawTaperedBone(rightKneeX, rightKneeY, rightAnkleX, rightAnkleY, '#003399');
        drawTaperedBone(centerX, centerY, noseX, noseY, '#0000ff', 0.6);
        drawTaperedBone(noseX, noseY, leftEyeX, leftEyeY, '#5500ff', 0.6);
        drawTaperedBone(noseX, noseY, rightEyeX, rightEyeY, '#ff00ff', 0.6);
        drawTaperedBone(leftEyeX, leftEyeY, leftEarX, leftEarY, '#aa00ff', 0.6);
        drawTaperedBone(rightEyeX, rightEyeY, rightEarX, rightEarY, '#ff00aa', 0.6);

        resolve(canvas.toDataURL('image/png'));
    });
};

const PoseControl = memo(({ poseSpec, onChange, isSelected, onSelect, onAddPose, otherPoses, onSelectPose, zoom = 1.0, onZoomChange }: PoseControlProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDraggingCenter, setIsDraggingCenter] = useState(false);
    const [isDraggingZoomTag, setIsDraggingZoomTag] = useState(false);
    const zoomDragStartY = useRef<number | null>(null);
    const zoomDragStartValue = useRef<number | null>(null);
    const MAX_HIP_ANGLE_DIFF = 0.0672;
    const MIN_HIP_DISTANCE_RATIO = 0.8;
    const MAX_HIP_DISTANCE_RATIO = 1.2;
    const [selectedJoint, setSelectedJoint] = useState<string | null>(null);
    const [hoveredJoint, setHoveredJoint] = useState<string | null>(null);
    const [indicatorProgress, setIndicatorProgress] = useState(0);
    const animationStartTime = useRef<number | null>(null);
    const animationFrameId = useRef<number | null>(null);
    const [isDraggingRightShoulder, setIsDraggingRightShoulder] = useState(false);
    const [isDraggingRightElbow, setIsDraggingRightElbow] = useState(false);
    const [isDraggingRightWrist, setIsDraggingRightWrist] = useState(false);
    const [isDraggingLeftShoulder, setIsDraggingLeftShoulder] = useState(false);
    const [isDraggingLeftElbow, setIsDraggingLeftElbow] = useState(false);
    const [isDraggingLeftWrist, setIsDraggingLeftWrist] = useState(false);
    const [isDraggingLeftHip, setIsDraggingLeftHip] = useState(false);
    const [isDraggingLeftKnee, setIsDraggingLeftKnee] = useState(false);
    const [isDraggingLeftAnkle, setIsDraggingLeftAnkle] = useState(false);
    const [isDraggingRightHip, setIsDraggingRightHip] = useState(false);
    const [isDraggingRightKnee, setIsDraggingRightKnee] = useState(false);
    const [isDraggingRightAnkle, setIsDraggingRightAnkle] = useState(false);
    const [isDraggingNose, setIsDraggingNose] = useState(false);

    useEffect(() => {
        const isFlipped = poseSpec.isFlipped || false;
        const targetProgress = isFlipped ? 1 : 0;
        if (Math.abs(indicatorProgress - targetProgress) < 0.01) return;
        animationStartTime.current = performance.now();
        const startProgress = indicatorProgress;
        const duration = 250;
        const animate = (currentTime: number) => {
            const elapsed = currentTime - (animationStartTime.current || 0);
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            setIndicatorProgress(startProgress + (targetProgress - startProgress) * eased);
            if (progress < 1) animationFrameId.current = requestAnimationFrame(animate);
        };
        animationFrameId.current = requestAnimationFrame(animate);
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [poseSpec.isFlipped]);

    // Simplified drawPose - draws bones and joints
    const drawPose = (ctx: CanvasRenderingContext2D, width: number, height: number, pose: PoseOutput, showControls = true, selectedJointName: string | null = null, opacity = 1.0, hoveredJointName: string | null = null, zoomLevel = 1.0) => {
        const canvasCenterX = width / 2, canvasCenterY = height / 2;
        const rawCenterX = pose.center.x * width, rawCenterY = pose.center.y * height;
        const centerX = canvasCenterX + (rawCenterX - canvasCenterX) * zoomLevel;
        const centerY = canvasCenterY + (rawCenterY - canvasCenterY) * zoomLevel;
        const sizeMultiplier = pose.size !== undefined ? pose.size : 1.0;
        const scaledSize = Math.max(width, height) * sizeMultiplier * zoomLevel;

        // Calculate all joint positions (simplified)
        const noseRadius = pose.head.noseDistance * scaledSize;
        const noseAngle = pose.head.noseAngle * Math.PI * 2;
        const noseX = centerX + Math.cos(noseAngle) * noseRadius;
        const noseY = centerY + Math.sin(noseAngle) * noseRadius;

        // Head - eyes and ears
        const leR = pose.head.leftEyeDistance * scaledSize, leA = pose.head.leftEyeAngle * Math.PI * 2;
        const leX = noseX + Math.cos(leA) * leR, leY = noseY + Math.sin(leA) * leR;
        const reR = pose.head.rightEyeDistance * scaledSize, reA = pose.head.rightEyeAngle * Math.PI * 2;
        const reEyeX = noseX + Math.cos(reA) * reR, reEyeY = noseY + Math.sin(reA) * reR;
        const lEarR = pose.head.leftEarDistance * scaledSize, lEarA = pose.head.leftEarAngle * Math.PI * 2;
        const lEarX = leX + Math.cos(lEarA) * lEarR, lEarY = leY + Math.sin(lEarA) * lEarR;
        const rEarR = pose.head.rightEarDistance * scaledSize, rEarA = pose.head.rightEarAngle * Math.PI * 2;
        const rEarX = reEyeX + Math.cos(rEarA) * rEarR, rEarY = reEyeY + Math.sin(rEarA) * rEarR;

        const rsR = pose.rightArm.shoulderDistance * scaledSize, rsA = pose.rightArm.shoulderAngle * Math.PI * 2;
        const rsX = centerX + Math.cos(rsA) * rsR, rsY = centerY + Math.sin(rsA) * rsR;
        const reElbowR = pose.rightArm.elbowDistance * scaledSize, reElbowA = pose.rightArm.elbowAngle * Math.PI * 2;
        const reElbowX = rsX + Math.cos(reElbowA) * reElbowR, reElbowY = rsY + Math.sin(reElbowA) * reElbowR;
        const rwR = pose.rightArm.wristDistance * scaledSize, rwA = pose.rightArm.wristAngle * Math.PI * 2;
        const rwX = reElbowX + Math.cos(rwA) * rwR, rwY = reElbowY + Math.sin(rwA) * rwR;

        const lsR = pose.leftArm.shoulderDistance * scaledSize, lsA = pose.leftArm.shoulderAngle * Math.PI * 2;
        const lsX = centerX + Math.cos(lsA) * lsR, lsY = centerY + Math.sin(lsA) * lsR;
        const leElbowR = pose.leftArm.elbowDistance * scaledSize, leElbowA = pose.leftArm.elbowAngle * Math.PI * 2;
        const leElbowX = lsX + Math.cos(leElbowA) * leElbowR, leElbowY = lsY + Math.sin(leElbowA) * leElbowR;
        const lwR = pose.leftArm.wristDistance * scaledSize, lwA = pose.leftArm.wristAngle * Math.PI * 2;
        const lwX = leElbowX + Math.cos(lwA) * lwR, lwY = leElbowY + Math.sin(lwA) * lwR;

        const lhR = pose.leftLeg.hipDistance * scaledSize, lhA = pose.leftLeg.hipAngle * Math.PI * 2;
        const lhX = centerX + Math.cos(lhA) * lhR, lhY = centerY + Math.sin(lhA) * lhR;
        const lkR = pose.leftLeg.kneeDistance * scaledSize, lkA = pose.leftLeg.kneeAngle * Math.PI * 2;
        const lkX = lhX + Math.cos(lkA) * lkR, lkY = lhY + Math.sin(lkA) * lkR;
        const laR = pose.leftLeg.ankleDistance * scaledSize, laA = pose.leftLeg.ankleAngle * Math.PI * 2;
        const laX = lkX + Math.cos(laA) * laR, laY = lkY + Math.sin(laA) * laR;

        const rhR = pose.rightLeg.hipDistance * scaledSize, rhA = pose.rightLeg.hipAngle * Math.PI * 2;
        const rhX = centerX + Math.cos(rhA) * rhR, rhY = centerY + Math.sin(rhA) * rhR;
        const rkR = pose.rightLeg.kneeDistance * scaledSize, rkA = pose.rightLeg.kneeAngle * Math.PI * 2;
        const rkX = rhX + Math.cos(rkA) * rkR, rkY = rhY + Math.sin(rkA) * rkR;
        const raR = pose.rightLeg.ankleDistance * scaledSize, raA = pose.rightLeg.ankleAngle * Math.PI * 2;
        const raX = rkX + Math.cos(raA) * raR, raY = rkY + Math.sin(raA) * raR;

        const drawBone = (x1: number, y1: number, x2: number, y2: number) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

        if (showControls) {
            ctx.save(); ctx.filter = 'blur(4px)'; ctx.strokeStyle = '#17171773'; ctx.lineWidth = 16.6; ctx.lineCap = 'round';
            // Head bones
            drawBone(centerX, centerY, noseX, noseY);
            drawBone(noseX, noseY, leX, leY); drawBone(noseX, noseY, reEyeX, reEyeY);
            drawBone(leX, leY, lEarX, lEarY); drawBone(reEyeX, reEyeY, rEarX, rEarY);
            // Arms
            drawBone(centerX, centerY, rsX, rsY); drawBone(rsX, rsY, reElbowX, reElbowY); drawBone(reElbowX, reElbowY, rwX, rwY);
            drawBone(centerX, centerY, lsX, lsY); drawBone(lsX, lsY, leElbowX, leElbowY); drawBone(leElbowX, leElbowY, lwX, lwY);
            // Legs
            drawBone(centerX, centerY, lhX, lhY); drawBone(lhX, lhY, lkX, lkY); drawBone(lkX, lkY, laX, laY);
            drawBone(centerX, centerY, rhX, rhY); drawBone(rhX, rhY, rkX, rkY); drawBone(rkX, rkY, raX, raY);
            ctx.restore();
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * opacity})`; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        // Head bones
        drawBone(centerX, centerY, noseX, noseY);
        drawBone(noseX, noseY, leX, leY); drawBone(noseX, noseY, reEyeX, reEyeY);
        drawBone(leX, leY, lEarX, lEarY); drawBone(reEyeX, reEyeY, rEarX, rEarY);
        // Arms
        drawBone(centerX, centerY, rsX, rsY); drawBone(rsX, rsY, reElbowX, reElbowY); drawBone(reElbowX, reElbowY, rwX, rwY);
        drawBone(centerX, centerY, lsX, lsY); drawBone(lsX, lsY, leElbowX, leElbowY); drawBone(leElbowX, leElbowY, lwX, lwY);
        // Legs
        drawBone(centerX, centerY, lhX, lhY); drawBone(lhX, lhY, lkX, lkY); drawBone(lkX, lkY, laX, laY);
        drawBone(centerX, centerY, rhX, rhY); drawBone(rhX, rhY, rkX, rkY); drawBone(rkX, rkY, raX, raY);

        const drawJoint = (x: number, y: number, jointName: string | null) => {
            const isActive = selectedJointName === jointName, isHovered = hoveredJointName === jointName;
            if ((isActive || isHovered) && showControls && jointName) {
                ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 122, 255, ${opacity})`; ctx.lineWidth = 6; ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = showControls ? `rgba(255, 255, 255, ${opacity})` : (jointName === 'center' ? '#fff' : 'rgba(255,255,255,0)');
            ctx.fill();
        };

        // Arms
        drawJoint(rwX, rwY, 'rightWrist'); drawJoint(reElbowX, reElbowY, 'rightElbow'); drawJoint(rsX, rsY, 'rightShoulder');
        drawJoint(lwX, lwY, 'leftWrist'); drawJoint(leElbowX, leElbowY, 'leftElbow'); drawJoint(lsX, lsY, 'leftShoulder');
        // Head (nose, eyes, ears)
        drawJoint(noseX, noseY, 'nose');
        drawJoint(leX, leY, null); drawJoint(reEyeX, reEyeY, null); // Eyes not selectable
        drawJoint(lEarX, lEarY, null); drawJoint(rEarX, rEarY, null); // Ears not selectable
        // Legs
        drawJoint(laX, laY, 'leftAnkle'); drawJoint(lkX, lkY, 'leftKnee'); drawJoint(lhX, lhY, 'leftHip');
        drawJoint(raX, raY, 'rightAnkle'); drawJoint(rkX, rkY, 'rightKnee'); drawJoint(rhX, rhY, 'rightHip');
        drawJoint(centerX, centerY, 'center');

        if (showControls) {
            const padding = 20, indicatorY = height / 2;
            const leftIX = padding + 11 + (width - 2 * padding - 22) * indicatorProgress;
            const rightIX = width - padding - 11 - (width - 2 * padding - 22) * indicatorProgress;
            ctx.beginPath(); ctx.arc(leftIX, indicatorY, 11, 0, Math.PI * 2); ctx.fillStyle = `rgba(43,43,43,${opacity})`; ctx.fill();
            ctx.font = '12px Arial'; ctx.fillStyle = `rgba(255,255,255,${0.4 * opacity})`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('L', leftIX, indicatorY);
            ctx.beginPath(); ctx.arc(rightIX, indicatorY, 11, 0, Math.PI * 2); ctx.fillStyle = `rgba(43,43,43,${opacity})`; ctx.fill();
            ctx.fillStyle = `rgba(255,255,255,${0.4 * opacity})`; ctx.fillText('R', rightIX, indicatorY);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d'); if (ctx) ctx.scale(dpr, dpr);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect();
        ctx?.clearRect(0, 0, rect.width, rect.height);
        if (isSelected && otherPoses) otherPoses.forEach(p => drawPose(ctx!, rect.width, rect.height, p, false, null, 0.17, null, zoom));
        if (ctx) drawPose(ctx, rect.width, rect.height, poseSpec, isSelected, selectedJoint, 1.0, hoveredJoint, zoom);
    }, [poseSpec, isSelected, selectedJoint, indicatorProgress, otherPoses, hoveredJoint, zoom]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const canvasCenterX = rect.width / 2, canvasCenterY = rect.height / 2;
        const rawCenterX = poseSpec.center.x * rect.width, rawCenterY = poseSpec.center.y * rect.height;
        const centerX = canvasCenterX + (rawCenterX - canvasCenterX) * zoom;
        const centerY = canvasCenterY + (rawCenterY - canvasCenterY) * zoom;
        const sizeMultiplier = poseSpec.size !== undefined ? poseSpec.size : 1.0;
        const scaledSize = Math.max(rect.width, rect.height) * sizeMultiplier * zoom;

        const noseX = centerX + Math.cos(poseSpec.head.noseAngle * Math.PI * 2) * poseSpec.head.noseDistance * scaledSize;
        const noseY = centerY + Math.sin(poseSpec.head.noseAngle * Math.PI * 2) * poseSpec.head.noseDistance * scaledSize;
        const rsX = centerX + Math.cos(poseSpec.rightArm.shoulderAngle * Math.PI * 2) * poseSpec.rightArm.shoulderDistance * scaledSize;
        const rsY = centerY + Math.sin(poseSpec.rightArm.shoulderAngle * Math.PI * 2) * poseSpec.rightArm.shoulderDistance * scaledSize;
        const reX = rsX + Math.cos(poseSpec.rightArm.elbowAngle * Math.PI * 2) * poseSpec.rightArm.elbowDistance * scaledSize;
        const reY = rsY + Math.sin(poseSpec.rightArm.elbowAngle * Math.PI * 2) * poseSpec.rightArm.elbowDistance * scaledSize;
        const rwX = reX + Math.cos(poseSpec.rightArm.wristAngle * Math.PI * 2) * poseSpec.rightArm.wristDistance * scaledSize;
        const rwY = reY + Math.sin(poseSpec.rightArm.wristAngle * Math.PI * 2) * poseSpec.rightArm.wristDistance * scaledSize;
        const lsX = centerX + Math.cos(poseSpec.leftArm.shoulderAngle * Math.PI * 2) * poseSpec.leftArm.shoulderDistance * scaledSize;
        const lsY = centerY + Math.sin(poseSpec.leftArm.shoulderAngle * Math.PI * 2) * poseSpec.leftArm.shoulderDistance * scaledSize;
        const leX = lsX + Math.cos(poseSpec.leftArm.elbowAngle * Math.PI * 2) * poseSpec.leftArm.elbowDistance * scaledSize;
        const leY = lsY + Math.sin(poseSpec.leftArm.elbowAngle * Math.PI * 2) * poseSpec.leftArm.elbowDistance * scaledSize;
        const lwX = leX + Math.cos(poseSpec.leftArm.wristAngle * Math.PI * 2) * poseSpec.leftArm.wristDistance * scaledSize;
        const lwY = leY + Math.sin(poseSpec.leftArm.wristAngle * Math.PI * 2) * poseSpec.leftArm.wristDistance * scaledSize;
        const lhX = centerX + Math.cos(poseSpec.leftLeg.hipAngle * Math.PI * 2) * poseSpec.leftLeg.hipDistance * scaledSize;
        const lhY = centerY + Math.sin(poseSpec.leftLeg.hipAngle * Math.PI * 2) * poseSpec.leftLeg.hipDistance * scaledSize;
        const lkX = lhX + Math.cos(poseSpec.leftLeg.kneeAngle * Math.PI * 2) * poseSpec.leftLeg.kneeDistance * scaledSize;
        const lkY = lhY + Math.sin(poseSpec.leftLeg.kneeAngle * Math.PI * 2) * poseSpec.leftLeg.kneeDistance * scaledSize;
        const laX = lkX + Math.cos(poseSpec.leftLeg.ankleAngle * Math.PI * 2) * poseSpec.leftLeg.ankleDistance * scaledSize;
        const laY = lkY + Math.sin(poseSpec.leftLeg.ankleAngle * Math.PI * 2) * poseSpec.leftLeg.ankleDistance * scaledSize;
        const rhX = centerX + Math.cos(poseSpec.rightLeg.hipAngle * Math.PI * 2) * poseSpec.rightLeg.hipDistance * scaledSize;
        const rhY = centerY + Math.sin(poseSpec.rightLeg.hipAngle * Math.PI * 2) * poseSpec.rightLeg.hipDistance * scaledSize;
        const rkX = rhX + Math.cos(poseSpec.rightLeg.kneeAngle * Math.PI * 2) * poseSpec.rightLeg.kneeDistance * scaledSize;
        const rkY = rhY + Math.sin(poseSpec.rightLeg.kneeAngle * Math.PI * 2) * poseSpec.rightLeg.kneeDistance * scaledSize;
        const raX = rkX + Math.cos(poseSpec.rightLeg.ankleAngle * Math.PI * 2) * poseSpec.rightLeg.ankleDistance * scaledSize;
        const raY = rkY + Math.sin(poseSpec.rightLeg.ankleAngle * Math.PI * 2) * poseSpec.rightLeg.ankleDistance * scaledSize;

        const dist = (ax: number, ay: number) => Math.sqrt((x - ax) ** 2 + (y - ay) ** 2);
        if (dist(rwX, rwY) < 8) { setIsDraggingRightWrist(true); setSelectedJoint('rightWrist'); onSelect(); }
        else if (dist(lwX, lwY) < 8) { setIsDraggingLeftWrist(true); setSelectedJoint('leftWrist'); onSelect(); }
        else if (dist(laX, laY) < 8) { setIsDraggingLeftAnkle(true); setSelectedJoint('leftAnkle'); onSelect(); }
        else if (dist(raX, raY) < 8) { setIsDraggingRightAnkle(true); setSelectedJoint('rightAnkle'); onSelect(); }
        else if (dist(reX, reY) < 8) { setIsDraggingRightElbow(true); setSelectedJoint('rightElbow'); onSelect(); }
        else if (dist(leX, leY) < 8) { setIsDraggingLeftElbow(true); setSelectedJoint('leftElbow'); onSelect(); }
        else if (dist(lkX, lkY) < 8) { setIsDraggingLeftKnee(true); setSelectedJoint('leftKnee'); onSelect(); }
        else if (dist(rkX, rkY) < 8) { setIsDraggingRightKnee(true); setSelectedJoint('rightKnee'); onSelect(); }
        else if (dist(noseX, noseY) < 8) { setIsDraggingNose(true); setSelectedJoint('nose'); onSelect(); }
        else if (dist(rsX, rsY) < 8) { setIsDraggingRightShoulder(true); setSelectedJoint('rightShoulder'); onSelect(); }
        else if (dist(lsX, lsY) < 8) { setIsDraggingLeftShoulder(true); setSelectedJoint('leftShoulder'); onSelect(); }
        else if (dist(lhX, lhY) < 8) { setIsDraggingLeftHip(true); setSelectedJoint('leftHip'); onSelect(); }
        else if (dist(rhX, rhY) < 8) { setIsDraggingRightHip(true); setSelectedJoint('rightHip'); onSelect(); }
        else if (dist(centerX, centerY) < 8) { setIsDraggingCenter(true); setSelectedJoint('center'); onSelect(); }
        else {
            if (otherPoses && onSelectPose) {
                for (const op of otherPoses) {
                    const ocX = canvasCenterX + (op.center.x * rect.width - canvasCenterX) * zoom;
                    const ocY = canvasCenterY + (op.center.y * rect.height - canvasCenterY) * zoom;
                    if (dist(ocX, ocY) < 8) { onSelectPose(op.id); return; }
                }
            }
            onSelect();
        }
    };

    const handleMouseMove = (e: MouseEvent | React.MouseEvent) => {
        const canvas = canvasRef.current; if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const canvasCenterX = rect.width / 2, canvasCenterY = rect.height / 2;
        const rawCenterX = poseSpec.center.x * rect.width, rawCenterY = poseSpec.center.y * rect.height;
        const centerX = canvasCenterX + (rawCenterX - canvasCenterX) * zoom;
        const centerY = canvasCenterY + (rawCenterY - canvasCenterY) * zoom;
        const sizeMultiplier = poseSpec.size !== undefined ? poseSpec.size : 1.0;
        const scaledSize = Math.max(rect.width, rect.height) * sizeMultiplier * zoom;

        if (isDraggingCenter) {
            canvas.style.cursor = 'grabbing';
            const unzoomedX = canvasCenterX + (x - canvasCenterX) / zoom;
            const unzoomedY = canvasCenterY + (y - canvasCenterY) / zoom;
            onChange({ center: { x: Math.max(0, Math.min(1, unzoomedX / rect.width)), y: Math.max(0, Math.min(1, unzoomedY / rect.height)) } });
        } else if (isDraggingNose) {
            canvas.style.cursor = 'grabbing';
            const dx = x - centerX, dy = y - centerY;
            onChange({ head: { ...poseSpec.head, noseDistance: Math.max(0.05, Math.min(0.09152, Math.sqrt(dx * dx + dy * dy) / scaledSize)), noseAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingRightShoulder) {
            canvas.style.cursor = 'grabbing';
            const dx = x - centerX, dy = y - centerY;
            onChange({ rightArm: { ...poseSpec.rightArm, shoulderDistance: Math.max(0.05, Math.min(0.09152, Math.sqrt(dx * dx + dy * dy) / scaledSize)), shoulderAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingRightElbow) {
            canvas.style.cursor = 'grabbing';
            const ox = centerX + Math.cos(poseSpec.rightArm.shoulderAngle * Math.PI * 2) * poseSpec.rightArm.shoulderDistance * scaledSize;
            const oy = centerY + Math.sin(poseSpec.rightArm.shoulderAngle * Math.PI * 2) * poseSpec.rightArm.shoulderDistance * scaledSize;
            const dx = x - ox, dy = y - oy;
            onChange({ rightArm: { ...poseSpec.rightArm, elbowDistance: Math.max(0.05, Math.min(0.12012, Math.sqrt(dx * dx + dy * dy) / scaledSize)), elbowAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingRightWrist) {
            canvas.style.cursor = 'grabbing';
            const sx = centerX + Math.cos(poseSpec.rightArm.shoulderAngle * Math.PI * 2) * poseSpec.rightArm.shoulderDistance * scaledSize;
            const sy = centerY + Math.sin(poseSpec.rightArm.shoulderAngle * Math.PI * 2) * poseSpec.rightArm.shoulderDistance * scaledSize;
            const ex = sx + Math.cos(poseSpec.rightArm.elbowAngle * Math.PI * 2) * poseSpec.rightArm.elbowDistance * scaledSize;
            const ey = sy + Math.sin(poseSpec.rightArm.elbowAngle * Math.PI * 2) * poseSpec.rightArm.elbowDistance * scaledSize;
            const dx = x - ex, dy = y - ey;
            onChange({ rightArm: { ...poseSpec.rightArm, wristDistance: Math.max(0.05, Math.min(0.12012, Math.sqrt(dx * dx + dy * dy) / scaledSize)), wristAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingLeftShoulder) {
            canvas.style.cursor = 'grabbing';
            const dx = x - centerX, dy = y - centerY;
            onChange({ leftArm: { ...poseSpec.leftArm, shoulderDistance: Math.max(0.05, Math.min(0.09152, Math.sqrt(dx * dx + dy * dy) / scaledSize)), shoulderAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingLeftElbow) {
            canvas.style.cursor = 'grabbing';
            const ox = centerX + Math.cos(poseSpec.leftArm.shoulderAngle * Math.PI * 2) * poseSpec.leftArm.shoulderDistance * scaledSize;
            const oy = centerY + Math.sin(poseSpec.leftArm.shoulderAngle * Math.PI * 2) * poseSpec.leftArm.shoulderDistance * scaledSize;
            const dx = x - ox, dy = y - oy;
            onChange({ leftArm: { ...poseSpec.leftArm, elbowDistance: Math.max(0.05, Math.min(0.12012, Math.sqrt(dx * dx + dy * dy) / scaledSize)), elbowAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingLeftWrist) {
            canvas.style.cursor = 'grabbing';
            const sx = centerX + Math.cos(poseSpec.leftArm.shoulderAngle * Math.PI * 2) * poseSpec.leftArm.shoulderDistance * scaledSize;
            const sy = centerY + Math.sin(poseSpec.leftArm.shoulderAngle * Math.PI * 2) * poseSpec.leftArm.shoulderDistance * scaledSize;
            const ex = sx + Math.cos(poseSpec.leftArm.elbowAngle * Math.PI * 2) * poseSpec.leftArm.elbowDistance * scaledSize;
            const ey = sy + Math.sin(poseSpec.leftArm.elbowAngle * Math.PI * 2) * poseSpec.leftArm.elbowDistance * scaledSize;
            const dx = x - ex, dy = y - ey;
            onChange({ leftArm: { ...poseSpec.leftArm, wristDistance: Math.max(0.05, Math.min(0.12012, Math.sqrt(dx * dx + dy * dy) / scaledSize)), wristAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingLeftHip) {
            canvas.style.cursor = 'grabbing';
            const dx = x - centerX, dy = y - centerY;
            onChange({ leftLeg: { ...poseSpec.leftLeg, hipDistance: Math.max(0.05, Math.min(0.26, Math.sqrt(dx * dx + dy * dy) / scaledSize)), hipAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingLeftKnee) {
            canvas.style.cursor = 'grabbing';
            const hx = centerX + Math.cos(poseSpec.leftLeg.hipAngle * Math.PI * 2) * poseSpec.leftLeg.hipDistance * scaledSize;
            const hy = centerY + Math.sin(poseSpec.leftLeg.hipAngle * Math.PI * 2) * poseSpec.leftLeg.hipDistance * scaledSize;
            const dx = x - hx, dy = y - hy;
            onChange({ leftLeg: { ...poseSpec.leftLeg, kneeDistance: Math.max(0.05, Math.min(0.1755, Math.sqrt(dx * dx + dy * dy) / scaledSize)), kneeAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingLeftAnkle) {
            canvas.style.cursor = 'grabbing';
            const hx = centerX + Math.cos(poseSpec.leftLeg.hipAngle * Math.PI * 2) * poseSpec.leftLeg.hipDistance * scaledSize;
            const hy = centerY + Math.sin(poseSpec.leftLeg.hipAngle * Math.PI * 2) * poseSpec.leftLeg.hipDistance * scaledSize;
            const kx = hx + Math.cos(poseSpec.leftLeg.kneeAngle * Math.PI * 2) * poseSpec.leftLeg.kneeDistance * scaledSize;
            const ky = hy + Math.sin(poseSpec.leftLeg.kneeAngle * Math.PI * 2) * poseSpec.leftLeg.kneeDistance * scaledSize;
            const dx = x - kx, dy = y - ky;
            onChange({ leftLeg: { ...poseSpec.leftLeg, ankleDistance: Math.max(0.05, Math.min(0.1755, Math.sqrt(dx * dx + dy * dy) / scaledSize)), ankleAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingRightHip) {
            canvas.style.cursor = 'grabbing';
            const dx = x - centerX, dy = y - centerY;
            onChange({ rightLeg: { ...poseSpec.rightLeg, hipDistance: Math.max(0.05, Math.min(0.26, Math.sqrt(dx * dx + dy * dy) / scaledSize)), hipAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingRightKnee) {
            canvas.style.cursor = 'grabbing';
            const hx = centerX + Math.cos(poseSpec.rightLeg.hipAngle * Math.PI * 2) * poseSpec.rightLeg.hipDistance * scaledSize;
            const hy = centerY + Math.sin(poseSpec.rightLeg.hipAngle * Math.PI * 2) * poseSpec.rightLeg.hipDistance * scaledSize;
            const dx = x - hx, dy = y - hy;
            onChange({ rightLeg: { ...poseSpec.rightLeg, kneeDistance: Math.max(0.05, Math.min(0.1755, Math.sqrt(dx * dx + dy * dy) / scaledSize)), kneeAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        } else if (isDraggingRightAnkle) {
            canvas.style.cursor = 'grabbing';
            const hx = centerX + Math.cos(poseSpec.rightLeg.hipAngle * Math.PI * 2) * poseSpec.rightLeg.hipDistance * scaledSize;
            const hy = centerY + Math.sin(poseSpec.rightLeg.hipAngle * Math.PI * 2) * poseSpec.rightLeg.hipDistance * scaledSize;
            const kx = hx + Math.cos(poseSpec.rightLeg.kneeAngle * Math.PI * 2) * poseSpec.rightLeg.kneeDistance * scaledSize;
            const ky = hy + Math.sin(poseSpec.rightLeg.kneeAngle * Math.PI * 2) * poseSpec.rightLeg.kneeDistance * scaledSize;
            const dx = x - kx, dy = y - ky;
            onChange({ rightLeg: { ...poseSpec.rightLeg, ankleDistance: Math.max(0.05, Math.min(0.1755, Math.sqrt(dx * dx + dy * dy) / scaledSize)), ankleAngle: (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1 } });
        }
    };

    const handleMouseUp = () => {
        setIsDraggingCenter(false); setIsDraggingZoomTag(false); setIsDraggingNose(false);
        setIsDraggingRightShoulder(false); setIsDraggingRightElbow(false); setIsDraggingRightWrist(false);
        setIsDraggingLeftShoulder(false); setIsDraggingLeftElbow(false); setIsDraggingLeftWrist(false);
        setIsDraggingLeftHip(false); setIsDraggingLeftKnee(false); setIsDraggingLeftAnkle(false);
        setIsDraggingRightHip(false); setIsDraggingRightKnee(false); setIsDraggingRightAnkle(false);
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    };

    useEffect(() => {
        const isDragging = isDraggingCenter || isDraggingZoomTag || isDraggingNose || isDraggingRightShoulder || isDraggingRightElbow || isDraggingRightWrist || isDraggingLeftShoulder || isDraggingLeftElbow || isDraggingLeftWrist || isDraggingLeftHip || isDraggingLeftKnee || isDraggingLeftAnkle || isDraggingRightHip || isDraggingRightKnee || isDraggingRightAnkle;
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove as any);
            window.addEventListener('mouseup', handleMouseUp);
            return () => { window.removeEventListener('mousemove', handleMouseMove as any); window.removeEventListener('mouseup', handleMouseUp); };
        }
    }, [isDraggingCenter, isDraggingZoomTag, isDraggingNose, isDraggingRightShoulder, isDraggingRightElbow, isDraggingRightWrist, isDraggingLeftShoulder, isDraggingLeftElbow, isDraggingLeftWrist, isDraggingLeftHip, isDraggingLeftKnee, isDraggingLeftAnkle, isDraggingRightHip, isDraggingRightKnee, isDraggingRightAnkle, poseSpec, onChange, onZoomChange, zoom]);

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: isSelected ? 10 : 1 }}>
            <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove as any} style={{ pointerEvents: 'auto', cursor: 'pointer', width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
});

export default PoseControl;
