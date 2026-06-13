'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';

// A slow gold wireframe terrain: a price surface rippling under depth fog.
// Deliberately restrained, no literal candlesticks or neon. Reads as market data.

const GOLD = '#ca8a04';
const GOLD_DIM = '#7a5206';

function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(34, 22, 80, 52), []);
  const basePositions = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry]);

  useFrame((state) => {
    if (typeof document !== 'undefined' && document.hidden) return; // pause when tab hidden
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime * 0.22;
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = basePositions[i * 3];
      const y = basePositions[i * 3 + 1];
      const z =
        Math.sin(x * 0.35 + t) * 0.9 +
        Math.cos(y * 0.4 + t * 0.8) * 0.7 +
        Math.sin((x + y) * 0.18 + t * 1.3) * 0.5;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    mesh.rotation.z = Math.sin(t * 0.1) * 0.04;
  });

  const meshProps: ThreeElements['mesh'] = { ref: meshRef, geometry, rotation: [-Math.PI / 2.35, 0, 0], position: [0, -1.5, 0] };

  return (
    <mesh {...meshProps}>
      <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.55} />
    </mesh>
  );
}

function StaticTerrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(34, 22, 60, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.35) * 0.9 + Math.cos(y * 0.4) * 0.7);
    }
    pos.needsUpdate = true;
    return geo;
  }, []);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2.35, 0, 0]} position={[0, -1.5, 0]}>
      <meshBasicMaterial color={GOLD_DIM} wireframe transparent opacity={0.4} />
    </mesh>
  );
}

export default function HeroCanvas({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 2]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 4.2, 9], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#0a0a0a']} />
      <fog attach="fog" args={['#0a0a0a', 9, 20]} />
      {reducedMotion ? <StaticTerrain /> : <Terrain />}
    </Canvas>
  );
}
