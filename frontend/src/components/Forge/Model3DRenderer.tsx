import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useState, useEffect, useMemo, useRef, useCallback, Component, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Vector3, Box3 } from 'three'
import type { Group } from 'three'
import { OpenAPI } from '@/client'
import { RadialMenu } from './RadialMenu'

interface Model3DRendererProps {
  modelPath: string
  onModelClick?: (partName: string) => void
  initialView?: { position: [number, number, number], target: [number, number, number] }
}

// ─── Per-model view persistence ───────────────────────────────────────────────
function getViewStorageKey(modelPath: string): string {
  return 'forge_model_view_' + modelPath.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function getModelThumbnailKey(modelPath: string): string {
  return 'forge_model_screenshot_' + modelPath.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function saveThumbnailToStorage(modelPath: string, dataURL: string): void {
  try { localStorage.setItem(getModelThumbnailKey(modelPath), dataURL) } catch {}
}

function loadSavedView(modelPath: string): CameraTarget | null {
  try {
    const raw = localStorage.getItem(getViewStorageKey(modelPath))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.position) && Array.isArray(parsed?.target)) {
      return parsed as CameraTarget
    }
    return null
  } catch { return null }
}

function saveView(modelPath: string, view: CameraTarget): void {
  try {
    localStorage.setItem(getViewStorageKey(modelPath), JSON.stringify(view))
  } catch {}
}

interface LightConfig {
  ambient: number
  hemisphere: { skyColor: string, groundColor: string, intensity: number }
  directional: Array<{ position: [number, number, number], intensity: number, color: string }>
  environment: string
}

const DEFAULT_LIGHT_CONFIG: LightConfig = {
  ambient: 1.0,
  hemisphere: { skyColor: '#ffffff', groundColor: '#888888', intensity: 0.8 },
  directional: [
    { position: [5, 10, 5], intensity: 1.5, color: '#ffffff' },
    { position: [-5, 5, -5], intensity: 0.8, color: '#ffeedd' }
  ],
  environment: 'studio'
}

export function resolveModelPath(path: string): string {
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

function ModelContent({ path, onClick, onLoaded, onSceneReady }: {
  path: string
  onClick?: (partName: string) => void
  onLoaded?: () => void
  onSceneReady?: (scene: Group) => void
}) {
  const { scene } = useGLTF(path)
  const loadedRef = useRef(false)
  const onSceneReadyRef = useRef(onSceneReady)
  onSceneReadyRef.current = onSceneReady

  useEffect(() => {
    if (scene && !loadedRef.current) {
      loadedRef.current = true
      onSceneReadyRef.current?.(scene as unknown as Group)
      // 等两帧，确保 Three.js 完成首次渲染后再截图
      requestAnimationFrame(() => requestAnimationFrame(() => onLoaded?.()))
    }
  }, [scene, onLoaded])

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
  const { invalidate } = useThree()
  const pendingCapture = useRef(false)
  const onCaptureRef = useRef(onCapture)
  onCaptureRef.current = onCapture

  useEffect(() => {
    if (captureTrigger > 0) {
      pendingCapture.current = true
      invalidate()
    }
  }, [captureTrigger, invalidate])

  // 在 useFrame 内手动 render 再立即读取，确保 canvas 有内容
  useFrame(({ gl, scene, camera }) => {
    if (!pendingCapture.current) return
    pendingCapture.current = false
    gl.render(scene, camera)
    const dataURL = gl.domElement.toDataURL('image/jpeg', 0.85)
    onCaptureRef.current(dataURL)
  })

  return null
}

/** Captures a frame and saves it to localStorage as the model thumbnail. */
function ThumbnailCapture({ modelPath, trigger }: { modelPath: string; trigger: number }) {
  const { invalidate } = useThree()
  const pending = useRef(false)

  useEffect(() => {
    if (trigger > 0) { pending.current = true; invalidate() }
  }, [trigger, invalidate])

  useFrame(({ gl, scene, camera }) => {
    if (!pending.current) return
    pending.current = false
    gl.render(scene, camera)
    const dataURL = gl.domElement.toDataURL('image/jpeg', 0.85)
    saveThumbnailToStorage(modelPath, dataURL)
  })
  return null
}

function ModelControls({ lightConfig, manualExposure }: { lightConfig: LightConfig; manualExposure: number }) {
  const { gl } = useThree()

  useEffect(() => {
    gl.toneMappingExposure = 1.0
  }, [gl])

  useEffect(() => {
    gl.toneMappingExposure = manualExposure
  }, [gl, manualExposure])

  return null
}

interface CameraTarget {
  position: [number, number, number]
  target: [number, number, number]
}

function CameraAnimator({
  target,
  orbitRef,
  onDone,
}: {
  target: CameraTarget | null
  orbitRef: React.RefObject<any>
  onDone: () => void
}) {
  const { camera, invalidate } = useThree()
  const animating = useRef(false)

  useEffect(() => {
    if (target) {
      animating.current = true
      invalidate()
    }
  }, [target, invalidate])

  useFrame(() => {
    if (!animating.current || !target) return

    const destPos = new Vector3(...target.position)
    const destLook = new Vector3(...target.target)

    camera.position.lerp(destPos, 0.07)

    const controls = orbitRef.current
    if (controls?.target) {
      controls.target.lerp(destLook, 0.07)
      controls.update()
    }

    const posClose = camera.position.distanceTo(destPos) < 0.05
    const lookClose = !controls?.target || controls.target.distanceTo(destLook) < 0.05

    if (posClose && lookClose) {
      animating.current = false
      onDone()
    } else {
      invalidate()
    }
  })

  return null
}

// ─── Applies a saved view (position + orbit target) once OrbitControls is ready
function SavedViewApplier({
  view,
  orbitRef,
  onApplied,
}: {
  view: CameraTarget
  orbitRef: React.RefObject<any>
  onApplied: () => void
}) {
  const { camera, invalidate } = useThree()
  const applied = useRef(false)
  const onAppliedRef = useRef(onApplied)
  onAppliedRef.current = onApplied

  // useFrame guarantees OrbitControls ref is already set
  useFrame(() => {
    if (applied.current || !orbitRef.current?.target) return
    applied.current = true
    camera.position.set(...view.position)
    orbitRef.current.target.set(...view.target)
    orbitRef.current.update()
    invalidate()
    onAppliedRef.current()
  })

  return null
}

// ─── Fits camera to model bounding box with a 45° elevated angle (first load)
function BBoxCameraFitter({
  scene,
  orbitRef,
  onFitted,
}: {
  scene: Group | null
  orbitRef: React.RefObject<any>
  onFitted: (view: CameraTarget) => void
}) {
  const { camera, invalidate } = useThree()
  const fitted = useRef(false)
  const onFittedRef = useRef(onFitted)
  onFittedRef.current = onFitted

  useFrame(() => {
    if (fitted.current || !scene || !orbitRef.current?.target) return
    fitted.current = true

    const box = new Box3().setFromObject(scene)
    if (box.isEmpty()) return

    const center = new Vector3()
    box.getCenter(center)
    const size = new Vector3()
    box.getSize(size)

    // Distance based on largest dimension so any scale looks right
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = Math.max(maxDim * 2.2, 0.5)

    // Front-right, slightly elevated — reveals depth nicely
    const dir = new Vector3(1, 0.75, 1).normalize()
    const newPos = center.clone().addScaledVector(dir, distance)

    camera.position.copy(newPos)
    orbitRef.current.target.copy(center)
    orbitRef.current.update()
    invalidate()

    onFittedRef.current({
      position: [newPos.x, newPos.y, newPos.z],
      target: [center.x, center.y, center.z],
    })
  })

  return null
}

function useAILightOptimization(
  hasSavedViewRef: React.RefObject<boolean>,
  onThumbnailCaptured?: (dataURL: string) => void,
) {
  const [lightConfig, setLightConfig] = useState<LightConfig>(DEFAULT_LIGHT_CONFIG)
  const [manualExposure, setManualExposure] = useState(1.0)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isOptimizingView, setIsOptimizingView] = useState(false)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [captureTrigger, setCaptureTrigger] = useState(0)
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null)
  const optimizationCountRef = useRef(0)
  const currentCameraRef = useRef<CameraTarget>({ position: [5, 5, 5], target: [0, 0, 0] })
  // Stub ref populated after requestAIViewOptimization is defined below
  const requestAIViewOptimizationRef = useRef<(s?: string) => Promise<void>>(async () => {})

  const onThumbnailCapturedRef = useRef(onThumbnailCaptured)
  onThumbnailCapturedRef.current = onThumbnailCaptured

  const captureScreenshot = useCallback((dataURL: string) => {
    setScreenshot(dataURL)
    onThumbnailCapturedRef.current?.(dataURL)
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

  const requestAIOptimizationRef = useRef(requestAIOptimization)
  requestAIOptimizationRef.current = requestAIOptimization

  const handleScreenshotReady = useCallback((dataURL: string) => {
    captureScreenshot(dataURL)
    requestAIOptimizationRef.current(dataURL, optimizationCountRef.current)
    // Auto-optimize view on first load only if user hasn't set a custom view
    if (!hasSavedViewRef.current) {
      requestAIViewOptimizationRef.current(dataURL)
    }
  }, [captureScreenshot, hasSavedViewRef])

  const requestAIViewOptimization = async (screenshotOverride?: string) => {
    const screenshotToUse = screenshotOverride ?? screenshot
    if (!screenshotToUse) return
    setIsOptimizingView(true)

    try {
      const token = localStorage.getItem('access_token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/v1/forge/ai-optimize-view', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          screenshot: screenshotToUse,
          currentCamera: currentCameraRef.current,
        })
      })

      if (!response.ok) throw new Error('AI view optimization failed')

      const data = await response.json()
      if (data.camera) {
        setCameraTarget(data.camera as CameraTarget)
      }
    } catch (error) {
      console.error('AI view optimization failed:', error)
    } finally {
      setIsOptimizingView(false)
    }
  }
  requestAIViewOptimizationRef.current = requestAIViewOptimization

  const handleRadialMenuAction = async (action: string) => {
    if (action === 'best-view') {
      await requestAIViewOptimization()
      return
    }

    if (action === 'reset') {
      setLightConfig(DEFAULT_LIGHT_CONFIG)
      setManualExposure(1.0)
      return
    }

    // 直接更新 state，即时生效，不走 AI
    switch (action) {
      case 'brighter':
        setManualExposure(prev => Math.min(prev + 0.3, 3.0))
        setLightConfig(prev => ({
          ...prev,
          directional: prev.directional.map(l => ({ ...l, intensity: Math.min(l.intensity + 0.4, 3.0) })),
        }))
        break
      case 'darker':
        setManualExposure(prev => Math.max(prev - 0.2, 0.2))
        setLightConfig(prev => ({
          ...prev,
          directional: prev.directional.map(l => ({ ...l, intensity: Math.max(l.intensity - 0.3, 0.1) })),
        }))
        break
      case 'left-light':
        setLightConfig(prev => ({
          ...prev,
          directional: [...prev.directional, { position: [-8, 6, 4] as [number, number, number], intensity: 1.0, color: '#e8f0ff' }],
        }))
        break
      case 'right-light':
        setLightConfig(prev => ({
          ...prev,
          directional: [...prev.directional, { position: [8, 6, 4] as [number, number, number], intensity: 1.0, color: '#e8f0ff' }],
        }))
        break
      case 'soft-light':
        setManualExposure(prev => Math.min(prev + 0.1, 3.0))
        setLightConfig(prev => ({
          ...prev,
          hemisphere: { ...prev.hemisphere, intensity: Math.min(prev.hemisphere.intensity + 0.3, 1.5) },
          directional: prev.directional.map(l => ({ ...l, intensity: Math.max(l.intensity - 0.15, 0.1) })),
        }))
        break
    }
  }

  return {
    lightConfig,
    manualExposure,
    isOptimizing,
    isOptimizingView,
    autoOptimizeOnLoad,
    handleRadialMenuAction,
    handleScreenshotReady,
    captureTrigger,
    cameraTarget,
    clearCameraTarget: () => setCameraTarget(null),
    currentCameraRef,
  }
}

export function Model3DRenderer({ modelPath, onModelClick, initialView }: Model3DRendererProps) {
  const [error, setError] = useState(false)
  const [contextLost, setContextLost] = useState(false)
  const resolvedModelPath = useMemo(() => resolveModelPath(modelPath), [modelPath])
  const containerRef = useRef<HTMLDivElement>(null)
  const orbitRef = useRef<any>(null)
  const [menuPosition, setMenuPosition] = useState({ x: 50, y: 50 })
  // 持有最新 setContextLost，供 onCreated 闭包使用
  const setContextLostRef = useRef(setContextLost)
  setContextLostRef.current = setContextLost

  // Per-model view memory
  const savedView = useMemo(() => loadSavedView(resolvedModelPath), [resolvedModelPath])
  const [userHasSavedView, setUserHasSavedView] = useState(() => savedView !== null)
  const userHasSavedViewRef = useRef(userHasSavedView)
  userHasSavedViewRef.current = userHasSavedView

  // User-orbit thumbnail trigger (fires after user releases the model)
  const [thumbnailTrigger, setThumbnailTrigger] = useState(0)

  // Scene for bbox fitting (set by ModelContent once loaded)
  const [loadedScene, setLoadedScene] = useState<Group | null>(null)

  const onThumbnailCaptured = useCallback((dataURL: string) => {
    saveThumbnailToStorage(resolvedModelPath, dataURL)
  }, [resolvedModelPath])

  const {
    lightConfig,
    manualExposure,
    isOptimizing,
    isOptimizingView,
    autoOptimizeOnLoad,
    handleRadialMenuAction,
    handleScreenshotReady,
    captureTrigger,
    cameraTarget,
    clearCameraTarget,
    currentCameraRef,
  } = useAILightOptimization(userHasSavedViewRef, onThumbnailCaptured)

  useEffect(() => {
    console.log('Loading model from:', resolvedModelPath)
    setError(false)
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

  if (error || contextLost) {
    return (
      <div className="w-full h-96 border rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">{contextLost ? 'WebGL context lost — GPU 资源不足' : 'Failed to load 3D model'}</p>
          <p className="text-xs mt-1 opacity-60">{resolvedModelPath}</p>
          <button
            onClick={() => { setError(false); setContextLost(false) }}
            className="mt-2 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-96 relative">
      <div className="absolute inset-0 border rounded-lg overflow-hidden bg-slate-900">
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Loading 3D Model...
        </div>
      }>
        <Canvas
          camera={{ position: savedView?.position ?? initialView?.position ?? [0, 0, 5] }}
          frameloop="always"
          gl={{ powerPreference: 'default', antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            // 在 webglcontextlost 事件层面截断死循环：
            // 若不处理，Three.js 抛错 → R3F remount → 新 Canvas → 立刻再次 lost → 无限循环
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault() // 阻止浏览器自动尝试恢复（避免 Three.js 触发 restore 循环）
              setContextLostRef.current(true) // 切到错误 UI，Canvas 从 DOM 移除，循环断开
            }, { once: true })
          }}
        >
          <ambientLight intensity={lightConfig.ambient} />
          <hemisphereLight
            color={lightConfig.hemisphere.skyColor as any}
            groundColor={lightConfig.hemisphere.groundColor as any}
            intensity={lightConfig.hemisphere.intensity}
          />
          {lightConfig.directional.map((light, index) => (
            <directionalLight
              key={index}
              position={light.position}
              intensity={light.intensity}
              color={light.color}
            />
          ))}
          {/* Environment HDR removed — CDN unreachable in CN; manual lights cover it */}
          <ModelControls lightConfig={lightConfig} manualExposure={manualExposure} />
          <CameraAnimator
            target={cameraTarget}
            orbitRef={orbitRef}
            onDone={clearCameraTarget}
          />
          {/* Apply saved view (sets orbit target) or fit to bounding box on first load */}
          {savedView ? (
            <SavedViewApplier
              view={savedView}
              orbitRef={orbitRef}
              onApplied={() => { currentCameraRef.current = savedView }}
            />
          ) : (
            <BBoxCameraFitter
              scene={loadedScene}
              orbitRef={orbitRef}
              onFitted={(view) => { currentCameraRef.current = view }}
            />
          )}
          <ScreenshotCapture
            onCapture={handleScreenshotReady}
            captureTrigger={captureTrigger}
          />
          <ThumbnailCapture modelPath={resolvedModelPath} trigger={thumbnailTrigger} />
          <ErrorBoundary onError={() => setError(true)}>
            <ModelContent
              path={resolvedModelPath}
              onClick={onModelClick}
              onLoaded={autoOptimizeOnLoad}
              onSceneReady={setLoadedScene}
            />
          </ErrorBoundary>
          <OrbitControls
            ref={orbitRef}
            enablePan
            enableZoom
            enableRotate
            onChange={() => {
              if (orbitRef.current) {
                const cam = orbitRef.current.object
                currentCameraRef.current = {
                  position: [cam.position.x, cam.position.y, cam.position.z],
                  target: [
                    orbitRef.current.target.x,
                    orbitRef.current.target.y,
                    orbitRef.current.target.z,
                  ],
                }
              }
            }}
            onEnd={() => {
              // Save view only on genuine user gesture (mouse/touch release),
              // not during programmatic CameraAnimator lerp which never fires onEnd
              if (orbitRef.current) {
                const cam = orbitRef.current.object
                const view: CameraTarget = {
                  position: [cam.position.x, cam.position.y, cam.position.z],
                  target: [
                    orbitRef.current.target.x,
                    orbitRef.current.target.y,
                    orbitRef.current.target.z,
                  ],
                }
                saveView(resolvedModelPath, view)
                setUserHasSavedView(true)
                setThumbnailTrigger((t) => t + 1)
              }
            }}
          />
        </Canvas>
      </Suspense>
      </div>

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

      {isOptimizingView && (
        <div className="absolute top-4 left-4 px-3 py-2 bg-slate-800/90 border border-slate-600
          rounded-lg text-xs text-white backdrop-blur-sm flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          AI 分析最佳视角中...
        </div>
      )}
    </div>
  )
}
