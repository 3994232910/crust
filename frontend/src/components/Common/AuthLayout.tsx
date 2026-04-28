import { useCallback, useRef } from "react"

import { FireflyCursor } from "@/components/Common/FireflyCursor"
import { Logo } from "@/components/Common/Logo"
import { StarTrails } from "@/components/Common/StarTrails"

interface AuthLayoutProps {
  children: React.ReactNode
}

const IMG = "/assets/images/login_picture.png"

export function AuthLayout({ children }: AuthLayoutProps) {
  const illumRef = useRef<HTMLDivElement>(null)

  const onPaintingMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!illumRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    illumRef.current.style.background =
      `radial-gradient(circle 50% at ${x}% ${y}%,` +
      `rgba(255,210,85,0.25) 0%,` +
      `rgba(255,165,35,0.08) 40%,` +
      `transparent 65%)`
  }, [])

  const onPaintingLeave = useCallback(() => {
    if (illumRef.current) illumRef.current.style.background = "transparent"
  }, [])

  return (
    <div
      className="relative min-h-svh overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 40% 35% at 50% 48%, #1a3a7a 0%, transparent 70%),
          radial-gradient(ellipse 25% 20% at 62% 30%, #1e4080 0%, transparent 65%),
          radial-gradient(ellipse 20% 25% at 68% 70%, #162e6a 0%, transparent 60%),
          linear-gradient(to bottom, transparent 0%, #0f1e50 30%, #142260 50%, #0f1e50 70%, transparent 100%),
          radial-gradient(ellipse 70% 80% at 18% 50%, #112056 0%, #0b1640 40%, #071030 70%, #040b22 100%)
        `.trim(),
        cursor: "none",
      }}
    >
      <FireflyCursor />
      <StarTrails />

      {/* ── 模糊层：与清晰图完全相同的位置和尺寸，不做 scale ──
           CSS filter: blur() 会自然向元素边界外扩散，
           画边缘的蓝色/金色/橙色直接渗入周围深色背景，无人工光环 */}
      <img
        src={IMG} aria-hidden
        className="absolute pointer-events-none select-none"
        style={{
          left: "3%", top: "50%",
          transform: "translateY(-50%)",
          width: "38%", height: "auto",
          filter: "blur(64px)",
          opacity: 0.7,
        }}
      />
      <img
        src={IMG} aria-hidden
        className="absolute pointer-events-none select-none"
        style={{
          left: "3%", top: "50%",
          transform: "translateY(-50%)",
          width: "38%", height: "auto",
          filter: "blur(18px)",
          opacity: 0.55,
        }}
      />

      {/* ── 清晰画面 + 鼠标照亮 overlay ── */}
      <div
        className="absolute"
        style={{ left: "3%", top: "50%", transform: "translateY(-50%)", width: "38%" }}
        onMouseMove={onPaintingMove}
        onMouseLeave={onPaintingLeave}
      >
        <img
          src={IMG}
          className="block w-full h-auto select-none"
          style={{
            maskImage: "radial-gradient(ellipse 88% 84% at 50% 50%, black 38%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.2) 72%, transparent 88%)",
            WebkitMaskImage: "radial-gradient(ellipse 88% 84% at 50% 50%, black 38%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.2) 72%, transparent 88%)",
          }}
          draggable={false}
        />
        <div
          ref={illumRef}
          className="absolute inset-0 pointer-events-none"
          style={{ borderRadius: "6px", mixBlendMode: "screen" }}
        />
      </div>

      {/* ── 内容 ── */}
      <div className="relative z-10 min-h-svh flex lg:grid lg:grid-cols-2">

        {/* 左：Logo 左下角 */}
        <div className="hidden lg:flex flex-col justify-end p-10 pb-12
                        [&_img]:brightness-0 [&_img]:invert [&_span.text-primary]:text-white">
          <Logo variant="full" asLink={false} />
          <p className="mt-3 text-sm text-white leading-relaxed">
            Your personal knowledge forge —<br />capture, connect, and explore ideas.
          </p>
        </div>

        {/* 右：登录卡 */}
        <div className="flex flex-1 items-center justify-center p-6 md:p-10">
          <div
            className="w-full max-w-sm rounded-2xl p-8
                       bg-white/[0.06] backdrop-blur-2xl
                       shadow-2xl border border-white/[0.10]"
          >
            {children}
          </div>
        </div>

      </div>
    </div>
  )
}
