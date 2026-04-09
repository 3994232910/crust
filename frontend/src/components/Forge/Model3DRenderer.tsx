import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import { Suspense, useState, useEffect, useMemo, useRef, useCallback, Component, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { OpenAPI } from '@/client'
import { RadialMenu } from './RadialMenu'

interface Model3DRendererProps {
  modelPath: string
  onModelClick?: (partName: string) => void
  initialView?: { position: [number, number, number], target: [number, number, number] }
}

interface LightConfig {
  ambient: number
  hemisphere: { skyColor: string, groundColor: string, intensity: number }
  directional: Array<{ position: [number, number, number], intensity: number, color: string }>
  environment: string
}

const DEFAULT_LIGHT_CONFIG: LightConfig = {
  ambient: 0.5,
  hemisphere: { skyColor: '#ffffff', groundColor: '#444444', intensity: 0.4 },
  directional: [
    { position: [5, 10, 5], intensity: 1.0, color: '#ffffff' },
    { position: [-5, 5, -5], intensity: 0.5, color: '#ffeedd' }
  ],
  environment: 'studio'
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

function ScreenshotCapture({ onCapture, captureTrigger }: { onCapture: (screenshot: string) => void, captureTrigger: number }) {
  const { gl } = useThree()

  useEffect(() => {
    if (captureTrigger > 0) {
      const dataURL = gl.domElement.toDataURL('image/jpeg', 0.8)
      onCapture(dataURL)
    }
  }, [captureTrigger, gl, onCapture])

  return null
}

function ModelControls({ lightConfig }: { lightConfig: LightConfig }) {
  const { gl } = useThree()

  useEffect(() => {
    gl.toneMappingExposure = lightConfig.ambient
  }, [gl, lightConfig.ambient])

  return null
}

function useAILightOptimization() {
  const [lightConfig, setLightConfig] = useState<LightConfig>(DEFAULT_LIGHT_CONFIG)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [captureTrigger, setCaptureTrigger] = useState(0)
  const optimizationCountRef = useRef(0)

  const captureScreenshot = useCallback((dataURL: string) => {
    setScreenshot(dataURL)
  }, [])

  const requestAIOptimization = async (currentScreenshot: string, iteration: number = 1) => {
    setIsOptimizing(true)

    try {
      const token = localStorage.getItem('access_token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/v1/forge/ai-auto-optimize-light', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          screenshot: currentScreenshot,
          currentConfig: lightConfig,
          iteration
        })
      })

      if (!response.ok) throw new Error('AI optimization failed')

      const data = await response.json()
      if (data.config) {
        setLightConfig(prev => ({ ...prev, ...data.config }))

        if (data.shouldContinue && iteration < 3) {
          optimizationCountRef.current = iteration + 1
          setCaptureTrigger(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('AI auto optimization failed:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  const autoOptimizeOnLoad = useCallback(() => {
    optimizationCountRef.current = 1
    setCaptureTrigger(1)
  }, [])

  const handleScreenshotReady = useCallback((dataURL: string) => {
    captureScreenshot(dataURL)
    requestAIOptimization(dataURL, optimizationCountRef.current)
  }, [])

  const requestAILightAdjustment = async (feedback: string) => {
    setIsOptimizing(true)

    const currentScreenshot = screenshot || ''

    try {
      const token = localStorage.getItem('access_token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/v1/forge/ai-adjust-light-with-screenshot', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          feedback,
          currentConfig: lightConfig,
          screenshot: currentScreenshot
        })
      })

      if (!response.ok)  throw new Error('AI adjustment failed')

      const data = await response.json()
      if (data.config) {
        setLightConfig(prev => ({ ...prev, ...data.config }))
      }
    } catch (error) {
      console.error('AI light adjustment failed:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleRadialMenuAction = async (action: string) => {
    const actionMap: Record<string, string> = {
      'brighter': '整体画面太暗了，需要增加亮度',
      'darker': '画面太亮了，需要降低亮度',
      'left-light': '左侧区域光照不足，需要左侧补光',
      'right-light': '右侧区域光照不足，需要右侧补光',
      'soft-light': '光照太生硬，需要更柔和的光线',
      'reset': '重置为默认光照配置'
    }

    if (action === 'reset') {
      setLightConfig(DEFAULT_LIGHT_CONFIG)
      return
    }

    const feedback = actionMap[action]
    if (feedback) {
      await requestAILightAdjustment(feedback)
    }
  }

  return {
    lightConfig,
    isOptimizing,
    autoOptimizeOnLoad,
    handleRadialMenuAction,
    handleScreenshotReady,
    captureTrigger
  }
}

export function Model3DRenderer({ modelPath, onModelClick, initialView }: Model3DRendererProps) {
  const [error, setError] = useState(false)
  const resolvedModelPath = useMemo(() => resolveModelPath(modelPath), [modelPath])
  const containerRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ x: 50, y: 50 })

  const {
    lightConfig,
    isOptimizing,
    autoOptimizeOnLoad,
    handleRadialMenuAction,
    handleScreenshotReady,
    captureTrigger
  } = useAILightOptimization()

  useEffect(() => {
    console.log('Loading model from:', resolvedModelPath)
    setError(false)

    if (resolvedModelPath) {
      autoOptimizeOnLoad()
    }
  }, [resolvedModelPath])

  useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMenuPosition({
          x: rect.width - 60,
          y: 60
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [])

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
    <div ref={containerRef} className="w-full h-96 border rounded-lg overflow-hidden bg-slate-900 relative">
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Loading 3D Model...
        </div>
      }>
        <Canvas camera={{ position: initialView?.position || [0, 0, 5] }}>
          <ambientLight intensity={lightConfig.ambient} />
          <hemisphereLight 
            args={[lightConfig.hemisphere.skyColor, lightConfig.hemisphere.groundColor, lightConfig.hemisphere.intensity]} 
          />
          {lightConfig.directional.map((light, index) => (
            <directionalLight
              key={index}
              position={light.position}
              intensity={light.intensity}
              color={light.color}
            />
          ))}
          <Environment preset={lightConfig.environment as any} />
          <ModelControls lightConfig={lightConfig} />
          <ScreenshotCapture 
            onCapture={handleScreenshotReady} 
            captureTrigger={captureTrigger} 
          />
          <ErrorBoundary onError={() => setError(true)}>
            <ModelContent 
              path={resolvedModelPath} 
              onClick={onModelClick}
            />
          </ErrorBoundary>
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
      </Suspense>

      <RadialMenu 
        onSelect={handleRadialMenuAction}
        position={menuPosition}
      />

      {isOptimizing && (
        <div className="absolute top-4 left-4 px-3 py-2 bg-slate-800/90 border border-slate-600 
          rounded-lg text-xs text-white backdrop-blur-sm flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          AI 优化光照中...
        </div>
      )}
    </div>
  )
}
