import * as ort from 'onnxruntime-web';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';

const DEPTH_MODEL_PATH = '/midas_v21_small_256.onnx';

class ModelPreloader {
    private static instance: ModelPreloader;

    // Model instances
    private depthSession: ort.InferenceSession | null = null;
    private poseDetector: poseDetection.PoseDetector | null = null;

    // Loading states
    private depthLoading = false;
    private poseLoading = false;
    private depthError: string | null = null;
    private poseError: string | null = null;

    // Promises for waiting on load completion
    private depthLoadPromise: Promise<ort.InferenceSession | null> | null = null;
    private poseLoadPromise: Promise<poseDetection.PoseDetector | null> | null = null;

    // Callbacks for state updates
    private stateChangeCallbacks: Set<() => void> = new Set();

    private constructor() { }

    static getInstance(): ModelPreloader {
        if (!ModelPreloader.instance) {
            ModelPreloader.instance = new ModelPreloader();
        }
        return ModelPreloader.instance;
    }

    // Subscribe to state changes
    subscribe(callback: () => void): () => void {
        this.stateChangeCallbacks.add(callback);
        return () => this.stateChangeCallbacks.delete(callback);
    }

    private notifyStateChange() {
        this.stateChangeCallbacks.forEach(cb => cb());
    }

    // Getters
    getDepthSession() { return this.depthSession; }
    getPoseDetector() { return this.poseDetector; }
    isDepthLoading() { return this.depthLoading; }
    isPoseLoading() { return this.poseLoading; }
    getDepthError() { return this.depthError; }
    getPoseError() { return this.poseError; }

    // Load depth model
    async loadDepthModel(): Promise<ort.InferenceSession | null> {
        if (this.depthSession) return this.depthSession;
        if (this.depthLoadPromise) return this.depthLoadPromise;

        this.depthLoadPromise = (async () => {
            try {
                this.depthLoading = true;
                this.depthError = null;
                this.notifyStateChange();

                console.log('[ModelPreloader] Loading depth model from:', DEPTH_MODEL_PATH);

                const session = await ort.InferenceSession.create(DEPTH_MODEL_PATH, {
                    executionProviders: ['wasm'],
                });

                console.log('[ModelPreloader] Depth model loaded successfully!');
                this.depthSession = session;
                return session;
            } catch (e: any) {
                console.error('[ModelPreloader] Failed to load depth model:', e);
                this.depthError = `Failed to load depth model: ${e.message || 'Unknown error'}`;
                return null;
            } finally {
                this.depthLoading = false;
                this.notifyStateChange();
            }
        })();

        return this.depthLoadPromise;
    }

    // Load pose model
    async loadPoseModel(): Promise<poseDetection.PoseDetector | null> {
        if (this.poseDetector) return this.poseDetector;
        if (this.poseLoadPromise) return this.poseLoadPromise;

        this.poseLoadPromise = (async () => {
            try {
                this.poseLoading = true;
                this.poseError = null;
                this.notifyStateChange();

                console.log('[ModelPreloader] Loading pose detection model (MoveNet MultiPose)...');

                // Initialize TensorFlow.js backend
                await tf.ready();
                console.log('[ModelPreloader] TensorFlow.js backend:', tf.getBackend());

                const detector = await poseDetection.createDetector(
                    poseDetection.SupportedModels.MoveNet,
                    {
                        modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
                        enableTracking: true,
                        trackerType: poseDetection.TrackerType.BoundingBox,
                    }
                );

                console.log('[ModelPreloader] Pose model loaded successfully!');
                this.poseDetector = detector;
                return detector;
            } catch (e: any) {
                console.error('[ModelPreloader] Failed to load pose model:', e);
                this.poseError = `Failed to load pose model: ${e.message || 'Unknown error'}`;
                return null;
            } finally {
                this.poseLoading = false;
                this.notifyStateChange();
            }
        })();

        return this.poseLoadPromise;
    }

    // Preload all models in parallel
    async preloadAll(): Promise<void> {
        console.log('[ModelPreloader] Starting model preload...');
        await Promise.all([
            this.loadDepthModel(),
            this.loadPoseModel(),
        ]);
        console.log('[ModelPreloader] All models preloaded!');
    }
}

// Export singleton instance
export const modelPreloader = ModelPreloader.getInstance();

// React hook for using preloaded models
import { useState, useEffect } from 'react';

export function usePreloadedModels() {
    const [, forceUpdate] = useState({});

    useEffect(() => {
        const unsubscribe = modelPreloader.subscribe(() => forceUpdate({}));
        return unsubscribe;
    }, []);

    return {
        depthSession: modelPreloader.getDepthSession(),
        poseDetector: modelPreloader.getPoseDetector(),
        isDepthLoading: modelPreloader.isDepthLoading(),
        isPoseLoading: modelPreloader.isPoseLoading(),
        depthError: modelPreloader.getDepthError(),
        poseError: modelPreloader.getPoseError(),
    };
}
