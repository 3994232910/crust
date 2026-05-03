import { useEffect, useRef } from "react"

interface Star {
  angle: number
  radius: number
  speed: number
  size: number
  alpha: number
  trailLen: number
  hue: number
}

export function StarTrails() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let cx: number, cy: number

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      cx = canvas.width  * 0.22
      cy = canvas.height * 0.50
    }
    resize()
    window.addEventListener("resize", resize)

    // 油画半径估算：画宽38%视口宽，转换为视口高比例
    // t = (radius/canvas.height - 0.04) / 0.92
    // 画边缘 t ≈ 0.30（1920×1080下）
    const EDGE = 0.14

    const makeStars = (): Star[] => {
      // 画面内：少量极淡星星，不遮挡画作内容
      const inner: Star[] = Array.from({ length: 20 }, () => {
        const t = Math.random() * EDGE
        return {
          angle:    Math.random() * Math.PI * 2,
          radius:   canvas.height * (0.04 + t * 0.92),
          speed:    0.0006 + Math.random() * 0.001,
          size:     0.15 + Math.random() * 0.4,
          alpha:    0.04 + Math.random() * 0.1,   // 极淡
          trailLen: 0.15 + Math.random() * 0.25,
          hue:      210 + Math.random() * 20,
        }
      })

      // 画面外：大量星星，密度峰值在 EDGE+0.12 附近，EDGE 处自然淡入
      const outer: Star[] = Array.from({ length: 550 }, () => {
        const t = EDGE + Math.pow(Math.random(), 2.5) * (1 - EDGE)
        const hue = t < EDGE + 0.2
          ? 205 + Math.random() * 25
          : 210 + Math.random() * 20
        // 距离 EDGE 越近越透明，0.10 范围内线性淡入
        const edgeFade = Math.min((t - EDGE) / 0.10, 1)
        return {
          angle:    Math.random() * Math.PI * 2,
          radius:   canvas.height * (0.04 + t * 0.92),
          speed:    0.0006 + Math.random() * 0.001,
          size:     0.2 + Math.random() * (1.4 - (t - EDGE) * 0.8),
          alpha:    (0.2 + Math.random() * 0.5) * (1 - (t - EDGE) * 0.4) * edgeFade,
          trailLen: 0.35 + Math.random() * 0.55,
          hue,
        }
      })

      return [...inner, ...outer]
    }

    let stars = makeStars()
    window.addEventListener("resize", () => { stars = makeStars() })

    let raf: number

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const s of stars) {
        s.angle += s.speed

        const x = cx + Math.cos(s.angle) * s.radius
        const y = cy + Math.sin(s.angle) * s.radius

        // 弧形拖尾
        ctx.beginPath()
        ctx.arc(cx, cy, s.radius, s.angle - s.trailLen, s.angle)
        ctx.strokeStyle = `hsla(${s.hue}, 80%, 78%, ${s.alpha * 1.1})`
        ctx.lineWidth   = s.size * 0.75
        ctx.stroke()

        // 亮星加光晕（只对较亮的星）
        if (s.alpha > 0.3 && s.size > 0.7) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, s.size * 8)
          g.addColorStop(0,   `hsla(${s.hue}, 90%, 95%, ${s.alpha * 0.35})`)
          g.addColorStop(0.4, `hsla(${s.hue}, 80%, 80%, ${s.alpha * 0.2})`)
          g.addColorStop(1,   `hsla(${s.hue}, 60%, 60%, 0)`)
          ctx.beginPath()
          ctx.arc(x, y, s.size * 8, 0, Math.PI * 2)
          ctx.fillStyle = g
          ctx.fill()
        }

        // 星点核心
        ctx.beginPath()
        ctx.arc(x, y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue}, 90%, 97%, ${Math.min(s.alpha * 0.5, 1)})`
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}
