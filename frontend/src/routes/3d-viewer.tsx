import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Model3DRenderer } from '@/components/Forge/Model3DRenderer'

export const Route = createFileRoute('/3d-viewer')({
  validateSearch: (search: Record<string, unknown>) => ({
    src: String(search.src ?? ''),
    frameId: String(search.frameId ?? ''),
  }),
  component: ViewerPage,
})

function ViewerPage() {
  const { src, frameId } = Route.useSearch()
  const originRef = useRef(window.location.origin)

  // Keep parent informed of the iframe's natural height so it can resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      window.parent.postMessage(
        { type: 'iframeReady', frameId, height: document.documentElement.scrollHeight },
        originRef.current,
      )
    })
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [frameId])

  if (!src) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-400 text-sm">
        No model specified
      </div>
    )
  }

  return (
    // Override the hardcoded h-96 / rounded-lg / border from Model3DRenderer
    <div className="w-screen h-screen bg-slate-900 [&>div]:!h-screen [&>div]:!rounded-none [&>div]:!border-0">
      <Model3DRenderer
        modelPath={src}
        onModelClick={(partName) => {
          window.parent.postMessage(
            { type: 'modelClick', frameId, partName },
            originRef.current,
          )
        }}
      />
    </div>
  )
}
