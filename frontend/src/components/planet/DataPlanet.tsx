import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import type { EvolutionStage } from '@/types/dashboard'

interface DataPlanetProps {
  stage: EvolutionStage
  onStageChange?: (stage: EvolutionStage) => void
}

function PlanetCore({ stage }: { stage: EvolutionStage }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    const colors = {
      hadean: '#8B0000', // 暗红
      archean: '#2F4F4F', // 深灰
      phanerozoic: '#4169E1', // 蓝色
    }
    return new THREE.MeshStandardMaterial({
      color: colors[stage],
      roughness: 0.8,
      metalness: 0.2,
    })
  }, [stage])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <Sphere ref={meshRef} args={[2, 64, 64]}>
      <primitive object={material} />
    </Sphere>
  )
}

function OrbitRings({ stage }: { stage: EvolutionStage }) {
  const ringCount = stage === 'phanerozoic' ? 3 : stage === 'archean' ? 2 : 1

  return (
    <>
      {Array.from({ length: ringCount }, (_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3 + i * 0.5, 3.2 + i * 0.5, 64]} />
          <meshBasicMaterial color="#009688" transparent opacity={0.3} />
        </mesh>
      ))}
    </>
  )
}

function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null)

  const particles = useMemo(() => {
    const count = 1000
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }

    return positions
  }, [])

  useFrame(() => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.001
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#009688" transparent opacity={0.6} />
    </points>
  )
}

export function DataPlanet({ stage }: DataPlanetProps) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <PlanetCore stage={stage} />
        <OrbitRings stage={stage} />
        <ParticleField />
        <OrbitControls enableZoom enablePan={false} enableRotate />
      </Canvas>
    </div>
  )
}