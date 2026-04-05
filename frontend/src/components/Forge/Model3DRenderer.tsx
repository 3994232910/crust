import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

interface Model3DRendererProps {
  modelPath: string
  onModelClick?: (partName: string) => void
  initialView?: { position: [number, number, number], target: [number, number, number] }
}

function Model({ path, onClick, onError }: { path: string, onClick?: (partName: string) => void, onError: () => void }) {
  const [error, setError] = useState(false)
  
  try {
    const { scene } = useGLTF(path)
    
    return (
      <primitive 
        object={scene} 
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          const partName = e.object.name || 'unknown-part'
          onClick?.(partName)
        }}
      />
    )
  } catch (err) {
    if (!error) {
      setError(true)
      onError()
    }
    return null
  }
}

export function Model3DRenderer({ modelPath, onModelClick, initialView }: Model3DRendererProps) {
  const [loadError, setLoadError] = useState(false)

  if (loadError) {
    return (
      <div className="w-full h-96 border rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Failed to load 3D model</p>
          <p className="text-xs mt-1">{modelPath}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-96 border rounded-lg overflow-hidden bg-slate-900 relative">
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Loading 3D Model...
        </div>
      }>
        <Canvas camera={{ position: initialView?.position || [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Model 
            path={modelPath} 
            onClick={onModelClick}
            onError={() => setLoadError(true)}
          />
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
      </Suspense>
    </div>
  )
}
