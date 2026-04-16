/// <reference types="@react-three/fiber" />

import { OrbitControls, Text } from "@react-three/drei"
import { Canvas, type ThreeElements } from "@react-three/fiber"
import { FileText, Map, RefreshCw, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Button } from "@/components/ui/button"

declare global {
  namespace JSX {
    interface IntrinsicElements extends Partial<ThreeElements> {}
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapNode {
  id: string
  title: string
  content: string
  x: number
  y: number
  z: number
  cluster_id: number
}

interface ClusterInfo {
  id: number
  label: string
  peak_x: number
  peak_y: number
  peak_z: number
}

interface TerrainGrid {
  grid_x: number[][]
  grid_y: number[][]
  grid_z: number[][]
}

interface MapData {
  nodes: MapNode[]
  terrain: TerrainGrid
  clusters: ClusterInfo[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** 主题色系：薄荷白平原 → 鼠尾草绿坡 → 深青绿山脊 */
const LOW_COLOR  = new THREE.Color("#c8e8d8")   // 浅薄荷平原
const MID_COLOR  = new THREE.Color("#3d9e6a")   // 中绿坡地
const HIGH_COLOR = new THREE.Color("#0f5c3a")   // 深青绿山脊

/** 雾 / 背景色：薄雾白绿，让地形边缘消融入虚无 */
const FOG_COLOR = "#eaf6ef"

/** 各聚类散点颜色（深绿系，与背景协调） */
const CLUSTER_COLORS = [
  "#1a6b4a", "#2d8a5e", "#3fa870", "#1f7a55",
  "#156040", "#0e4f33", "#24785a", "#187048",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * 幂次曲线高度映射：z < 1.5 的区域硬贴地（真正的平原），高密度区陡然升起。
 * z 范围 0-10 → Three.js Y 范围 0-20
 */
function terrainHeight(z: number): number {
  if (z < 1.5) return 0
  return Math.pow((z - 1.5) / 8.5, 2.5) * 20.0
}

function terrainColor(t: number): THREE.Color {
  const c = new THREE.Color()
  if (t < 0.5) {
    c.lerpColors(LOW_COLOR, MID_COLOR, t * 2)
  } else {
    c.lerpColors(MID_COLOR, HIGH_COLOR, (t - 0.5) * 2)
  }
  return c
}

function buildTerrainGeometry(terrain: TerrainGrid): THREE.BufferGeometry {
  const { grid_x, grid_y, grid_z } = terrain
  const rows = grid_z.length
  const cols = grid_z[0].length
  const total = rows * cols

  const positions = new Float32Array(total * 3)
  const colors    = new Float32Array(total * 3)

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const idx = i * cols + j
      const z   = grid_z[i][j]
      const nz  = Math.max(0, z) / 10.0

      positions[idx * 3 + 0] = grid_x[i][j]
      positions[idx * 3 + 1] = terrainHeight(z)
      positions[idx * 3 + 2] = grid_y[i][j]

      const c = terrainColor(nz)
      colors[idx * 3 + 0] = c.r
      colors[idx * 3 + 1] = c.g
      colors[idx * 3 + 2] = c.b
    }
  }

  const indices: number[] = []
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j
      const b = i * cols + j + 1
      const c = (i + 1) * cols + j
      const d = (i + 1) * cols + j + 1
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geo.setAttribute("color",    new THREE.BufferAttribute(colors,    3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// ─── Shaders ──────────────────────────────────────────────────────────────────

const TERRAIN_VERT = /* glsl */`
  attribute vec3 color;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vColor    = color;
    vNormal   = normalMatrix * normal;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const TERRAIN_FRAG = /* glsl */`
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // 薄雾白绿色
  const vec3 FOG_TINT = vec3(0.918, 0.965, 0.937);

  void main() {
    vec3 n = normalize(vNormal);

    // 主光源：高角度柔光，营造云雾漫射感
    vec3 lightDir1 = normalize(vec3(0.3, 1.0, 0.4));
    float diff1 = max(dot(n, lightDir1), 0.0);

    // 侧补光：强调波脊轮廓
    vec3 lightDir2 = normalize(vec3(-0.6, 0.5, -0.3));
    float diff2 = max(dot(n, lightDir2), 0.0) * 0.18;

    // 波脊高光：法线朝上的区域更亮（仿大气散射）
    float rimUp = pow(max(n.y, 0.0), 2.0) * 0.35;

    float lighting = 0.60 + diff1 * 0.65 + diff2 + rimUp;

    // 低处向薄雾色混合（谷地更白更虚）
    float valleyFog = 1.0 - smoothstep(0.0, 6.0, vPosition.y);
    vec3 col = mix(vColor * lighting, FOG_TINT, valleyFog * 0.55);

    gl_FragColor = vec4(col, 1.0);
  }
`

// ─── 3D Components ────────────────────────────────────────────────────────────


function TerrainMesh({ terrain }: { terrain: TerrainGrid }) {
  const geo = useMemo(() => buildTerrainGeometry(terrain), [terrain])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: false,
    side:        THREE.FrontSide,
    vertexShader:   TERRAIN_VERT,
    fragmentShader: TERRAIN_FRAG,
  }), [])

  return <mesh geometry={geo} material={mat} />
}

const _dummy = new THREE.Object3D()
const _color = new THREE.Color()

function NotePoints({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: MapNode[]
  selectedId: string | null
  onSelect: (node: MapNode) => void
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    nodes.forEach((node, i) => {
      const isSelected = node.id === selectedId
      _dummy.position.set(node.x, terrainHeight(node.z) + 0.5, node.y)
      _dummy.scale.setScalar(isSelected ? 2.0 : 1.0)
      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)
      _color.set(isSelected ? "#ffffff" : CLUSTER_COLORS[node.cluster_id % CLUSTER_COLORS.length])
      mesh.setColorAt(i, _color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [nodes, selectedId])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, nodes.length]}
      onClick={(e) => {
        e.stopPropagation()
        if (e.instanceId !== undefined) onSelect(nodes[e.instanceId])
      }}
    >
      <sphereGeometry args={[0.25, 10, 10]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  )
}

function ClusterLabels({ clusters }: { clusters: ClusterInfo[] }) {
  return (
    <>
      {clusters.map((c) => (
        <Text
          key={c.id}
          position={[c.peak_x, terrainHeight(c.peak_z) + 3.0, c.peak_y]}
          fontSize={1.1}
          color="#e0f5f3"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.08}
          outlineColor="#004d40"
        >
          {c.label}
        </Text>
      ))}
    </>
  )
}

// ─── UI Panels ────────────────────────────────────────────────────────────────

function DetailPanel({
  node,
  onClose,
}: {
  node: MapNode
  onClose: () => void
}) {
  return (
    <div className="absolute right-4 top-20 bottom-4 w-96 rounded-lg border border-slate-700 p-6 overflow-y-auto z-10 backdrop-blur-sm" style={{ background: "rgba(15,23,42,0.88)" }}>
      <div className="flex items-start justify-between mb-3 gap-2">
        <h2 className="text-base font-semibold text-slate-100 leading-snug">
          {node.title}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 -mt-1">
          <X className="h-4 w-4 text-slate-400" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "#009688" }}>
        <FileText className="h-3 w-3" />
        <span>主题 {node.cluster_id + 1}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">
          ({node.x.toFixed(1)}, {node.y.toFixed(1)})
        </span>
      </div>

      {node.content ? (
        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
          {node.content}
          {node.content.length >= 300 && (
            <span className="text-slate-600"> …</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-slate-600 italic">暂无内容</p>
      )}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

interface KnowledgeMapViewProps {
  onClose?: () => void
  /** 嵌入模式：relative 定位填满容器，而非 fixed 全屏覆盖 */
  embedded?: boolean
}

export default function KnowledgeMapView({ onClose, embedded = false }: KnowledgeMapViewProps) {
  const [mapData,    setMapData]    = useState<MapData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [selected,   setSelected]   = useState<MapNode | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)

  const token      = localStorage.getItem("access_token")
  const authHeader = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch("/api/v1/forge/knowledge-map", { headers: authHeader })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail ?? "请求失败")
        }
        return res.json() as Promise<MapData>
      })
      .then(setMapData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleRefreshEmbeddings = async () => {
    setRefreshing(true)
    setRefreshMsg(null)
    try {
      const res = await fetch("/api/v1/forge/refresh-embeddings", {
        method: "POST",
        headers: authHeader,
      })
      const body = await res.json()
      setRefreshMsg(
        body.queued === 0
          ? "所有笔记已有向量，无需重新生成。如仍无法打开地图，请检查 .env 配置。"
          : `${body.message}请等待约 ${Math.ceil(body.queued * 2)} 秒后重新打开知识地图。`,
      )
    } catch {
      setRefreshMsg("触发失败，请检查后端是否正常运行。")
    } finally {
      setRefreshing(false)
    }
  }

  // 嵌入模式：俯视角；全屏模式：低平侧视，强调波丘轮廓
  const cameraPos = embedded
    ? ([0, 50, 15] as [number, number, number])
    : ([0, 18, 55] as [number, number, number])
  const cameraFov = embedded ? 58 : 48
  const orbitTarget = embedded
    ? ([0, 0, 0] as [number, number, number])
    : ([0, 4, 0] as [number, number, number])

  return (
    <div className={embedded ? "relative w-full h-full" : "fixed inset-0 z-50"} style={{ background: FOG_COLOR }}>
      {/* ── Header ── */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Map className="h-5 w-5" style={{ color: "#009688" }} />
          <h1 className="text-xl font-bold text-slate-800">Knowledge Map</h1>
          {mapData && (
            <span className="text-sm text-slate-600">
              {mapData.nodes.length} notes · {mapData.clusters.length} topics
            </span>
          )}
        </div>
        {!embedded && onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="pointer-events-auto"
          >
            <X className="h-5 w-5 text-slate-400" />
          </Button>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#15803d", borderTopColor: "transparent" }}
          />
          <p className="text-slate-700 text-sm">
            正在生成知识地图，首次可能需要 10–30 秒…
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8 max-w-lg mx-auto">
          <span className="text-5xl">🗺️</span>
          <p className="text-slate-800 font-medium leading-relaxed">{error}</p>

          <Button
            onClick={handleRefreshEmbeddings}
            disabled={refreshing}
            className="mt-1 gap-2"
            style={{ background: "#15803d", color: "#fff" }}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "正在触发…" : "重新生成所有向量"}
          </Button>

          {refreshMsg && (
            <p className="text-sm text-slate-700 leading-relaxed">{refreshMsg}</p>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            若按钮触发后仍报错，请确认 <code className="text-slate-700">.env</code> 中已设置{" "}
            <code className="text-slate-700">AI_MODEL_EMBEDDING_API_KEY</code>
          </p>
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && mapData && mapData.nodes.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8 max-w-lg mx-auto">
          <span className="text-5xl">🗺️</span>
          <p className="text-slate-800 font-medium">知识地图暂无数据</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            创建至少 2 条笔记并生成向量后，地图将自动呈现。
          </p>
          <Button
            onClick={handleRefreshEmbeddings}
            disabled={refreshing}
            className="mt-1 gap-2"
            style={{ background: "#15803d", color: "#fff" }}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "正在触发…" : "生成向量"}
          </Button>
          {refreshMsg && (
            <p className="text-sm text-slate-700 leading-relaxed">{refreshMsg}</p>
          )}
        </div>
      )}

      {/* ── 3D Scene ── */}
      {!loading && mapData && mapData.nodes.length > 0 && (
        <>
          <Canvas
            camera={{ position: cameraPos, fov: cameraFov }}
            gl={{ antialias: false, powerPreference: "high-performance", clearColor: FOG_COLOR }}
            dpr={Math.min(window.devicePixelRatio, 2)}
          >
            <fog attach="fog" args={[FOG_COLOR, 45, 110]} />

            <ambientLight intensity={0.7} color="#ffffff" />
            <directionalLight position={[15, 35, 15]} intensity={1.2} color="#ffffff" />
            <directionalLight position={[-12, 18, -12]} intensity={0.3} color="#bbf7d0" />

            <TerrainMesh terrain={mapData.terrain} />
            <NotePoints
              nodes={mapData.nodes}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
            <ClusterLabels clusters={mapData.clusters} />

            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              minDistance={8}
              maxDistance={embedded ? 80 : 130}
              target={orbitTarget}
            />
          </Canvas>

          {selected && (
            <DetailPanel node={selected} onClose={() => setSelected(null)} />
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-500 pointer-events-none select-none">
            拖动旋转 · 滚轮缩放 · 点击笔记查看详情
          </div>
        </>
      )}
    </div>
  )
}
