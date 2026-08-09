"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PresentationControls, Environment, Text } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "next-themes";

function ContainerModel({ theme }: { theme: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isDark = theme !== "light";

  // Metallic dark material
  const material = new THREE.MeshStandardMaterial({
    color: isDark ? "#111111" : "#ffffff",
    metalness: 0.9,
    roughness: 0.2,
    envMapIntensity: 2,
  });

  const detailMaterial = new THREE.MeshStandardMaterial({
    color: isDark ? "#00f2fe" : "#2563eb",
    metalness: 0.5,
    roughness: 0.2,
    emissive: isDark ? "#00f2fe" : "#000000",
    emissiveIntensity: isDark ? 0.5 : 0,
  });

  useFrame((state) => {
    if (meshRef.current) {
      // Very subtle continuous rotation
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Main Container Body */}
      <mesh castShadow receiveShadow material={material}>
        <boxGeometry args={[4, 1.6, 1.6]} />
      </mesh>
      
      {/* End Caps / Doors */}
      <mesh position={[2.01, 0, 0]} material={detailMaterial}>
        <boxGeometry args={[0.02, 1.5, 1.5]} />
      </mesh>
      <mesh position={[-2.01, 0, 0]} material={detailMaterial}>
        <boxGeometry args={[0.02, 1.5, 1.5]} />
      </mesh>

      {/* VORIAN Logo on the side */}
      <Text
        position={[0, 0, 0.81]}
        fontSize={0.4}
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
        color={isDark ? "#ffffff" : "#000000"}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.2}
      >
        VORIAN
      </Text>
      
      {/* Decorative Ridges (Simulated with thin boxes) */}
      {[-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0, 0.805]} material={material}>
            <boxGeometry args={[0.1, 1.6, 0.02]} />
          </mesh>
          <mesh position={[x, 0, -0.805]} material={material}>
            <boxGeometry args={[0.1, 1.6, 0.02]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function InteractiveContainer3D() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="w-full h-full min-h-[400px] cursor-grab active:cursor-grabbing">
      <Canvas shadows camera={{ position: [0, 2, 6], fov: 45 }}>
        <color attach="background" args={["transparent"]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize={1024}
        />
        
        {/* Soft environment lighting for realistic metal reflections */}
        <Environment preset="city" />

        <PresentationControls
          global
          rotation={[0, -Math.PI / 4, 0]}
          polar={[-0.2, 0.2]}
          azimuth={[-Math.PI / 4, Math.PI / 4]}
          config={{ mass: 2, tension: 400, friction: 26 }}
          snap={{ mass: 4, tension: 400, friction: 40 }}
        >
          <Float
            speed={2} 
            rotationIntensity={0.5} 
            floatIntensity={1} 
            floatingRange={[-0.1, 0.1]}
          >
            <ContainerModel theme={resolvedTheme || 'dark'} />
          </Float>
        </PresentationControls>
      </Canvas>
    </div>
  );
}
