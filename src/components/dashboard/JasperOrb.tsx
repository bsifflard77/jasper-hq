'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Agent definitions ──────────────────────────────────────────────────────────
interface OrbAgent {
  id: string
  name: string
  emoji: string
  color: string        // tailwind color name
  hex: string          // hex for glow
  radius: number       // orbit radius in px
  duration: number     // seconds per orbit
  startDeg: number     // starting angle
  tiltX: number        // orbital plane tilt (deg)
}

const ORB_AGENTS: OrbAgent[] = [
  { id: 'beacon',    name: 'BEACON',    emoji: '📡', color: 'amber',   hex: '#f59e0b', radius: 170, duration: 9,  startDeg: 0,   tiltX: 12  },
  { id: 'navigator', name: 'NAVIGATOR', emoji: '🔭', color: 'blue',    hex: '#3b82f6', radius: 185, duration: 13, startDeg: 72,  tiltX: -18 },
  { id: 'rigger',    name: 'RIGGER',    emoji: '⚙️', color: 'orange',  hex: '#f97316', radius: 175, duration: 11, startDeg: 144, tiltX: 25  },
  { id: 'dev',       name: 'FORGE',     emoji: '💻', color: 'emerald', hex: '#10b981', radius: 180, duration: 15, startDeg: 216, tiltX: -8  },
  { id: 'fort',      name: 'ANCHOR',    emoji: '🏰', color: 'purple',  hex: '#a855f7', radius: 168, duration: 10, startDeg: 288, tiltX: 20  },
]

const STATUS_COLORS: Record<string, string> = {
  active:  '#34d399',
  queued:  '#60a5fa',
  blocked: '#f87171',
  idle:    '#64748b',
}

// ── Three.js core sphere ──────────────────────────────────────────────────────
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

  const dotPositions = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.05, 2)
    return geo.attributes.position.array as Float32Array
  }, [])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.35, 32, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.18} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#6ee7b7" transparent opacity={0.45} />
      </mesh>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dotPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#34d399" size={0.045} transparent opacity={0.9} />
      </points>
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

// ── Single orbiting agent badge ───────────────────────────────────────────────
function AgentBadge({ agent, status }: { agent: OrbAgent; status: string }) {
  const isActive = status === 'active'
  const isBlocked = status === 'blocked'
  const statusColor = STATUS_COLORS[status] ?? STATUS_COLORS.idle

  const animName = `orbit-${agent.id}`
  const css = `
    @keyframes ${animName} {
      from { transform: translate(-50%, -50%) rotate(${agent.startDeg}deg) translateX(${agent.radius}px) rotate(-${agent.startDeg}deg); }
      to   { transform: translate(-50%, -50%) rotate(${agent.startDeg + 360}deg) translateX(${agent.radius}px) rotate(-${agent.startDeg + 360}deg); }
    }
    .orbit-${agent.id} {
      animation: ${animName} ${agent.duration}s linear infinite;
    }
  `

  return (
    <>
      <style>{css}</style>
      <div
        className={`orbit-${agent.id} absolute top-1/2 left-1/2 flex flex-col items-center gap-0.5 cursor-pointer group`}
        style={{ transformOrigin: '50% 50%' }}
      >
        {/* Badge */}
        <div
          className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border backdrop-blur-sm transition-all duration-300"
          style={{
            background: `${agent.hex}15`,
            borderColor: `${agent.hex}50`,
            boxShadow: isActive ? `0 0 12px 2px ${agent.hex}40` : 'none',
          }}
        >
          {/* Status dot */}
          <div
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black/50"
            style={{
              backgroundColor: statusColor,
              boxShadow: isActive ? `0 0 6px ${statusColor}` : 'none',
              animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
          />
          {/* Emoji */}
          <span className="text-base leading-none">{agent.emoji}</span>
          {/* Name */}
          <span
            className="text-[8px] font-mono font-bold tracking-widest leading-none"
            style={{ color: agent.hex }}
          >
            {agent.name}
          </span>
          {/* Status label */}
          <span className="text-[7px] font-mono leading-none" style={{ color: statusColor }}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>
    </>
  )
}

// ── Orbit ring (decorative) ────────────────────────────────────────────────────
function OrbitRing({ radius, tiltX }: { radius: number; tiltX: number }) {
  const size = radius * 2
  return (
    <div
      className="absolute top-1/2 left-1/2 rounded-full border border-emerald-500/10 pointer-events-none"
      style={{
        width: size,
        height: size,
        transform: `translate(-50%, -50%) rotateX(${tiltX}deg)`,
        borderStyle: 'dashed',
      }}
    />
  )
}

// ── Main exported component ────────────────────────────────────────────────────
interface AgentStatus {
  id: string
  status: 'active' | 'queued' | 'idle' | 'blocked'
}

interface JasperOrbProps {
  size?: number
  agentStatuses?: AgentStatus[]
}

export function JasperOrb({ size = 280, agentStatuses = [] }: JasperOrbProps) {
  const containerSize = size + 220 // extra space for orbiting agents

  const getStatus = (agentId: string) => {
    return agentStatuses.find(a => a.id === agentId)?.status ?? 'idle'
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: containerSize, height: containerSize }}
    >
      {/* Orbit rings */}
      {ORB_AGENTS.map(agent => (
        <OrbitRing key={agent.id} radius={agent.radius} tiltX={agent.tiltX} />
      ))}

      {/* Central Three.js orb */}
      <div style={{ width: size, height: size }} className="relative z-10 flex-shrink-0">
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
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
        {/* Orb reflection */}
        <div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-28 h-3 rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)', filter: 'blur(4px)' }}
        />
      </div>

      {/* Orbiting agent badges */}
      {ORB_AGENTS.map(agent => (
        <AgentBadge key={agent.id} agent={agent} status={getStatus(agent.id)} />
      ))}
    </div>
  )
}
