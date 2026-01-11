import { create } from 'zustand';
import * as THREE from 'three';

export type ShapeType = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'custom';
export type GizmoMode = 'translate' | 'rotate' | 'scale';

export interface SceneObject {
    id: string;
    name: string;
    type: ShapeType;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    material: {
        color: string;
        roughness: number;
        metalness: number;
        opacity: number;
    };
    visibility: {
        visible: boolean;
        wireframe: boolean;
        castShadow: boolean;
        receiveShadow: boolean;
    };
    meshRef?: THREE.Mesh | THREE.Group;
}

interface SceneState {
    objects: SceneObject[];
    selectedObjectId: string | null;
    gizmoMode: GizmoMode;
    snapToGrid: boolean;
    gridSize: number;

    // Actions
    addObject: (object: Omit<SceneObject, 'id'>) => string;
    removeObject: (id: string) => void;
    updateObject: (id: string, updates: Partial<SceneObject>) => void;
    selectObject: (id: string | null) => void;
    setGizmoMode: (mode: GizmoMode) => void;
    toggleSnapToGrid: () => void;
    setGridSize: (size: number) => void;
    duplicateObject: (id: string) => string | null;
    getSelectedObject: () => SceneObject | null;
    setMeshRef: (id: string, mesh: THREE.Mesh | THREE.Group) => void;
    updateObjectTransform: (id: string, position?: THREE.Vector3, rotation?: THREE.Euler, scale?: THREE.Vector3) => void;
}

let objectCounter = 0;

const generateId = (): string => {
    objectCounter += 1;
    return `obj_${Date.now()}_${objectCounter}`;
};

export const useSceneStore = create<SceneState>((set, get) => ({
    objects: [],
    selectedObjectId: null,
    gizmoMode: 'translate',
    snapToGrid: false,
    gridSize: 0.5,

    addObject: (object) => {
        const id = generateId();
        const newObject: SceneObject = { ...object, id };
        set((state) => ({
            objects: [...state.objects, newObject],
            selectedObjectId: id,
        }));
        return id;
    },

    removeObject: (id) => {
        set((state) => ({
            objects: state.objects.filter((obj) => obj.id !== id),
            selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
        }));
    },

    updateObject: (id, updates) => {
        set((state) => ({
            objects: state.objects.map((obj) =>
                obj.id === id ? { ...obj, ...updates } : obj
            ),
        }));
    },

    selectObject: (id) => {
        set({ selectedObjectId: id });
    },

    setGizmoMode: (mode) => {
        set({ gizmoMode: mode });
    },

    toggleSnapToGrid: () => {
        set((state) => ({ snapToGrid: !state.snapToGrid }));
    },

    setGridSize: (size) => {
        set({ gridSize: size });
    },

    duplicateObject: (id) => {
        const state = get();
        const original = state.objects.find((obj) => obj.id === id);
        if (!original) return null;

        const newId = generateId();
        const duplicate: SceneObject = {
            ...original,
            id: newId,
            name: `${original.name} Copy`,
            position: {
                x: original.position.x + 1,
                y: original.position.y,
                z: original.position.z + 1,
            },
            meshRef: undefined, // Will be set when mesh is created
        };

        set((state) => ({
            objects: [...state.objects, duplicate],
            selectedObjectId: newId,
        }));
        return newId;
    },

    getSelectedObject: () => {
        const state = get();
        return state.objects.find((obj) => obj.id === state.selectedObjectId) || null;
    },

    setMeshRef: (id, mesh) => {
        set((state) => ({
            objects: state.objects.map((obj) =>
                obj.id === id ? { ...obj, meshRef: mesh } : obj
            ),
        }));
    },

    updateObjectTransform: (id, position, rotation, scale) => {
        set((state) => ({
            objects: state.objects.map((obj) => {
                if (obj.id !== id) return obj;

                const updates: Partial<SceneObject> = {};

                if (position) {
                    updates.position = {
                        x: parseFloat(position.x.toFixed(3)),
                        y: parseFloat(position.y.toFixed(3)),
                        z: parseFloat(position.z.toFixed(3)),
                    };
                }

                if (rotation) {
                    updates.rotation = {
                        x: parseFloat(THREE.MathUtils.radToDeg(rotation.x).toFixed(1)),
                        y: parseFloat(THREE.MathUtils.radToDeg(rotation.y).toFixed(1)),
                        z: parseFloat(THREE.MathUtils.radToDeg(rotation.z).toFixed(1)),
                    };
                }

                if (scale) {
                    updates.scale = {
                        x: parseFloat(scale.x.toFixed(3)),
                        y: parseFloat(scale.y.toFixed(3)),
                        z: parseFloat(scale.z.toFixed(3)),
                    };
                }

                return { ...obj, ...updates };
            }),
        }));
    },
}));
