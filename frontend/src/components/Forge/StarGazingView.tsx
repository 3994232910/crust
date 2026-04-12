/// <reference types="@react-three/fiber" />

import {
  MeshDistortMaterial,
  OrbitControls,
  Sphere,
  Text,
} from "@react-three/drei"
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber"
import { FileText, Folder, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { type ForgePublic, ForgeService } from "@/client"
import { Button } from "@/components/ui/button"

// 全局扩展 JSX 类型，彻底解决 R3F 标签 TS 报错
declare global {
  namespace JSX {
    interface IntrinsicElements extends Partial<ThreeElements> {}
  }
}

interface Forge extends Omit<ForgePublic, "content" | "is_folder"> {
  content?: string
  is_folder?: boolean
}

interface PlanetProps {
  forge: Forge
  position: [number, number, number]
  onClick: () => void
  isStar?: boolean
}

function Planet({ forge, position, onClick, isStar = false }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // 行星轨道运动
  useFrame((state) => {
    if (meshRef.current && !isStar) {
      const time = state.clock.elapsedTime
      const speed = 0.5
      const angle = time * speed
      const distance = Math.sqrt(position[0] ** 2 + position[2] ** 2)

      meshRef.current.position.x = Math.cos(angle) * distance
      meshRef.current.position.z = Math.sin(angle) * distance
    }
  })

  return (
    <group>
      <Sphere
        ref={meshRef}
        args={[isStar ? 1.5 : 0.8, 32, 32]}
        position={position}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <MeshDistortMaterial
          color={forge.is_folder ? "#8b5cf6" : "#3b82f6"}
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>

      {/* 行星名称标签 */}
      <Text
        position={[position[0], position[1] + (isStar ? 2 : 1), position[2]]}
        fontSize={0.5}
        color={hovered ? "#fbbf24" : "#94a3b8"}
        anchorX="center"
        anchorY="middle"
      >
        {forge.title}
      </Text>
    </group>
  )
}

interface StarGazingViewProps {
  onClose: () => void
}

export default function StarGazingView({ onClose }: StarGazingViewProps) {
  const [forges, setForges] = useState<Forge[]>([])
  const [selectedForge, setSelectedForge] = useState<Forge | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载所有 forge 数据（修复语法错误）
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await ForgeService.readForges()
        setForges(response.data as Forge[])
      } catch (error) {
        console.error("Failed to load forges:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // 计算行星位置 - 文件夹作为恒星，文件作为行星
  const planetarySystems = useMemo(() => {
    const folders = forges.filter((f) => f.is_folder)
    const files = forges.filter((f) => !f.is_folder)

    // 为每个文件夹创建一个恒星系统
    return folders.map((folder, index) => {
      const angle = (index / folders.length) * Math.PI * 2
      const distance = 15

      // 恒星位置
      const starPosition: [number, number, number] = [
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance,
      ]

      // 找到属于这个文件夹的文件
      const planetFiles = files.filter((f) => f.parent_id === folder.id)

      // 计算行星位置
      const planets = planetFiles.map((file, planetIndex) => {
        const planetAngle = (planetIndex / planetFiles.length) * Math.PI * 2
        const orbitRadius = 3 + Math.random() * 2

        return {
          forge: file,
          position: [
            starPosition[0] + Math.cos(planetAngle) * orbitRadius,
            (Math.random() - 0.5) * 2,
            starPosition[2] + Math.sin(planetAngle) * orbitRadius,
          ] as [number, number, number],
        }
      })

      return {
        star: { forge: folder, position: starPosition },
        planets,
      }
    })
  }, [forges])

  const handleForgeClick = (forge: Forge) => {
    setSelectedForge(forge)
  }

  return (
    <div className="fixed inset-0 bg-slate-950 z-50">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-slate-400">Loading...</div>
        </div>
      ) : (
        <>
          {/* 顶部工具栏 */}
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-100">Star Gazing</h1>
              <span className="text-sm text-slate-400">
                {forges.length} objects in view
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-6 w-6 text-slate-400" />
            </Button>
          </div>

          {/* 3D 场景 */}
          <Canvas camera={{ position: [0, 20, 30], fov: 60 }}>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            {/* 渲染所有恒星系统 */}
            {planetarySystems.map((system, index) => (
              <group key={index}>
                {/* 恒星 */}
                <Planet
                  forge={system.star.forge}
                  position={system.star.position}
                  onClick={() => handleForgeClick(system.star.forge)}
                  isStar
                />

                {/* 行星 */}
                {system.planets.map((planet, planetIndex) => (
                  <Planet
                    key={planetIndex}
                    forge={planet.forge}
                    position={planet.position}
                    onClick={() => handleForgeClick(planet.forge)}
                  />
                ))}
              </group>
            ))}

            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={10}
              maxDistance={100}
            />
          </Canvas>

          {/* 详情面板 */}
          {selectedForge && (
            <div className="absolute right-4 top-20 bottom-4 w-96 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-800 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-100">
                  {selectedForge.title}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedForge(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  {selectedForge.is_folder ? (
                    <Folder className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span>{selectedForge.is_folder ? "Folder" : "File"}</span>
                </div>

                {selectedForge.content && (
                  <div className="prose prose-invert max-w-none">
                    <div className="text-slate-300 whitespace-pre-wrap">
                      {selectedForge.content}
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-500">
                  <div>ID: {selectedForge.id}</div>
                  <div>
                    Updated:{" "}
                    {new Date(selectedForge.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
