import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Mesh } from 'three'

interface DataCoreProps {
  stage: number
  notesCount: number
  linksCount: number
  stability: number
  evolutionRate: number
}

function CoreMesh({ stage, stability }: Pick<DataCoreProps, 'stage' | 'stability'>) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
      meshRef.current.rotation.x += 0.002
    }
  })

  const getStageColor = (stage: number) => {
    switch (stage) {
      case 1: return '#8B0000' // 熔核
      case 2: return '#2F4F4F' // 冷却岩壳
      case 3: return '#4B0082' // 云层包裹
      case 4: return '#006400' // 知识海环
      case 5: return '#FFD700' // 生态星核
      default: return '#4169E1'
    }
  }

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color={getStageColor(stage)}
        emissive={getStageColor(stage)}
        emissiveIntensity={0.2 + stability * 0.3}
        roughness={0.8 - stability * 0.5}
        metalness={0.1 + stability * 0.4}
      />
    </mesh>
  )
}

function OrbitRings({ linksCount }: Pick<DataCoreProps, 'linksCount'>) {
  const rings = Math.min(3, Math.floor(linksCount / 10) + 1)

  return (
    <>
      {Array.from({ length: rings }, (_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, i * Math.PI / 3]}>
          <torusGeometry args={[1.5 + i * 0.3, 0.02, 16, 100]} />
          <meshBasicMaterial color="#00FFFF" transparent opacity={0.6} />
        </mesh>
      ))}
    </>
  )
}

function ParticleField({ evolutionRate }: Pick<DataCoreProps, 'evolutionRate'>) {
  const particles = Array.from({ length: 50 }, (_i) => ({
    position: [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
    ] as [number, number, number],
  }))

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(particles.map(p => p.position).flat()), 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#FFFFFF"
        transparent
        opacity={0.8 * evolutionRate}
        sizeAttenuation
      />
    </points>
  )
}

export function DataCore(props: DataCoreProps) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <CoreMesh stage={props.stage} stability={props.stability} />
        <OrbitRings linksCount={props.linksCount} />
        <ParticleField evolutionRate={props.evolutionRate} />
        <OrbitControls enableZoom enablePan enableRotate />
      </Canvas>
    </div>
  )
}