import { create } from 'zustand';

export interface TimelineEntry {
    time: number; // seconds (0, 1, 2, 3, ...)
    imageUrl: string;
    operation: string;
    prompt?: string;
    timestamp: number; // actual timestamp
    thumbnailUrl?: string;
}

export type CanvasTool = 'pan' | 'selection' | 'brush' | 'eraser';

export interface TimelineEditingState {
    // Timeline state
    entries: TimelineEntry[];
    currentTime: number;
    maxTime: number;
    isPlaying: boolean;

    // Current image state
    currentImage: string | null;
    currentImageFile: File | null;

    // Canvas tool state
    activeTool: CanvasTool;
    brushSize: number;
    lassoPoints: { x: number; y: number }[];
    maskDataUrl: string | null;
    selectionBorderColor: string;

    // Object placement state
    placedObject: { file: File; x: number; y: number; scale: number } | null;

    // Editing state
    isProcessing: boolean;
    editPrompt: string;

    // Actions
    addEntry: (entry: Omit<TimelineEntry, 'time' | 'timestamp'>) => void;
    setCurrentTime: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentImage: (image: string | null, file?: File | null) => void;
    setActiveTool: (tool: CanvasTool) => void;
    setBrushSize: (size: number) => void;
    setLassoPoints: (points: { x: number; y: number }[]) => void;
    addLassoPoint: (point: { x: number; y: number }) => void;
    setMaskDataUrl: (dataUrl: string | null) => void;
    setIsProcessing: (processing: boolean) => void;
    setEditPrompt: (prompt: string) => void;
    setSelectionBorderColor: (color: string) => void;
    setPlacedObject: (obj: { file: File; x: number; y: number; scale: number } | null) => void;
    clearEntries: () => void;
    reset: () => void;
}

export const useTimelineEditingStore = create<TimelineEditingState>((set, get) => ({
    // Initial state
    entries: [],
    currentTime: 0,
    maxTime: 0,
    isPlaying: false,
    currentImage: null,
    currentImageFile: null,
    activeTool: 'pan',
    brushSize: 20,
    lassoPoints: [],
    maskDataUrl: null,
    isProcessing: false,
    editPrompt: '',
    selectionBorderColor: '#00ff00',
    placedObject: null,

    // Actions
    addEntry: (entry) => {
        const state = get();
        const time = state.entries.length * 0.1; // 0, 0.1, 0.2, 0.3, ...
        const newEntry: TimelineEntry = {
            ...entry,
            time,
            timestamp: Date.now()
        };

        set({
            entries: [...state.entries, newEntry],
            maxTime: time,
            currentTime: time,
            currentImage: entry.imageUrl
        });
    },

    setCurrentTime: (time) => {
        const state = get();
        // Find the closest entry at or before the requested time
        const visibleEntries = state.entries.filter(e => e.time <= time);
        const entry = visibleEntries.length > 0
            ? visibleEntries[visibleEntries.length - 1]
            : state.entries[0];

        set({
            currentTime: time,
            currentImage: entry?.imageUrl || state.currentImage
        });
    },

    setIsPlaying: (playing) => set({ isPlaying: playing }),

    setCurrentImage: (image, file) => set({
        currentImage: image,
        currentImageFile: file || null
    }),

    setActiveTool: (tool) => set({ activeTool: tool }),

    setBrushSize: (size) => set({ brushSize: size }),

    setLassoPoints: (points) => set({ lassoPoints: points }),

    addLassoPoint: (point) => {
        const state = get();
        set({ lassoPoints: [...state.lassoPoints, point] });
    },

    setMaskDataUrl: (dataUrl) => set({ maskDataUrl: dataUrl }),

    setIsProcessing: (processing) => set({ isProcessing: processing }),

    setEditPrompt: (prompt) => set({ editPrompt: prompt }),

    setSelectionBorderColor: (color) => set({ selectionBorderColor: color }),

    setPlacedObject: (obj) => set({ placedObject: obj }),

    clearEntries: () => set({
        entries: [],
        currentTime: 0,
        maxTime: 0
    }),

    reset: () => set({
        entries: [],
        currentTime: 0,
        maxTime: 0,
        isPlaying: false,
        currentImage: null,
        currentImageFile: null,
        activeTool: 'pan',
        brushSize: 20,
        lassoPoints: [],
        maskDataUrl: null,
        isProcessing: false,
        editPrompt: ''
    })
}));
