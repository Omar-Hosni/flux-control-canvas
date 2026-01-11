import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Camera, MousePointer2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useSceneStore, SceneObject } from '@/stores/sceneStore';
import { useKeyframeEditingStore } from '@/stores/keyframeEditingStore';
import { interpolateKeyframes } from '@/utils/interpolationUtils';
import { timeToFrame, formatFrameAsTimecode, snapToFrame } from '@/utils/frameUtils';
import { ObjectPropertyPanel } from './ObjectPropertyPanel';
import { SceneOutliner } from './SceneOutliner';
import { InterpolationGraphEditor } from './InterpolationGraphEditor';

// Format time as frame number and timecode
const formatFrameTime = (seconds: number, framerate: number): string => {
    const frame = timeToFrame(seconds, framerate);
    const timecode = formatFrameAsTimecode(frame, framerate);
    return `${frame}f (${timecode})`;
};

export const KeyframeEditing = () => {
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

    // Motion path refs
    const motionPathsRef = useRef<Map<string, THREE.Line>>(new Map());

    // Scene Store State
    const {
        objects,
        selectedObjectId,
        gizmoMode,
        addObject,
        selectObject,
        updateObjectTransform,
        setMeshRef
    } = useSceneStore();

    // Keyframe Store State
    const {
        keyframes,
        selectedKeyframeId,
        currentTime,
        duration,
        isPlaying,
        isScrubbing,
        showMotionPaths,
        framerate,
        addKeyframe,
        selectKeyframe,
        deleteKeyframe,
        setCurrentTime,
        setIsPlaying,
        setIsScrubbing,
        setFramerate,
        getKeyframesForObject
    } = useKeyframeEditingStore();

    // Local State
    const [isTransforming, setIsTransforming] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const startTimeRef = useRef<number>(0);

    // Apply keyframe interpolation at a specific time
    const applyTimeFrame = useCallback((time: number, currentObjects: SceneObject[]) => {
        currentObjects.forEach(obj => {
            const objKeyframes = getKeyframesForObject(obj.id);

            if (objKeyframes.length === 0) return;

            // Find the keyframe interval
            if (time >= objKeyframes[objKeyframes.length - 1].time) {
                const last = objKeyframes[objKeyframes.length - 1];
                const mesh = sceneRef.current?.getObjectByName(obj.id);
                if (mesh) {
                    mesh.position.set(last.position.x, last.position.y, last.position.z);
                    mesh.rotation.set(
                        THREE.MathUtils.degToRad(last.rotation.x),
                        THREE.MathUtils.degToRad(last.rotation.y),
                        THREE.MathUtils.degToRad(last.rotation.z)
                    );
                    mesh.scale.set(last.scale.x, last.scale.y, last.scale.z);
                }
                return;
            }

            const nextIdx = objKeyframes.findIndex(k => k.time >= time);
            if (nextIdx <= 0) {
                const first = objKeyframes[0];
                const mesh = sceneRef.current?.getObjectByName(obj.id);
                if (mesh) {
                    mesh.position.set(first.position.x, first.position.y, first.position.z);
                    mesh.rotation.set(
                        THREE.MathUtils.degToRad(first.rotation.x),
                        THREE.MathUtils.degToRad(first.rotation.y),
                        THREE.MathUtils.degToRad(first.rotation.z)
                    );
                    mesh.scale.set(first.scale.x, first.scale.y, first.scale.z);
                }
                return;
            }

            const next = objKeyframes[nextIdx];
            const prev = objKeyframes[nextIdx - 1];

            // Use interpolation with curves
            const interpolated = interpolateKeyframes(prev, next, time);

            const mesh = sceneRef.current?.getObjectByName(obj.id);
            if (mesh) {
                mesh.position.set(interpolated.position.x, interpolated.position.y, interpolated.position.z);
                mesh.rotation.set(
                    THREE.MathUtils.degToRad(interpolated.rotation.x),
                    THREE.MathUtils.degToRad(interpolated.rotation.y),
                    THREE.MathUtils.degToRad(interpolated.rotation.z)
                );
                mesh.scale.set(interpolated.scale.x, interpolated.scale.y, interpolated.scale.z);
            }
        });
    }, [getKeyframesForObject]);

    // Playback loop
    useEffect(() => {
        if (!isPlaying) return;

        let frameId: number;

        const tick = () => {
            const now = Date.now();
            let elapsed = (now - startTimeRef.current) / 1000;

            if (elapsed >= duration) {
                elapsed = duration;
                setIsPlaying(false);
                setCurrentTime(duration);
                return;
            }

            setCurrentTime(elapsed);

            const currentObjects = useSceneStore.getState().objects;
            applyTimeFrame(elapsed, currentObjects);

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, duration, applyTimeFrame, setCurrentTime, setIsPlaying]);

    // Render motion paths
    const renderMotionPaths = useCallback(() => {
        if (!sceneRef.current || !showMotionPaths) {
            // Clear all paths if hidden
            motionPathsRef.current.forEach(line => {
                sceneRef.current?.remove(line);
            });
            motionPathsRef.current.clear();
            return;
        }

        // Remove old paths
        motionPathsRef.current.forEach(line => {
            sceneRef.current?.remove(line);
        });
        motionPathsRef.current.clear();

        // Create new paths for each object
        objects.forEach(obj => {
            const objKeyframes = getKeyframesForObject(obj.id);

            if (objKeyframes.length < 2) return;

            // Create smooth curve through keyframes
            const points: THREE.Vector3[] = [];

            for (let i = 0; i < objKeyframes.length - 1; i++) {
                const current = objKeyframes[i];
                const next = objKeyframes[i + 1];

                // Sample points along the interpolation curve
                const samples = 20;
                for (let j = 0; j <= samples; j++) {
                    const t = j / samples;
                    const time = current.time + t * (next.time - current.time);
                    const interpolated = interpolateKeyframes(current, next, time);
                    points.push(new THREE.Vector3(
                        interpolated.position.x,
                        interpolated.position.y,
                        interpolated.position.z
                    ));
                }
            }

            if (points.length > 1) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({
                    color: obj.material?.color || '#ffffff',
                    opacity: 0.6,
                    transparent: true,
                    linewidth: 2
                });
                const line = new THREE.Line(geometry, material);
                line.name = `motion_path_${obj.id}`;
                sceneRef.current?.add(line);
                motionPathsRef.current.set(obj.id, line);
            }
        });
    }, [objects, getKeyframesForObject, showMotionPaths]);

    // Update motion paths when keyframes change
    useEffect(() => {
        renderMotionPaths();
    }, [keyframes, showMotionPaths, renderMotionPaths]);

    // Setup Scene
    useEffect(() => {
        if (!canvasRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, canvasRef.current.clientWidth / canvasRef.current.clientHeight, 0.1, 1000);
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, logarithmicDepthBuffer: true });
        renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        rendererRef.current = renderer;

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
                mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
                mesh.rotation.set(THREE.MathUtils.degToRad(obj.rotation.x), THREE.MathUtils.degToRad(obj.rotation.y), THREE.MathUtils.degToRad(obj.rotation.z));
                mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
                mesh.visible = obj.visibility.visible;
                if (mesh instanceof THREE.Mesh) {
                    (mesh.material as THREE.MeshStandardMaterial).color.set(obj.material.color);
                }
            }
        });
    }, [objects, isTransforming, isDragging, isPlaying]);

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
        const rect = canvasRef.current!.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current!);
        const pt = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(planeRef.current, pt);

        if (pt) {
            const obj = sceneRef.current.getObjectByName(selectedObjectId);
            if (obj) {
                obj.position.copy(pt);
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

    // Scrubbing with frame snapping
    const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const normalizedTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
        // Snap to nearest frame
        const t = snapToFrame(normalizedTime, framerate);
        setCurrentTime(t);
        applyTimeFrame(t, useSceneStore.getState().objects);
        if (isPlaying) {
            startTimeRef.current = Date.now() - (t * 1000);
        }
    }, [duration, isPlaying, framerate, applyTimeFrame, setCurrentTime]);

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
            const startOffset = (currentTime >= duration) ? 0 : currentTime;
            startTimeRef.current = Date.now() - (startOffset * 1000);
            setIsPlaying(true);
        }
    };

    // Snap keyframe at current time for selected object
    const handleSnapKeyframe = () => {
        if (!selectedObjectId) {
            toast.error('Please select an object first');
            return;
        }

        const obj = objects.find(o => o.id === selectedObjectId);
        if (!obj) return;

        // During playback/scrubbing, the mesh holds the correct interpolated position
        // (store isn't updated during animation for performance)
        // So we read from the mesh to capture the actual current transform
        const mesh = sceneRef.current?.getObjectByName(selectedObjectId);

        let position = obj.position;
        let rotation = obj.rotation;
        let scale = obj.scale;

        if (mesh) {
            position = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
            rotation = {
                x: THREE.MathUtils.radToDeg(mesh.rotation.x),
                y: THREE.MathUtils.radToDeg(mesh.rotation.y),
                z: THREE.MathUtils.radToDeg(mesh.rotation.z)
            };
            scale = { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z };
        }

        addKeyframe(
            selectedObjectId,
            currentTime,
            position,
            rotation,
            scale
        );

        toast.success(`Keyframe added at frame ${timeToFrame(currentTime, framerate)}`);
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
                        <span className="text-[10px] text-muted-foreground mr-1">KEYFRAME EDITING</span>
                    </div>

                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border border-white/10 pointer-events-auto">
                        <Camera className="w-4 h-4" />
                    </Button>
                </div>

                {/* Right Panel - Properties & Graph Editor */}
                <div className="w-80 flex-shrink-0 space-y-4">
                    <div className="bg-[#1a1a1a] border border-border/50 rounded-lg shadow-xl overflow-hidden max-h-[45%] flex flex-col">
                        <ObjectPropertyPanel onApplyAnimation={() => { }} />
                    </div>

                    <div className="max-h-[50%] overflow-y-auto">
                        <InterpolationGraphEditor keyframeId={selectedKeyframeId} />
                    </div>
                </div>
            </div>

            {/* Timeline Bar */}
            <div className="h-48 border-t border-border/50 bg-[#1a1a1a] flex flex-col z-20">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={togglePlay}>
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setCurrentTime(0); setIsPlaying(false); }}>
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        </div>
                        <span className="font-mono text-sm">
                            {timeToFrame(currentTime, framerate)}f / {timeToFrame(duration, framerate)}f
                        </span>
                        <span className="text-xs text-muted-foreground">@ {framerate}fps</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 mr-2">
                            <Button
                                variant={framerate === 24 ? "default" : "outline"}
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setFramerate(24)}
                            >
                                24fps
                            </Button>
                            <Button
                                variant={framerate === 30 ? "default" : "outline"}
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setFramerate(30)}
                            >
                                30fps
                            </Button>
                            <Button
                                variant={framerate === 60 ? "default" : "outline"}
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setFramerate(60)}
                            >
                                60fps
                            </Button>
                        </div>
                        <Button
                            variant="default"
                            size="sm"
                            className="gap-2"
                            onClick={handleSnapKeyframe}
                            disabled={!selectedObjectId}
                        >
                            <Plus className="w-3 h-3" />
                            Snap Keyframe
                        </Button>
                        <Button
                            variant={showMotionPaths ? "default" : "outline"}
                            size="icon"
                            onClick={() => useKeyframeEditingStore.getState().toggleMotionPaths()}
                        >
                            {showMotionPaths ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                    </div>
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

                    {[...Array(11)].map((_, i) => {
                        const frame = Math.round((i / 10) * timeToFrame(duration, framerate));
                        return (
                            <div key={i} className="absolute top-0 bottom-0 w-px bg-white/5 pointer-events-none" style={{ left: `${i * 10}%` }}>
                                <span className="text-[9px] text-muted-foreground ml-1 top-0 absolute">{frame}f</span>
                            </div>
                        );
                    })}

                    <div className="p-2 space-y-1 mt-4 pointer-events-none z-10">
                        {objects.map(obj => {
                            const objKeyframes = getKeyframesForObject(obj.id);
                            return (
                                <div key={obj.id} className="h-6 flex items-center bg-[#222] rounded px-2 relative group mt-1">
                                    <span className="text-[10px] text-muted-foreground w-20 truncate mr-2">{obj.name}</span>
                                    <div className="flex-1 h-full relative bg-[#1a1a1a] rounded overflow-hidden">
                                        {objKeyframes.map((k, i) => (
                                            <div
                                                key={k.id}
                                                className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full cursor-pointer pointer-events-auto ${k.id === selectedKeyframeId ? 'bg-yellow-500' : 'bg-blue-500'} hover:scale-150 transition-transform`}
                                                style={{ left: `${(k.time / duration) * 100}%` }}
                                                onClick={(e) => { e.stopPropagation(); selectKeyframe(k.id); }}
                                                onContextMenu={(e) => { e.preventDefault(); deleteKeyframe(k.id); toast.success('Keyframe deleted'); }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
