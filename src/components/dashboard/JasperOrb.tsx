'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function WireframeSphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  const pointsRef = useRef<THREE.Points>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.x += delta * 0.08
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y -= delta * 0.15
      pointsRef.current.rotation.x += delta * 0.05
    }
  })

  // Vertex dots on the sphere surface
  const dotPositions = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.05, 2)
    return geo.attributes.position.array
  }, [])

  return (
    <group>
      {/* Outer glow sphere */}
      <mesh>
        <sphereGeometry args={[1.35, 32, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>

      {/* Wireframe sphere */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshBasicMaterial
          color="#10b981"
          wireframe
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Inner glowing core */}
      <mesh>
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.18} />
      </mesh>

      {/* Core bright center */}
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#6ee7b7" transparent opacity={0.45} />
      </mesh>

      {/* Vertex dots */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dotPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial color="#34d399" size={0.045} transparent opacity={0.9} />
      </points>

      {/* Second slower rotating ring */}
      <mesh rotation={[Math.PI / 2.5, 0, 0]}>
        <torusGeometry args={[1.25, 0.004, 8, 80]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 4, Math.PI / 6, 0]}>
        <torusGeometry args={[1.15, 0.003, 8, 80]} />
        <meshBasicMaterial color="#059669" transparent opacity={0.2} />
      </mesh>
    </group>
  )
}

export function JasperOrb({ size = 280 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="relative">
      {/* Background glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 50%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.1} />
        <pointLight position={[2, 2, 2]} color="#10b981" intensity={0.8} />
        <pointLight position={[-2, -1, -2]} color="#34d399" intensity={0.4} />
        <WireframeSphere />
      </Canvas>
    </div>
  )
}
