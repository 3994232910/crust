import { useEffect, useRef, useState } from 'react'

interface Model3DViewerFrameProps {
  modelPath: string
  onModelClick?: (partName: string) => void
}

// Stable unique ID per component instance — used to route postMessages
// when multiple iframes coexist on the same page.
let _idCounter = 0
function newFrameId() {
  return `3d-frame-${++_idCounter}`
}

export function Model3DViewerFrame({ modelPath, onModelClick }: Model3DViewerFrameProps) {
  const frameId = useRef(newFrameId()).current
  const onModelClickRef = useRef(onModelClick)
  onModelClickRef.current = onModelClick

  // Mirror the default h-96 of Model3DRenderer; updates if the iframe reports taller content.
  const [iframeHeight] = useState(384)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.frameId !== frameId) return

      if (event.data.type === 'modelClick') {
        onModelClickRef.current?.(event.data.partName)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [frameId])

  const src =
    `/3d-viewer?src=${encodeURIComponent(modelPath)}&frameId=${encodeURIComponent(frameId)}`

  return (
    <iframe
      src={src}
      style={{ height: iframeHeight }}
      className="w-full border-0 block"
      title="3D Model Viewer"
      // allow-same-origin: shares localStorage (camera state, auth token) with parent
      // allow-scripts: required to run Three.js
      sandbox="allow-scripts allow-same-origin"
    />
  )
}
