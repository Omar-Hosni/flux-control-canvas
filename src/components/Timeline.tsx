import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Circle, Camera, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSceneStore, SceneObject } from '@/stores/sceneStore';
import { ObjectPropertyPanel } from './ObjectPropertyPanel';
import { SceneOutliner } from './SceneOutliner';

interface Keyframe {
    time: number;
    objectId: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
}

interface Recording {
    keyframes: Keyframe[];
    duration: number;
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const Timeline = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Three.js refs
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const orbitControlsRef = useRef<OrbitControls | null>(null);
    const transformControlsRef = useRef<TransformControls | null>(null);
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
    const animationFrameRef = useRef<number>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const dragStartRef = useRef<THREE.Vector3 | null>(null);

    // Store State
    const {
        objects,
        selectedObjectId,
        gizmoMode,
        snapToGrid,
        gridSize,
        addObject,
        selectObject,
        updateObjectTransform,
        setMeshRef
    } = useSceneStore();

    // Local State
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(10);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Mutable refs
    const recordingRef = useRef<Recording>({ keyframes: [], duration: 0 });
    const startTimeRef = useRef<number>(0);

    // Time Application Logic (Decoupled from component state)
    const applyTimeFrame = useCallback((time: number, currentObjects: SceneObject[]) => {
        // Optimization: Group keys by object ID only on record stop? 
        // For now, simple filter per object is fine for small scenes.

        const allKeys = recordingRef.current.keyframes;

        currentObjects.forEach(obj => {
            // Find keys for this object
            const track = allKeys.filter(k => k.objectId === obj.id); // Assuming keys are pushed time-ordered

            if (track.length === 0) return;

            // Find keyframe interval
            // Binary search or simple find? Simple find for now.
            // Optimize: Check if time is past last keyframe first
            if (time >= track[track.length - 1].time) {
                const last = track[track.length - 1];
                const mesh = sceneRef.current?.getObjectByName(obj.id);
                if (mesh) {
                    mesh.position.set(last.position.x, last.position.y, last.position.z);
                    mesh.rotation.set(last.rotation.x, last.rotation.y, last.rotation.z);
                }
                return;
            }

            const nextIdx = track.findIndex(k => k.time >= time);
            if (nextIdx <= 0) {
                // Before first frame
                const first = track[0];
                const mesh = sceneRef.current?.getObjectByName(obj.id);
                if (mesh) {
                    mesh.position.set(first.position.x, first.position.y, first.position.z);
                    mesh.rotation.set(first.rotation.x, first.rotation.y, first.rotation.z);
                }
                return;
            }

            const next = track[nextIdx];
            const prev = track[nextIdx - 1];
            const alpha = (time - prev.time) / (next.time - prev.time);

            const mesh = sceneRef.current?.getObjectByName(obj.id);
            if (mesh) {
                mesh.position.lerpVectors(
                    new THREE.Vector3(prev.position.x, prev.position.y, prev.position.z),
                    new THREE.Vector3(next.position.x, next.position.y, next.position.z),
                    alpha
                );

                const prevEuler = new THREE.Euler(THREE.MathUtils.degToRad(prev.rotation.x), THREE.MathUtils.degToRad(prev.rotation.y), THREE.MathUtils.degToRad(prev.rotation.z));
                const nextEuler = new THREE.Euler(THREE.MathUtils.degToRad(next.rotation.x), THREE.MathUtils.degToRad(next.rotation.y), THREE.MathUtils.degToRad(next.rotation.z));
                // Note: stored rotations might be in degrees or radians? 
                // If we store obj.rotation directly from store, it's in Degrees (from ObjectPropertyPanel/Store).
                // But THREE.Object3D.rotation is radians.
                // Wait, store stores rotation in Degrees for UI convenience.
                // Yes, `updateObjectTransform` takes data.
                // Let's assume store is Degrees.
                // CHECK: In handleMouseMove we do `obj.position.copy(intersectPoint)`. `obj` is THREE object.
                // Then we call `updateObjectTransform(id, obj.position, obj.rotation ... )`.
                // THREE rotation is Radians.
                // If `updateObjectTransform` expects degrees (as suggested by the degToRad conversions in sync effect),
                // then we might be saving Radians into the Store if we just pass `obj.rotation`?
                // Let's check `updateObjectTransform` usage in gizmo handler.
                // line 147: `transformControls.object.rotation` -> this is Euler (radians).

                // CRITICAL: We need to ensure we are consistent.
                // Ideally, we just LERP whatever is stored.
                // If we store "radians-like-values" or "degrees-like-values", lerp works if consistent.
                // But for Quaternion slerp we need to know.

                // Let's stick to simple lerp for now to ensure robustness, or fix unit conversion.
                // Actually, if we just recorded specific values, we just want to play them back.
                // Slerp requires Quaternions.
                // Let's trust the values in keyframes are "correct" for whatever `updateObjectTransform` puts there.

                // Better approach: interpolate using Quaternions derived from the stored Euler values.
                // If stored values are Radians (from THREE object directly), we use them as radians.
                // If they are Degrees (from UI input), we convert.
                // When recording, we push `obj.rotation`. If `obj` comes from `useSceneStore.getState().objects`.
                // Store objects seem to have `rotation: {x,y,z}`.
                // When we drag, we update store with `obj.position`, `obj.rotation`.
                // If we are passing THREE.Euler directly to store action, does it serialize?
                // Store expects `{x,y,z}`. THREE.Euler has x,y,z.

                // Let's use simple lerp for rotation components for now to avoid the Euler/Quaternion ambiguity causing jumps.
                // It's not perfect for >180 turns but robust for dragging.
                mesh.rotation.x = THREE.MathUtils.lerp(prev.rotation.x, next.rotation.x, alpha);
                mesh.rotation.y = THREE.MathUtils.lerp(prev.rotation.y, next.rotation.y, alpha);
                mesh.rotation.z = THREE.MathUtils.lerp(prev.rotation.z, next.rotation.z, alpha);
            }
        });
    }, []);

    // Loop
    useEffect(() => {
        if (!isRecording && !isPlaying) return;

        let frameId: number;

        const tick = () => {
            const now = Date.now();
            let elapsed = (now - startTimeRef.current) / 1000;

            if (elapsed >= duration) {
                elapsed = duration;
                setIsPlaying(false);
                setIsRecording(false);
                setCurrentTime(duration);
                return;
            }

            setCurrentTime(elapsed);

            // Get latest store state directly
            const currentObjects = useSceneStore.getState().objects;

            if (isRecording) {
                currentObjects.forEach(obj => {
                    // Record "As Is" in the store. 
                    // Assuming store is the "Target State" we want to replay.
                    // But wait, during Drag, the MESH is updated, then Store is updated.
                    // Store update triggers React, but we are inside requestAnimationFrame.
                    // Accessing getState() is safe.
                    recordingRef.current.keyframes.push({
                        time: elapsed,
                        objectId: obj.id,
                        position: { ...obj.position },
                        rotation: { ...obj.rotation }
                    });
                });
            }

            if (isPlaying) {
                applyTimeFrame(elapsed, currentObjects);
            }

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [isRecording, isPlaying, duration, applyTimeFrame]); // Removed 'objects' dependency


    // Setup Scene
    useEffect(() => {
        if (!canvasRef.current) return;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(50, canvasRef.current.clientWidth / canvasRef.current.clientHeight, 0.1, 1000);
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, logarithmicDepthBuffer: true });
        renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        rendererRef.current = renderer;

        // Environment
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = "Ground";
        scene.add(ground);
        scene.add(new THREE.GridHelper(20, 20, 0x444444, 0x333333));

        // Controls
        const orbit = new OrbitControls(camera, renderer.domElement);
        orbit.enableDamping = true;
        orbitControlsRef.current = orbit;

        const transform = new TransformControls(camera, renderer.domElement);
        transform.addEventListener('dragging-changed', (e) => {
            orbit.enabled = !e.value;
            setIsTransforming(e.value);
        });
        transform.addEventListener('change', () => {
            if (transform.object) {
                // Convert Euler (Radians) to format Store expects? 
                // Store seems to expect Degrees usually?
                // But wait, let's look at `updateObjectTransform` signature usage elsewhere.
                // In `handleMouseMove` we pass THREE objects directly.
                // If we pass THREE.Euler to a store that saves {x,y,z}, it saves Radians.
                // If Scene sync reads it as Degrees `degToRad`, then we have a mismatch!
                // BUT: The original code used `degToRad` in the sync effect.
                // This implies the Store holds DEGREES.
                // So when we save to store from Gizmo/Drag, we MUST convert to Degrees.

                const p = transform.object.position;
                const r = transform.object.rotation;
                const s = transform.object.scale;

                updateObjectTransform(
                    transform.object.userData.id,
                    { x: p.x, y: p.y, z: p.z },
                    { x: THREE.MathUtils.radToDeg(r.x), y: THREE.MathUtils.radToDeg(r.y), z: THREE.MathUtils.radToDeg(r.z) },
                    { x: s.x, y: s.y, z: s.z }
                );
            }
        });
        scene.add(transform);
        transformControlsRef.current = transform;

        // Default Object
        if (useSceneStore.getState().objects.length === 0) {
            addObject({
                name: 'Cube', type: 'cube',
                position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
                material: { color: '#ff6b35', roughness: 0.4, metalness: 0.3, opacity: 1 },
                visibility: { visible: true, wireframe: false, castShadow: true, receiveShadow: true }
            });
        }

        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);
            orbit.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (canvasRef.current && camera && renderer) {
                const p = canvasRef.current.parentElement;
                if (p) {
                    camera.aspect = p.clientWidth / p.clientHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize(p.clientWidth, p.clientHeight);
                }
            }
        };
        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameRef.current!);
            renderer.dispose();
            scene.clear();
        };
    }, []);

    // Sync Store -> Scene
    // We kept this separate so it runs when Store updates (from Drag or UI)
    useEffect(() => {
        if (!sceneRef.current) return;
        objects.forEach(obj => {
            let mesh = sceneRef.current?.getObjectByName(obj.id) as THREE.Mesh | THREE.Group;
            if (!mesh && obj.type !== 'custom') {
                let geo: THREE.BufferGeometry;
                if (obj.type === 'sphere') geo = new THREE.SphereGeometry(0.5, 32, 32);
                else if (obj.type === 'cylinder') geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                else if (obj.type === 'cone') geo = new THREE.ConeGeometry(0.5, 1, 32);
                else if (obj.type === 'torus') geo = new THREE.TorusGeometry(0.4, 0.15, 16, 100);
                else if (obj.type === 'plane') geo = new THREE.PlaneGeometry(1, 1);
                else geo = new THREE.BoxGeometry(1, 1, 1);

                const mat = new THREE.MeshStandardMaterial({
                    color: obj.material.color, roughness: obj.material.roughness, metalness: obj.material.metalness,
                    transparent: obj.material.opacity < 1, opacity: obj.material.opacity, wireframe: obj.visibility.wireframe
                });
                mesh = new THREE.Mesh(geo, mat);
                mesh.name = obj.id; mesh.userData.id = obj.id;
                if (obj.type === 'plane') mesh.rotation.x = -Math.PI / 2;
                sceneRef.current?.add(mesh);
                setMeshRef(obj.id, mesh);
            }

            if (mesh && !isTransforming && !isDragging && !isPlaying) {
                // Only sync from store if we are NOT transforming/dragging via Mouse 
                // AND not playing (animation loop handles updates then)
                // actually "isPlaying" check is important so we don't overwrite animation with stale store data?
                // But store data *is* the animation if we update it? 
                // No, we don't update store during playback for performance, we update Mesh directly.
                mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
                mesh.rotation.set(THREE.MathUtils.degToRad(obj.rotation.x), THREE.MathUtils.degToRad(obj.rotation.y), THREE.MathUtils.degToRad(obj.rotation.z));
                mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
                mesh.visible = obj.visibility.visible;
                if (mesh instanceof THREE.Mesh) {
                    (mesh.material as THREE.MeshStandardMaterial).color.set(obj.material.color);
                }
            }
        });
    }, [objects, isTransforming, isDragging, isPlaying]); // Added isPlaying to block sync conflicts

    // Mouse Drag Logic
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const hits = raycasterRef.current.intersectObjects(sceneRef.current.children.filter(o => o.name.startsWith('obj_') && o.visible), true);

        if (hits.length > 0) {
            let target = hits[0].object;
            while (target.parent && !target.name.startsWith('obj_')) target = target.parent;
            if (target.name.startsWith('obj_')) {
                selectObject(target.name);
                setIsDragging(true);
                if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
                planeRef.current.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), hits[0].point);
                if (transformControlsRef.current) transformControlsRef.current.detach();
            }
        } else {
            selectObject(null);
        }
    }, [selectObject]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || !selectedObjectId || !sceneRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const pt = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(planeRef.current, pt);

        if (pt) {
            const obj = sceneRef.current.getObjectByName(selectedObjectId);
            if (obj) {
                obj.position.copy(pt);
                // Convert current Rotation (Radians) to Degrees for Store
                // We assume Rotation doesn't change during Drag (only translate), but we pass it anyway.
                const r = obj.rotation;
                updateObjectTransform(selectedObjectId, { x: pt.x, y: pt.y, z: pt.z }, { x: THREE.MathUtils.radToDeg(r.x), y: THREE.MathUtils.radToDeg(r.y), z: THREE.MathUtils.radToDeg(r.z) }, { x: 1, y: 1, z: 1 });
            }
        }
    }, [isDragging, selectedObjectId, updateObjectTransform]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
        if (selectedObjectId && transformControlsRef.current && sceneRef.current) {
            const o = sceneRef.current.getObjectByName(selectedObjectId);
            if (o) transformControlsRef.current.attach(o);
        }
    }, [selectedObjectId]);

    // Scrubbing
    const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
        setCurrentTime(t);
        applyTimeFrame(t, useSceneStore.getState().objects);
        if (isPlaying || isRecording) {
            startTimeRef.current = Date.now() - (t * 1000);
        }
    }, [duration, isPlaying, isRecording, applyTimeFrame]);

    // Gizmo Attach
    useEffect(() => {
        if (!transformControlsRef.current || !sceneRef.current) return;
        if (selectedObjectId && !isDragging) {
            const o = sceneRef.current.getObjectByName(selectedObjectId);
            if (o) {
                transformControlsRef.current.attach(o);
                transformControlsRef.current.setMode(gizmoMode);
            }
        } else {
            transformControlsRef.current.detach();
        }
    }, [selectedObjectId, gizmoMode, isDragging]);

    // File Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !sceneRef.current) return;
        const url = URL.createObjectURL(file);
        const name = file.name.split('.')[0];
        const ext = file.name.split('.').pop()?.toLowerCase();

        const onLoad = (obj: THREE.Object3D) => {
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            const scale = 1 / Math.max(size.x, size.y, size.z);
            obj.scale.set(scale, scale, scale);
            const center = box.getCenter(new THREE.Vector3());
            obj.position.set(-center.x * scale, -center.y * scale + 0.5, -center.z * scale);
            obj.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });

            const group = new THREE.Group();
            group.add(obj);
            const id = addObject({
                name, type: 'custom', position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
                material: { color: '#fff', roughness: 0.5, metalness: 0, opacity: 1 },
                visibility: { visible: true, castShadow: true, receiveShadow: true, wireframe: false }
            });
            group.name = id; group.userData.id = id;
            sceneRef.current?.add(group);
            setMeshRef(id, group);
            selectObject(id);
            toast.success("Model loaded");
        };

        if (ext === 'obj') new OBJLoader().load(url, onLoad);
        else if (['gltf', 'glb'].includes(ext || '')) new GLTFLoader().load(url, (g) => onLoad(g.scene));
    };

    const togglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
        } else {
            setIsRecording(false);
            const startOffset = (currentTime >= duration) ? 0 : currentTime;
            startTimeRef.current = Date.now() - (startOffset * 1000);
            setIsPlaying(true);
        }
    };

    const toggleRecord = () => {
        if (isRecording) {
            setIsRecording(false);
        } else {
            setIsPlaying(false);
            setCurrentTime(0);
            startTimeRef.current = Date.now();
            recordingRef.current.keyframes = [];
            setIsRecording(true);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
            <input type="file" ref={fileInputRef} className="hidden" accept=".obj,.gltf,.glb" onChange={handleFileUpload} />

            <div className="flex-1 flex min-h-0 overflow-hidden gap-4 p-4">
                {/* Left Panel - Scene Outliner */}
                <div className="w-80 flex-shrink-0">
                    <div className="bg-[#1e1e1e]/90 backdrop-blur-sm border border-border/30 rounded-lg shadow-xl overflow-hidden h-full flex flex-col">
                        <SceneOutliner
                            onAddShape={(type) => addObject({
                                name: type.charAt(0).toUpperCase() + type.slice(1), type,
                                position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
                                material: { color: '#ccc', roughness: 0.5, metalness: 0, opacity: 1 },
                                visibility: { visible: true, wireframe: false, castShadow: true, receiveShadow: true }
                            })}
                            onUploadModel={() => fileInputRef.current?.click()}
                        />
                    </div>
                </div>

                {/* Center - 3D Scene Container */}
                <div className="flex-1 relative bg-black min-h-0 overflow-hidden rounded-lg">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full block outline-none cursor-grab active:cursor-grabbing"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-[#1a1a1a]/90 backdrop-blur px-2 py-1.5 rounded-lg border border-border/20 shadow-xl pointer-events-auto">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={() => selectObject(null)}>
                            <MousePointer2 className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <span className="text-[10px] text-muted-foreground mr-1">WORKSPACE</span>
                    </div>

                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border border-white/10 pointer-events-auto">
                        <Camera className="w-4 h-4" />
                    </Button>
                </div>

                {/* Right Panel - Properties Panel */}
                <div className="w-80 flex-shrink-0">
                    <div className="bg-[#1a1a1a] border border-border/50 rounded-lg shadow-xl overflow-hidden h-full flex flex-col">
                        <ObjectPropertyPanel onApplyAnimation={() => { }} />
                    </div>
                </div>
            </div>

            <div className="h-48 border-t border-border/50 bg-[#1a1a1a] flex flex-col z-20">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={togglePlay}>
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setCurrentTime(0); setIsPlaying(false); setIsRecording(false); applyTimeFrame(0, useSceneStore.getState().objects); }}>
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        </div>
                        <span className="font-mono text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
                    </div>
                    <Button variant={isRecording ? "destructive" : "secondary"} size="sm" className="gap-2" onClick={toggleRecord}>
                        <Circle className={`w-3 h-3 ${isRecording ? "fill-current animate-pulse" : ""}`} />
                        {isRecording ? "Stop Recording" : "Record Motion"}
                    </Button>
                </div>

                <div className="flex-1 relative bg-[#111] overflow-hidden select-none">
                    <div
                        ref={timelineRef}
                        className="absolute inset-0 z-30 cursor-pointer"
                        onMouseDown={(e) => { setIsScrubbing(true); handleScrub(e); }}
                        onMouseMove={(e) => { if (isScrubbing) handleScrub(e); }}
                        onMouseUp={() => setIsScrubbing(false)}
                        onMouseLeave={() => setIsScrubbing(false)}
                    />

                    <div className="absolute top-0 bottom-0 w-px bg-yellow-500 z-20 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }} />

                    {[...Array(11)].map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-white/5 pointer-events-none" style={{ left: `${i * 10}%` }}>
                            <span className="text-[9px] text-muted-foreground ml-1 top-0 absolute">{i}s</span>
                        </div>
                    ))}

                    <div className="p-2 space-y-1 mt-4 pointer-events-none z-10">
                        {objects.map(obj => (
                            <div key={obj.id} className="h-6 flex items-center bg-[#222] rounded px-2 relative group mt-1">
                                <span className="text-[10px] text-muted-foreground w-20 truncate mr-2">{obj.name}</span>
                                <div className="flex-1 h-full relative bg-[#1a1a1a] rounded overflow-hidden">
                                    {recordingRef.current.keyframes.filter(k => k.objectId === obj.id).map((k, i) => (
                                        <div key={i} className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-blue-500" style={{ left: `${(k.time / duration) * 100}%` }} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
