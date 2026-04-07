import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useState, useEffect, useMemo, Component, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { OpenAPI } from '@/client'

interface Model3DRendererProps {
  modelPath: string
  onModelClick?: (partName: string) => void
  initialView?: { position: [number, number, number], target: [number, number, number] }
}

function resolveModelPath(path: string): string {
  if (!path || /^(https?:)?\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path
  }

  if (!path.startsWith('/')) {
    return path
  }

  if (!OpenAPI.BASE) {
    return path
  }

  try {
    const backendBase = new URL(OpenAPI.BASE, window.location.origin)
    if (backendBase.origin === window.location.origin) {
      return path
    }
    return `${backendBase.origin}${path}`
  } catch {
    return path
  }
}

class ErrorBoundary extends Component<{ children: ReactNode, onError: () => void }, { hasError: boolean }> {
  constructor(props: { children: ReactNode, onError: () => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('Model loading error:', error)
    this.props.onError()
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

function ModelContent({ path, onClick }: { path: string, onClick?: (partName: string) => void }) {
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
}

export function Model3DRenderer({ modelPath, onModelClick, initialView }: Model3DRendererProps) {
  const [error, setError] = useState(false)
  const resolvedModelPath = useMemo(() => resolveModelPath(modelPath), [modelPath])

  useEffect(() => {
    console.log('Loading model from:', resolvedModelPath)
    setError(false)
  }, [resolvedModelPath])

  if (error) {
    return (
      <div className="w-full h-96 border rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Failed to load 3D model</p>
          <p className="text-xs mt-1">{resolvedModelPath}</p>
          <button 
            onClick={() => setError(false)}
            className="mt-2 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
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
          <ErrorBoundary onError={() => setError(true)}>
            <ModelContent 
              path={resolvedModelPath} 
              onClick={onModelClick}
            />
          </ErrorBoundary>
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
      </Suspense>
    </div>
  )
}
