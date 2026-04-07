import { useState, useRef, useEffect } from "react"
import { Wand2, Sun, Moon, Lightbulb, Zap, RefreshCw } from "lucide-react"

interface RadialMenuProps {
  onSelect: (action: string) => void
  position?: { x: number, y: number }
}

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  angle: number
}

export function RadialMenu({ onSelect, position = { x: 50, y: 50 } }: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuItems: MenuItem[] = [
    { id: "brighter", label: "更亮", icon: <Sun className="w-4 h-4" />, angle: -90 },
    { id: "darker", label: "更暗", icon: <Moon className="w-4 h-4" />, angle: -30 },
    { id: "left-light", label: "左侧补光", icon: <Lightbulb className="w-4 h-4" />, angle: 30 },
    { id: "right-light", label: "右侧补光", icon: <Lightbulb className="w-4 h-4" />, angle: 90 },
    { id: "soft-light", label: "柔和光", icon: <Wand2 className="w-4 h-4" />, angle: 150 },
    { id: "reset", label: "重置", icon: <RefreshCw className="w-4 h-4" />, angle: 210 },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleClick = (itemId: string) => {
    setSelectedItem(itemId)
    onSelect(itemId)
    setTimeout(() => {
      setSelectedItem(null)
      setIsOpen(false)
    }, 300)
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -50%)"
      }}
    >
      {isOpen ? (
        <div className="relative w-48 h-48">
          {menuItems.map((item) => {
            const radius = 72
            const angleRad = (item.angle * Math.PI) / 180
            const x = Math.cos(angleRad) * radius
            const y = Math.sin(angleRad) * radius

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`absolute w-12 h-12 rounded-full bg-slate-800/90 border border-slate-600 
                  flex flex-col items-center justify-center gap-0.5 text-xs text-white
                  hover:bg-slate-700 hover:border-slate-400 hover:scale-110 
                  transition-all duration-200 shadow-lg backdrop-blur-sm
                  ${selectedItem === item.id ? "bg-blue-600 border-blue-400 scale-110" : ""}`}
                style={{
                  left: `calc(50% + ${x}px - 24px)`,
                  top: `calc(50% + ${y}px - 24px)`,
                }}
                title={item.label}
              >
                {item.icon}
                <span className="text-[10px] leading-none">{item.label}</span>
              </button>
            )
          })}

          <button
            onClick={() => setIsOpen(false)}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-14 h-14 rounded-full bg-slate-700 border-2 border-slate-500
              flex items-center justify-center text-white hover:bg-slate-600
              transition-all duration-200 shadow-xl"
          >
            <Zap className="w-6 h-6" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600
            flex items-center justify-center text-white hover:bg-slate-700
            hover:border-blue-400 transition-all duration-200 shadow-lg backdrop-blur-sm"
          title="调整光照"
        >
          <Wand2 className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
