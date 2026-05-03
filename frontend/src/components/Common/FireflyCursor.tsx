import { useCallback, useEffect, useRef, useState } from "react"

interface Spark {
  id: number
  x: number
  y: number
  type: "click" | "submit" | "focus"
}

export function FireflyCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [sparks, setSparks] = useState<Spark[]>([])
  const sparkId = useRef(0)

  // Move cursor dot via ref — no re-render, no lag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`
        cursorRef.current.style.top = `${e.clientY}px`
      }
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isSubmit = !!target.closest('button[type="submit"]')
      addSpark(e.clientX, e.clientY, isSubmit ? "submit" : "click", isSubmit ? 1400 : 700)
    }

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (!target.matches("input, textarea")) return
      const rect = target.getBoundingClientRect()
      addSpark(rect.left + rect.width / 2, rect.top + rect.height / 2, "focus", 850)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("click", onClick)
    window.addEventListener("focusin", onFocusIn)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("click", onClick)
      window.removeEventListener("focusin", onFocusIn)
    }
  }, [])

  const addSpark = useCallback(
    (x: number, y: number, type: Spark["type"], duration: number) => {
      const id = ++sparkId.current
      setSparks(prev => [...prev, { id, x, y, type }])
      setTimeout(() => setSparks(prev => prev.filter(s => s.id !== id)), duration)
    },
    [],
  )

  return (
    <>
      <style>{`
        @keyframes ff-breathe {
          0%, 100% { transform: translate(-50%,-50%) scale(0.72);  opacity: 0.55; }
          50%       { transform: translate(-50%,-50%) scale(1.28); opacity: 1;    }
        }
        /* click: quick expand + fade */
        @keyframes ff-click {
          from { transform: translate(-50%,-50%) scale(0.08); opacity: 0.85; }
          to   { transform: translate(-50%,-50%) scale(1);    opacity: 0; }
        }
        /* submit: larger, slower */
        @keyframes ff-submit {
          0%   { transform: translate(-50%,-50%) scale(0.04); opacity: 0.9; }
          30%  { opacity: 0.7; }
          100% { transform: translate(-50%,-50%) scale(1);    opacity: 0; }
        }
        /* focus: burst outward → converge inward */
        @keyframes ff-focus {
          0%   { transform: translate(-50%,-50%) scale(0.05); opacity: 0;    }
          22%  { transform: translate(-50%,-50%) scale(1.5);  opacity: 0.88; }
          75%  { transform: translate(-50%,-50%) scale(0.28); opacity: 0.45; }
          100% { transform: translate(-50%,-50%) scale(0.1);  opacity: 0;    }
        }

        .ff-cursor {
          position: fixed; left: -400px; top: -400px;
          width: 54px; height: 54px; border-radius: 50%;
          pointer-events: none; z-index: 9999;
          animation: ff-breathe 2.8s ease-in-out infinite;
          background: radial-gradient(
            circle,
            rgba(255,224,100,0.98) 0%,
            rgba(255,185,45, 0.52) 28%,
            rgba(255,140,20, 0.16) 56%,
            transparent 78%
          );
          filter: blur(1.5px);
        }
        .ff-spark-click {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 9998;
          width: 140px; height: 140px;
          animation: ff-click 0.7s ease-out forwards;
          background: radial-gradient(circle, rgba(255,215,75,0.26) 0%, transparent 65%);
          box-shadow: 0 0 0 1px rgba(255,200,60,0.2);
        }
        .ff-spark-submit {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 9998;
          width: 440px; height: 440px;
          animation: ff-submit 1.4s ease-out forwards;
          background: radial-gradient(circle, rgba(255,215,75,0.2) 0%, rgba(255,155,20,0.05) 45%, transparent 65%);
          box-shadow: 0 0 0 1.5px rgba(255,200,60,0.16);
        }
        .ff-spark-focus {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 9998;
          width: 200px; height: 200px;
          animation: ff-focus 0.85s cubic-bezier(0.22,1,0.36,1) forwards;
          background: radial-gradient(circle, rgba(255,220,80,0.38) 0%, rgba(255,175,35,0.12) 45%, transparent 70%);
          box-shadow: 0 0 0 1px rgba(255,205,65,0.28);
        }
      `}</style>

      {/* Breathing firefly — position via ref */}
      <div ref={cursorRef} className="ff-cursor" />

      {sparks.map(s => (
        <div
          key={s.id}
          className={
            s.type === "submit"
              ? "ff-spark-submit"
              : s.type === "focus"
                ? "ff-spark-focus"
                : "ff-spark-click"
          }
          style={{ left: s.x, top: s.y }}
        />
      ))}
    </>
  )
}
