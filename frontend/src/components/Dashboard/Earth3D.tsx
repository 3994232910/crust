/**
 * 3D地球核心组件
 * 使用react-three-fiber和Three.js实现可交互的3D地球
 */
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Mesh, ShaderMaterial, Vector3, Points } from 'three'

export interface EarthProps {
  stage: 'hadean' | 'archean' | 'phanerozoic'
  progress: number
  storageLevel: number
  activityIntensity: number
}

function EarthMesh({ stage, progress, storageLevel, activityIntensity }: EarthProps) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)

  const getStageColor = (currentStage: string, currentProgress: number) => {
    switch (currentStage) {
      case 'hadean':
        return {
          baseColor: [1.0, 0.4, 0.1],
          glowColor: [1.0, 0.2, 0.0],
          surfaceTemp: 0.9 + (currentProgress / 100) * 0.1,
        }
      case 'archean':
        const archeanProgress = currentProgress / 100
        return {
          baseColor: [
            0.4 + archeanProgress * 0.2,
            0.3 + archeanProgress * 0.2,
            0.25 + archeanProgress * 0.15,
          ],
          glowColor: [0.0, 0.4, 0.6],
          surfaceTemp: 0.5 - archeanProgress * 0.2,
        }
      case 'phanerozoic':
        const bioProgress = currentProgress / 100
        return {
          baseColor: [0.0, 0.3 + bioProgress * 0.3, 0.7 + bioProgress * 0.2],
          glowColor: [0.0, 0.8, 1.0],
          surfaceTemp: 0.3,
        }
      default:
        return {
          baseColor: [0.5, 0.5, 0.5],
          glowColor: [0.2, 0.2, 0.2],
          surfaceTemp: 0.5,
        }
    }
  }

  const stageColor = getStageColor(stage, progress)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001
      const scale = 1.0 + (Math.sin(state.clock.elapsedTime) * 0.02 * (activityIntensity / 100))
      meshRef.current.scale.set(scale, scale, scale)

      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      }
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef as any}
        uniforms={{
          uTime: { value: 0 },
          uProgress: { value: progress / 100 },
          uBaseColor: { value: new Vector3(...stageColor.baseColor) },
          uGlowColor: { value: new Vector3(...stageColor.glowColor) },
          uStageIndex: { value: stage === 'hadean' ? 0 : stage === 'archean' ? 1 : 2 },
          uStorageLevel: { value: storageLevel / 100 },
          uActivityIntensity: { value: activityIntensity / 100 },
          uSurfaceTemp: { value: stageColor.surfaceTemp },
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        wireframe={false}
      />
    </mesh>
  )
}

function Atmosphere({ storageLevel, stage }: Pick<EarthProps, 'storageLevel' | 'stage'>) {
  const meshRef = useRef<Mesh>(null)

  const getAtmosphereColor = () => {
    switch (stage) {
      case 'hadean':
        return [1.0, 0.2, 0.0]
      case 'archean':
        return [0.2, 0.6, 0.8]
      case 'phanerozoic':
        return [0.3, 0.9, 1.0]
      default:
        return [0.5, 0.5, 0.5]
    }
  }

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z -= 0.0005
    }
  })

  const atmosphereColor = getAtmosphereColor()
  const atmosphereThickness = 1.15 + (storageLevel / 100) * 0.1

  return (
    <>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <torusGeometry args={[atmosphereThickness, 0.02, 32, 100]} />
        <meshBasicMaterial
          color={atmosphereColor}
          emissive={atmosphereColor}
          emissiveIntensity={0.4 + (storageLevel / 100) * 0.4}
          transparent
          opacity={0.6 + (storageLevel / 100) * 0.2}
        />
      </mesh>

      <mesh position={[0, 0, 0]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[atmosphereThickness - 0.05, 0.01, 32, 100]} />
        <meshBasicMaterial
          color={atmosphereColor}
          emissive={atmosphereColor}
          emissiveIntensity={0.3 + (storageLevel / 100) * 0.3}
          transparent
          opacity={0.4 + (storageLevel / 100) * 0.2}
        />
      </mesh>
    </>
  )
}

function ActivityParticles({ activityIntensity, stage }: Pick<EarthProps, 'activityIntensity' | 'stage'>) {
  const particles = useRef<Points>(null)

  const getParticleColor = () => {
    switch (stage) {
      case 'hadean':
        return 0xff8800
      case 'archean':
        return 0x0088ff
      case 'phanerozoic':
        return 0x00ff88
      default:
        return 0xffffff
    }
  }

  useFrame(() => {
    if (particles.current && activityIntensity > 0) {
      particles.current.rotation.x += 0.002 * (activityIntensity / 100)
      particles.current.rotation.y += 0.003 * (activityIntensity / 100)
    }
  })

  return (
    <points ref={particles} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(generateParticlePositions(activityIntensity)), 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02 * (1 + activityIntensity / 100)}
        color={getParticleColor()}
        sizeAttenuation
        transparent
        opacity={0.6 * (activityIntensity / 100)}
      />
    </points>
  )
}

function generateParticlePositions(intensity: number): number[] {
  const positions: number[] = []
  const count = Math.floor(50 + (intensity / 100) * 50)

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const elevation = (Math.random() - 0.5) * Math.PI
    const radius = 1.1 + Math.random() * 0.3

    positions.push(
      Math.cos(elevation) * Math.cos(angle) * radius,
      Math.sin(elevation) * radius,
      Math.cos(elevation) * Math.sin(angle) * radius,
    )
  }

  return positions
}

export function Earth3D(props: EarthProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#000814' }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.3} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, 5]} intensity={0.3} color="cyan" />

        <EarthMesh {...props} />
        <Atmosphere storageLevel={props.storageLevel} stage={props.stage} />
        <ActivityParticles activityIntensity={props.activityIntensity} stage={props.stage} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={2}
          enableZoom
          enablePan
        />
      </Canvas>
    </div>
  )
}

const vertexShader = `
  uniform float uProgress;
  uniform float uSurfaceTemp;
  varying vec3 vNormal;
  varying float vDepth;
  varying float vNoise;

  float noise(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453) * 2.0 - 1.0;
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vDepth = length(position);

    vec3 pos = position;
    
    if (uSurfaceTemp > 0.7) {
      vNoise = noise(position + vec3(sin(uTime * 0.001), cos(uTime * 0.001), 0.0));
      pos += normal * 0.02 * sin(uTime * 0.002 + position.x * 10.0) * uSurfaceTemp;
    }
    else {
      vNoise = noise(position * 3.0);
      pos += normal * 0.01 * vNoise * (1.0 - uSurfaceTemp);
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform vec3 uBaseColor;
  uniform vec3 uGlowColor;
  uniform float uProgress;
  uniform int uStageIndex;
  uniform float uStorageLevel;
  uniform float uActivityIntensity;
  uniform float uTime;
  
  varying vec3 vNormal;
  varying float vDepth;
  varying float vNoise;

  void main() {
    vec3 light = normalize(vec3(1.0, 1.0, 1.0));
    float diffuse = dot(vNormal, light) * 0.5 + 0.5;

    vec3 viewDir = normalize(-vNormal);
    float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.0);
    fresnel = smoothstep(0.0, 1.0, fresnel);

    vec3 finalColor = mix(vec3(0.1), uBaseColor, diffuse);

    if (uStageIndex == 0) {
      vec3 lavaColor = mix(uBaseColor, vec3(1.0, 0.2, 0.0), vNoise * 0.8);
      finalColor += lavaColor * vNoise * 0.5;
    }
    else if (uStageIndex == 2) {
      vec3 landColor = mix(uBaseColor, vec3(0.2, 0.6, 0.2), vNoise * 0.6);
      finalColor = mix(finalColor, landColor, uProgress * 0.5);
    }

    vec3 glow = uGlowColor * (uStorageLevel * 0.3 + uActivityIntensity * 0.5);
    finalColor += glow * fresnel * 0.4;

    finalColor += vec3(sin(uTime * 0.003) * 0.1) * uActivityIntensity;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`