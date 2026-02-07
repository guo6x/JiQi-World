import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Image, Stars, DeviceOrientationControls, Text, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { getSphereLayout } from '../utils/layouts';
import { config } from '../config';

// Constants
const NORMAL_SCALE = new THREE.Vector3(1.2, 1.2, 1.2);
const SELECTED_SCALE = new THREE.Vector3(4, 4, 4);

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-24 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
            />
        </div>
        <p className="text-cyan-400 text-xs font-mono tracking-widest">{Math.round(progress)}%</p>
      </div>
    </Html>
  );
}

function MobilePhoto({ url, date, position, isSelected, onClick }) {
    const ref = useRef();
    const targetPosition = useRef(position);
    const { camera } = useThree();

    useFrame((state, delta) => {
        if (!ref.current) return;
        
        if (isSelected) {
            // Move to front of camera
            const targetPos = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(8));
            ref.current.position.lerp(targetPos, delta * 4);
            ref.current.lookAt(camera.position);
            ref.current.scale.lerp(SELECTED_SCALE, delta * 4);
        } else {
            ref.current.position.lerp(targetPosition.current, delta * 2);
            ref.current.lookAt(new THREE.Vector3(0,0,0)); // Look at center
            ref.current.scale.lerp(NORMAL_SCALE, delta * 2);
        }
    });
    
    // Safety check for url
    if (!url) return null;

    return (
        <group ref={ref} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <Image 
                url={url} 
                transparent 
                side={THREE.DoubleSide}
            />
            {!isSelected && (
                <Text
                    position={[0, -0.6, 0]}
                    fontSize={0.15}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    {date}
                </Text>
            )}
        </group>
    );
}

function MobileSceneContent({ memories, selectedId, onSelect }) {
    const spherePositions = useMemo(() => getSphereLayout(memories.length), [memories.length]);

    return (
        <group>
            {memories.map((mem, i) => (
                <MobilePhoto 
                    key={mem.id}
                    url={mem.url || mem.image_url}
                    date={mem.memory_date}
                    position={spherePositions[i] || new THREE.Vector3(0,0,0)}
                    isSelected={selectedId === mem.id}
                    onClick={() => onSelect(mem.id === selectedId ? null : mem.id)}
                />
            ))}
        </group>
    );
}

export default function Mobile3DScene({ memories, onClose }) {
    const [selectedId, setSelectedId] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);

    const requestAccess = async () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    setPermissionGranted(true);
                } else {
                    alert("需要陀螺仪权限才能体验 3D 模式");
                }
            } catch (e) {
                console.error(e);
                // Non-iOS 13+ devices might fail here but work automatically
                setPermissionGranted(true); 
            }
        } else {
            // Non-iOS devices usually don't need permission
            setPermissionGranted(true);
        }
    };

    if (!permissionGranted) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center space-y-8">
                 <h2 className="text-3xl font-light text-cyan-400 tracking-widest animate-pulse">{config.mobile3DTitle}</h2>
                 <p className="text-gray-400 text-sm leading-relaxed">
                     {config.mobile3DSubtitle}<br/>
                     {config.mobile3DInstruction}
                 </p>
                 <div className="flex gap-4">
                     <button 
                        onClick={onClose}
                        className="px-6 py-2 border border-white/20 rounded-full text-white/60 text-sm"
                     >
                         返回列表
                     </button>
                     <button 
                        onClick={requestAccess}
                        className="px-8 py-2 bg-cyan-500/20 border border-cyan-400/50 rounded-full text-cyan-300 font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                     >
                         {config.mobile3DButton}
                     </button>
                 </div>
            </div>
        );
    }

    const selectedMem = memories.find(m => m.id === selectedId);

    return (
        <div className="fixed inset-0 z-50 bg-black">
            <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
                <color attach="background" args={['#000']} />
                <Stars radius={100} depth={50} count={2000} factor={4} fade />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                
                <MobileSceneContent 
                    memories={memories} 
                    selectedId={selectedId} 
                    onSelect={setSelectedId} 
                />

                <DeviceOrientationControls />
            </Canvas>

            {/* HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-cyan-400 text-xs tracking-[0.3em] font-mono">SYSTEM: ONLINE</h1>
                        <p className="text-white/30 text-[10px] mt-1 font-mono">GYRO: ACTIVE</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="pointer-events-auto px-4 py-1 border border-red-500/30 bg-red-500/10 rounded text-red-400 text-xs backdrop-blur-md"
                    >
                        EXIT
                    </button>
                </div>

                {/* Central Crosshair when idle */}
                {!selectedId && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-white/20 rounded-full flex items-center justify-center opacity-30">
                        <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                    </div>
                )}

                {/* Detail View Overlay */}
                {selectedMem && (
                    <div className="absolute bottom-10 left-4 right-4 bg-black/60 backdrop-blur-md border border-cyan-500/30 p-4 rounded-lg pointer-events-auto">
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-cyan-300 text-xs font-mono tracking-widest">{selectedMem.memory_date}</span>
                            <button 
                                onClick={() => setSelectedId(null)}
                                className="text-white/50 text-xs px-2 py-1 border border-white/10 rounded"
                            >
                                CLOSE
                            </button>
                        </div>
                        <p className="text-white text-sm font-light leading-relaxed">{selectedMem.description}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
