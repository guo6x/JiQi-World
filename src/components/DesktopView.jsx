import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Image, Stars, OrbitControls, Text, QuadraticBezierLine } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { getSphereLayout, getHelixLayout, getHelixLines } from '../utils/layouts';

// Constants
const SELECTED_SCALE = new THREE.Vector3(5, 5, 5); 
const NORMAL_SCALE = new THREE.Vector3(1.5, 1.5, 1.5); 
const LERP_SPEED_SELECTED = 4;
const LERP_SPEED_NORMAL = 2;

// Shared objects
const _vec3 = new THREE.Vector3();
const _dummyObj = new THREE.Object3D(); 
const _lookAtTarget = new THREE.Vector3();

function Photo({ url, date, position, isSelected, isHovered, onClick }) {
  const ref = useRef();
  const targetPosition = useRef(position);
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (!ref.current) return;
    const parent = ref.current.parent;
    if (!parent) return;

    if (isSelected) {
        parent.updateMatrixWorld(); 
        
        // Optimized: Reuse _vec3 to avoid cloning
        camera.getWorldDirection(_vec3);
        _vec3.multiplyScalar(8).add(camera.position);
        
        parent.worldToLocal(_vec3); 
        
        ref.current.position.lerp(_vec3, delta * LERP_SPEED_SELECTED);
        ref.current.lookAt(camera.position);
        ref.current.scale.lerp(SELECTED_SCALE, delta * LERP_SPEED_SELECTED);

    } else {
        ref.current.position.lerp(targetPosition.current, delta * LERP_SPEED_NORMAL);

        // Optimized: Reuse _lookAtTarget and _dummyObj
        _lookAtTarget.copy(ref.current.position).multiplyScalar(2); 
        
        _dummyObj.position.copy(ref.current.position);
        _dummyObj.lookAt(_lookAtTarget); 
        
        ref.current.quaternion.slerp(_dummyObj.quaternion, delta * LERP_SPEED_NORMAL);

        const targetScale = isHovered ? new THREE.Vector3(2.5, 2.5, 2.5) : NORMAL_SCALE;
        ref.current.scale.lerp(targetScale, delta * LERP_SPEED_NORMAL);
    }
  });

  useEffect(() => {
      targetPosition.current = position;
  }, [position]);

  return (
    <group ref={ref}>
        <Image 
            url={url} 
            transparent 
            opacity={1}
            side={THREE.DoubleSide}
            toneMapped={false} 
        />
        <mesh position={[0,0,-0.01]}>
            <planeGeometry args={[1.05, 1.05]} />
            <meshBasicMaterial 
                color={isSelected || isHovered ? [0, 10, 20] : [0, 0.5, 1]} 
                toneMapped={false}
                transparent 
                opacity={isSelected ? 0.8 : 0.3} 
            />
        </mesh>
        
        <Text
            position={[0, -0.7, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
        >
            {date}
        </Text>
    </group>
  );
}

function OrganicDNAConnectors({ memories, layoutMode, currentPositions }) {
    if (layoutMode !== 'HELIX') return null;

    const lines = useMemo(() => getHelixLines(memories.length), [memories.length]);

    return (
        <group>
            {lines.map((line, i) => {
                const start = currentPositions[line.start];
                const end = currentPositions[line.end];
                if (!start || !end) return null;

                const isBackbone = line.type === 'backbone';
                
                const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                const offsetAmount = isBackbone ? 0.8 : 0.2;
                const dir = new THREE.Vector3(mid.x, 0, mid.z).normalize();
                if (isBackbone) {
                     mid.add(dir.multiplyScalar(offsetAmount));
                } else {
                     mid.y += (Math.random() - 0.5) * offsetAmount;
                }

                return (
                    <QuadraticBezierLine
                        key={i}
                        start={start}
                        end={end}
                        mid={mid}
                        color={isBackbone ? [0, 8, 30] : [0, 4, 10]} 
                        lineWidth={isBackbone ? 4 : 2}
                        transparent
                        opacity={isBackbone ? 0.9 : 0.6}
                        toneMapped={false}
                    />
                );
            })}
        </group>
    );
}

function SceneContent({ memories, layoutMode, selectedId, hoveredId, onHover, cursorPos, rotationSpeed, rotateCoords }) {
    const groupRef = useRef();
    const { camera } = useThree();
    
    const spherePositions = useMemo(() => getSphereLayout(memories.length), [memories.length]);
    const helixPositions = useMemo(() => getHelixLayout(memories.length), [memories.length]);
    
    const currentPositions = layoutMode === 'SPHERE' ? spherePositions : helixPositions;

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // 1. Auto Rotation (Only when not manually rotating)
        if (!selectedId && !rotateCoords) {
            groupRef.current.rotation.y += delta * rotationSpeed;
        }

        // 2. Virtual Raycasting
        let bestId = null;
        let minDist = 0.05; 

        // Use cursorPos if available (POINT/VICTORY), otherwise null
        if (cursorPos) {
            const cursorNDC = new THREE.Vector3((cursorPos.x * 2) - 1, -(cursorPos.y * 2) + 1, 0.5);

            memories.forEach((mem, i) => {
                _vec3.copy(currentPositions[i]);
                _vec3.applyMatrix4(groupRef.current.matrixWorld); 
                _vec3.project(camera);

                const dx = _vec3.x - cursorNDC.x;
                const dy = _vec3.y - cursorNDC.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < minDist) {
                    minDist = dist;
                    bestId = mem.id;
                }
            });
        }

        if (bestId !== hoveredId) {
            onHover(bestId);
        }
    });

    return (
        <group ref={groupRef}>
            <OrganicDNAConnectors memories={memories} layoutMode={layoutMode} currentPositions={currentPositions} />
            
            {memories.map((mem, i) => (
                <Photo 
                    key={mem.id}
                    index={i}
                    url={mem.url || mem.image_url}
                    date={mem.memory_date}
                    position={currentPositions[i] || new THREE.Vector3(0,0,0)}
                    isSelected={selectedId === mem.id}
                    isHovered={hoveredId === mem.id}
                />
            ))}
        </group>
    );
}

function CameraController({ rotateCoords, controlsRef }) {
    useFrame(() => {
        if (rotateCoords && controlsRef.current) {
            // Joystick Logic
            // Center (0.5, 0.5) -> Speed 0
            // Right Edge (1.0) -> Speed +X
            // Left Edge (0.0) -> Speed -X
            
            const speedX = (rotateCoords.x - 0.5) * 0.05; // Sensitivity
            const speedY = (rotateCoords.y - 0.5) * 0.05;

            // Deadzone (small center area where it doesn't move)
            if (Math.abs(speedX) > 0.002) {
                const currentAzimuth = controlsRef.current.getAzimuthalAngle();
                // To rotate RIGHT (look right), we need to decrease Azimuth?
                // OrbitControls: Left-click drag left -> rotates camera right around target.
                // Let's test direction: -speedX usually feels natural (drag to spin).
                controlsRef.current.setAzimuthalAngle(currentAzimuth - speedX * 2);
            }

            if (Math.abs(speedY) > 0.002) {
                const currentPolar = controlsRef.current.getPolarAngle();
                controlsRef.current.setPolarAngle(currentPolar - speedY * 2);
            }
            
            controlsRef.current.update();
        }
    });
    return null;
}

export default function DesktopView({ memories, layoutMode, selectedId, hoveredId, onHover, rotationSpeed, zoomY, cursorPos, rotateCoords }) {
    const controlsRef = useRef();

    // Handle Zoom (Open Palm Scale) - Keep as useEffect for now or move to Frame?
    // Zoom is absolute mapping based on hand scale, so useEffect is fine.
    useEffect(() => {
        if (zoomY !== null && controlsRef.current) {
            // ... (keep existing zoom logic)
            // zoomY is actually "zoomScale" now (Hand Scale)
            // Scale ~0.05 (Far hand) -> Distance 50
            // Scale ~0.25 (Close hand) -> Distance 5
            
            // Clamp scale input to avoid extreme jumps
            const clampedScale = THREE.MathUtils.clamp(zoomY, 0.05, 0.25);
            
            const targetDist = THREE.MathUtils.mapLinear(clampedScale, 0.05, 0.25, 50, 5);
            
            // Lerp current distance
            const currentPos = controlsRef.current.object.position;
            const currentDist = currentPos.length();
            
            const newDist = THREE.MathUtils.lerp(currentDist, targetDist, 0.1);
            
            const dir = currentPos.clone().normalize();
            controlsRef.current.object.position.copy(dir.multiplyScalar(newDist));
            controlsRef.current.update();
        }
    }, [zoomY]);

    return (
        <div className="w-full h-full bg-black">
            <Canvas camera={{ position: [0, 0, 25], fov: 75 }} gl={{ toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}>
                <color attach="background" args={['#020205']} />
                <fog attach="fog" args={['#020205', 10, 60]} />
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                
                <SceneContent 
                    memories={memories} 
                    layoutMode={layoutMode} 
                    selectedId={selectedId} 
                    hoveredId={hoveredId}
                    onHover={onHover}
                    cursorPos={cursorPos}
                    rotationSpeed={rotationSpeed}
                    rotateCoords={rotateCoords}
                />

                <CameraController rotateCoords={rotateCoords} controlsRef={controlsRef} />

                <EffectComposer>
                    <Bloom 
                        luminanceThreshold={1} 
                        mipmapBlur 
                        intensity={1.5} 
                        radius={0.6}
                    />
                </EffectComposer>

                <OrbitControls 
                    ref={controlsRef}
                    makeDefault 
                    // Disable mouse if using hand rotation to avoid conflict
                    enabled={!rotateCoords}
                    autoRotate={!selectedId && !rotateCoords} 
                    autoRotateSpeed={rotationSpeed * 10} 
                    enableDamping
                    enableZoom={true}
                    enablePan={false}
                    maxDistance={50}
                    minDistance={5}
                />
            </Canvas>
        </div>
    );
}
