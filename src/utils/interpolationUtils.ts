import { InterpolationCurve } from '@/stores/keyframeEditingStore';

/**
 * Cubic Bezier interpolation
 * @param t - Time parameter (0-1)
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 */
export function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/**
 * Standard easing functions
 */
export function easeIn(t: number): number {
    return t * t;
}

export function easeOut(t: number): number {
    return t * (2 - t);
}

export function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function linear(t: number): number {
    return t;
}

/**
 * Solve cubic Bezier curve for timing function
 * Similar to CSS cubic-bezier()
 * @param t - Input time (0-1)
 * @param p1x - First control point X
 * @param p1y - First control point Y
 * @param p2x - Second control point X
 * @param p2y - Second control point Y
 */
export function cubicBezierTiming(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
    // For timing functions, start point is (0,0) and end point is (1,1)
    // We need to find the parameter s where bezier(s).x = t
    // Then return bezier(s).y

    // Newton-Raphson method to solve for s
    const NEWTON_ITERATIONS = 4;
    const NEWTON_MIN_SLOPE = 0.001;
    const SUBDIVISION_PRECISION = 0.0000001;
    const SUBDIVISION_MAX_ITERATIONS = 10;

    // Calculate X value at parameter s
    const calcBezierX = (s: number): number => {
        // Cubic bezier formula for X: (1-s)³·0 + 3(1-s)²·s·p1x + 3(1-s)·s²·p2x + s³·1
        const u = 1 - s;
        return 3 * u * u * s * p1x + 3 * u * s * s * p2x + s * s * s;
    };

    // Calculate Y value at parameter s
    const calcBezierY = (s: number): number => {
        const u = 1 - s;
        return 3 * u * u * s * p1y + 3 * u * s * s * p2y + s * s * s;
    };

    // Get derivative of X with respect to s
    const getSlope = (s: number): number => {
        const u = 1 - s;
        return 3 * u * u * p1x + 6 * u * s * (p2x - p1x) + 3 * s * s * (1 - p2x);
    };

    // Binary subdivision method (fallback)
    const binarySubdivide = (x: number, a: number, b: number): number => {
        let currentX: number;
        let currentT: number;
        let i = 0;

        do {
            currentT = a + (b - a) / 2;
            currentX = calcBezierX(currentT) - x;

            if (currentX > 0) {
                b = currentT;
            } else {
                a = currentT;
            }
        } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);

        return currentT;
    };

    // Newton-Raphson method
    const newtonRaphson = (x: number, guessT: number): number => {
        for (let i = 0; i < NEWTON_ITERATIONS; i++) {
            const currentSlope = getSlope(guessT);

            if (currentSlope === 0) {
                return guessT;
            }

            const currentX = calcBezierX(guessT) - x;
            guessT -= currentX / currentSlope;
        }

        return guessT;
    };

    // Edge cases
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // Linear curve optimization
    if (p1x === p1y && p2x === p2y) {
        return t;
    }

    // Find s where bezier(s).x = t
    // Start with linear interpolation as initial guess
    let s = t;

    // Try Newton-Raphson first
    const initialSlope = getSlope(s);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
        s = newtonRaphson(t, s);
    } else {
        // Fall back to binary subdivision
        s = binarySubdivide(t, 0, 1);
    }

    // Return Y value at the found parameter
    return calcBezierY(s);
}

/**
 * Evaluate interpolation curve at time t (0-1)
 * @param t - Normalized time (0-1)
 * @param curve - Interpolation curve configuration
 * @returns Interpolated value (0-1)
 */
export function evaluateInterpolation(t: number, curve: InterpolationCurve): number {
    t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

    switch (curve.type) {
        case 'linear':
            return linear(t);
        case 'ease-in':
            return easeIn(t);
        case 'ease-out':
            return easeOut(t);
        case 'ease-in-out':
            return easeInOut(t);
        case 'custom':
            if (curve.controlPoints && curve.controlPoints.length >= 2) {
                const cp1 = curve.controlPoints[0];
                const cp2 = curve.controlPoints[1];

                // Use proper cubic Bezier timing function
                return cubicBezierTiming(t, cp1.x, cp1.y, cp2.x, cp2.y);
            }
            return easeInOut(t); // Fallback
        default:
            return easeInOut(t);
    }
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

/**
 * Interpolate between two 3D vectors using a curve
 */
export function lerpVector3(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
    t: number,
    curve: InterpolationCurve
): { x: number; y: number; z: number } {
    const easedT = evaluateInterpolation(t, curve);
    return {
        x: lerp(start.x, end.x, easedT),
        y: lerp(start.y, end.y, easedT),
        z: lerp(start.z, end.z, easedT)
    };
}

/**
 * Get preset interpolation curves
 */
export const INTERPOLATION_PRESETS: Record<string, InterpolationCurve> = {
    linear: { type: 'linear' },
    easeIn: { type: 'ease-in' },
    easeOut: { type: 'ease-out' },
    easeInOut: { type: 'ease-in-out' },
    // Custom preset examples
    bounce: {
        type: 'custom',
        controlPoints: [
            { x: 0.25, y: 0.1 },
            { x: 0.75, y: 1.1 }
        ]
    },
    overshoot: {
        type: 'custom',
        controlPoints: [
            { x: 0.3, y: -0.1 },
            { x: 0.7, y: 1.1 }
        ]
    }
};

/**
 * Calculate the interpolated transform between two keyframes
 * @param prevKeyframe - Previous keyframe
 * @param nextKeyframe - Next keyframe
 * @param time - Current time
 * @returns Interpolated transform
 */
export function interpolateKeyframes(
    prevKeyframe: { time: number; position: any; rotation: any; scale: any; interpolation: InterpolationCurve },
    nextKeyframe: { time: number; position: any; rotation: any; scale: any },
    time: number
): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } } {
    // Normalize time to [0, 1] between keyframes
    const t = (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);

    const position = lerpVector3(prevKeyframe.position, nextKeyframe.position, t, prevKeyframe.interpolation);
    const rotation = lerpVector3(prevKeyframe.rotation, nextKeyframe.rotation, t, prevKeyframe.interpolation);
    const scale = lerpVector3(prevKeyframe.scale, nextKeyframe.scale, t, prevKeyframe.interpolation);

    return { position, rotation, scale };
}
