import { create } from 'zustand';

export type InterpolationType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'custom';

export interface InterpolationCurve {
    type: InterpolationType;
    // For custom bezier: controlPoints[0] and [1] are the two control points
    // X values should be 0-1 (normalized time), Y values are the output values
    controlPoints?: { x: number; y: number }[];
}

export interface Keyframe {
    id: string;
    time: number; // seconds
    objectId: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    interpolation: InterpolationCurve;
}

export interface KeyframeEditingState {
    // Keyframe data
    keyframes: Keyframe[];
    selectedKeyframeId: string | null;

    // Playback state
    duration: number;
    currentTime: number;
    isPlaying: boolean;
    isScrubbing: boolean;
    framerate: number; // Frames per second (24, 30, 60)

    // Motion path visualization
    showMotionPaths: boolean;
    motionPathOpacity: number;

    // Actions
    addKeyframe: (objectId: string, time: number, position: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number }, scale: { x: number; y: number; z: number }) => string;
    updateKeyframe: (id: string, updates: Partial<Omit<Keyframe, 'id'>>) => void;
    deleteKeyframe: (id: string) => void;
    selectKeyframe: (id: string | null) => void;
    setInterpolation: (keyframeId: string, curve: InterpolationCurve) => void;

    // Playback controls
    setCurrentTime: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setIsScrubbing: (scrubbing: boolean) => void;
    setDuration: (duration: number) => void;
    setFramerate: (framerate: number) => void;

    // Motion path controls
    toggleMotionPaths: () => void;
    setMotionPathOpacity: (opacity: number) => void;

    // Utility
    getKeyframesForObject: (objectId: string) => Keyframe[];
    getKeyframeAtTime: (objectId: string, time: number) => Keyframe | null;
    clearAllKeyframes: () => void;
    reset: () => void;
}

let keyframeCounter = 0;

const generateKeyframeId = (): string => {
    keyframeCounter += 1;
    return `keyframe_${Date.now()}_${keyframeCounter}`;
};

// Default interpolation curve (ease-in-out)
const defaultInterpolation: InterpolationCurve = {
    type: 'ease-in-out'
};

export const useKeyframeEditingStore = create<KeyframeEditingState>((set, get) => ({
    // Initial state
    keyframes: [],
    selectedKeyframeId: null,
    duration: 10,
    currentTime: 0,
    isPlaying: false,
    isScrubbing: false,
    framerate: 30, // Default to 30 fps
    showMotionPaths: true,
    motionPathOpacity: 0.7,

    // Actions
    addKeyframe: (objectId, time, position, rotation, scale) => {
        const id = generateKeyframeId();
        const newKeyframe: Keyframe = {
            id,
            time,
            objectId,
            position: { ...position },
            rotation: { ...rotation },
            scale: { ...scale },
            interpolation: { ...defaultInterpolation }
        };

        set(state => ({
            keyframes: [...state.keyframes, newKeyframe].sort((a, b) => a.time - b.time),
            selectedKeyframeId: id
        }));

        return id;
    },

    updateKeyframe: (id, updates) => {
        set(state => ({
            keyframes: state.keyframes.map(kf =>
                kf.id === id ? { ...kf, ...updates } : kf
            ).sort((a, b) => a.time - b.time)
        }));
    },

    deleteKeyframe: (id) => {
        set(state => ({
            keyframes: state.keyframes.filter(kf => kf.id !== id),
            selectedKeyframeId: state.selectedKeyframeId === id ? null : state.selectedKeyframeId
        }));
    },

    selectKeyframe: (id) => {
        set({ selectedKeyframeId: id });
    },

    setInterpolation: (keyframeId, curve) => {
        set(state => ({
            keyframes: state.keyframes.map(kf =>
                kf.id === keyframeId ? { ...kf, interpolation: curve } : kf
            )
        }));
    },

    setCurrentTime: (time) => {
        const state = get();
        set({ currentTime: Math.max(0, Math.min(time, state.duration)) });
    },

    setIsPlaying: (playing) => {
        set({ isPlaying: playing });
    },

    setIsScrubbing: (scrubbing) => {
        set({ isScrubbing: scrubbing });
    },

    setDuration: (duration) => {
        set({ duration: Math.max(1, duration) });
    },

    setFramerate: (framerate) => {
        set({ framerate: Math.max(1, framerate) });
    },

    toggleMotionPaths: () => {
        set(state => ({ showMotionPaths: !state.showMotionPaths }));
    },

    setMotionPathOpacity: (opacity) => {
        set({ motionPathOpacity: Math.max(0, Math.min(1, opacity)) });
    },

    getKeyframesForObject: (objectId) => {
        return get().keyframes.filter(kf => kf.objectId === objectId).sort((a, b) => a.time - b.time);
    },

    getKeyframeAtTime: (objectId, time) => {
        const keyframes = get().keyframes.filter(kf => kf.objectId === objectId);
        return keyframes.find(kf => Math.abs(kf.time - time) < 0.01) || null;
    },

    clearAllKeyframes: () => {
        set({
            keyframes: [],
            selectedKeyframeId: null,
            currentTime: 0
        });
    },

    reset: () => {
        set({
            keyframes: [],
            selectedKeyframeId: null,
            duration: 10,
            currentTime: 0,
            isPlaying: false,
            isScrubbing: false,
            framerate: 30,
            showMotionPaths: true,
            motionPathOpacity: 0.7
        });
    }
}));
