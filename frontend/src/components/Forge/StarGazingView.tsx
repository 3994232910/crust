/// <reference types="@react-three/fiber" />

import {
  MeshDistortMaterial,
  OrbitControls,
  Text,
  Sphere,
} from "@react-three/drei"
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber"
import { Plus, Users, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import {
  type StargazingGroup,
  createStargazingGroup,
  deleteStargazingGroup,
  setStargazingAssignment,
} from "@/lib/stargazingApi"

declare global {
  namespace JSX {
    interface IntrinsicElements extends Partial<ThreeElements> {}
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StargazingUser {
  id: string
  full_name: string | null
  email: string
  forge_count: number
}

interface StargazingData {
  self_user: StargazingUser
  following: StargazingUser[]
  groups: StargazingGroup[]
  assignments: Record<string, string>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SELF_COLOR = "#f97316"
const DEFAULT_COLOR = "#eead72"
const BG_COLOR = "#05111f"
const GROUP_COLORS = ["#60a5fa", "#a78bfa", "#34d399", "#f472b6", "#facc15"]

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function planetSize(forgeCount: number): number {
  return 0.5 + Math.log(forgeCount + 1) * 0.35
}

function displayName(user: StargazingUser): string {
  return user.full_name || user.email.split("@")[0]
}

// ─── Starfield ────────────────────────────────────────────────────────────────

function Starfield() {
  const positions = useMemo(() => {
    const pts = new Float32Array(3000 * 3)
    for (let i = 0; i < 3000; i++) {
      pts[i * 3] = (seededRand(i * 3) - 0.5) * 600
      pts[i * 3 + 1] = (seededRand(i * 3 + 1) - 0.5) * 600
      pts[i * 3 + 2] = (seededRand(i * 3 + 2) - 0.5) * 600
    }
    return pts
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={3000}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.25} color="#8ab4d4" transparent opacity={0.5} />
    </points>
  )
}

// ─── Orbit ring ───────────────────────────────────────────────────────────────

function OrbitRing({
  cx,
  cz,
  radius,
  color,
}: { cx: number; cz: number; radius: number; color: string }) {
  return (
    <mesh position={[cx, 0, cz]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.04, radius + 0.04, 96]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.18}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Planet ───────────────────────────────────────────────────────────────────

interface PlanetProps {
  user: StargazingUser
  isSelf: boolean
  color: string
  orbitCx: number
  orbitCz: number
  orbitRadius: number
  orbitSpeed: number
  orbitAngle0: number
  yOffset: number
  onClick: () => void
  selected: boolean
}

function Planet({
  user,
  isSelf,
  color,
  orbitCx,
  orbitCz,
  orbitRadius,
  orbitSpeed,
  orbitAngle0,
  yOffset,
  onClick,
  selected,
}: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null)
  const angleRef = useRef(orbitAngle0)
  const [hovered, setHovered] = useState(false)
  const size = planetSize(user.forge_count)

  useFrame((_, dt) => {
    if (!isSelf && groupRef.current) {
      angleRef.current += orbitSpeed * dt
      groupRef.current.position.set(
        orbitCx + Math.cos(angleRef.current) * orbitRadius,
        yOffset,
        orbitCz + Math.sin(angleRef.current) * orbitRadius,
      )
    }
  })

  const initX = isSelf ? 0 : orbitCx + Math.cos(orbitAngle0) * orbitRadius
  const initZ = isSelf ? 0 : orbitCz + Math.sin(orbitAngle0) * orbitRadius

  return (
    <group ref={groupRef} position={[initX, isSelf ? 0 : yOffset, initZ]}>
      {isSelf && (
        <pointLight intensity={3} distance={25} color={SELF_COLOR} />
      )}

      <Sphere
        args={[size, 40, 40]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <MeshDistortMaterial
          color={selected || hovered ? "#ffffff" : color}
          distort={0.2}
          speed={1.2}
          roughness={0.05}
          metalness={0.95}
          emissive={color}
          emissiveIntensity={isSelf ? 0.5 : hovered ? 0.35 : 0.12}
        />
      </Sphere>

      <Text
        position={[0, size + 0.55, 0]}
        fontSize={isSelf ? 0.65 : 0.44}
        color={selected || hovered ? "#ffffff" : "#94a3b8"}
        anchorX="center"
        anchorY="middle"
      >
        {displayName(user)}
      </Text>
    </group>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface StarGazingViewProps {
  onClose: () => void
}

export default function StarGazingView({ onClose }: StarGazingViewProps) {
  const [data, setData] = useState<StargazingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<StargazingUser | null>(null)
  const [showGroupPanel, setShowGroupPanel] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const base = import.meta.env.DEV
      ? ""
      : (import.meta.env.VITE_API_URL ?? "")
    fetch(`${base}/api/v1/community/stargazing`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const groups = data?.groups ?? []

  const layout = useMemo(() => {
    if (!data) return null
    const { self_user, following, groups = [], assignments = {} } = data

    const ungrouped: StargazingUser[] = []
    const byGroup: Record<string, StargazingUser[]> = {}

    for (const u of following) {
      const gid = assignments[u.id]
      if (gid && groups.find((g) => g.id === gid)) {
        ;(byGroup[gid] ??= []).push(u)
      } else {
        ungrouped.push(u)
      }
    }

    const ungroupedPlanets = ungrouped.map((user, i) => ({
      user,
      orbitCx: 0,
      orbitCz: 0,
      orbitRadius: 9 + (i % 5) * 2,
      orbitSpeed: 0.03 + seededRand(i * 17) * 0.04,
      orbitAngle0: (i / Math.max(ungrouped.length, 1)) * Math.PI * 2,
      yOffset: (seededRand(i * 31) - 0.5) * 1.5,
      color: DEFAULT_COLOR,
    }))

    const groupPlanets: typeof ungroupedPlanets = []
    const groupMeta: {
      group: StargazingGroup
      cx: number
      cz: number
      members: StargazingUser[]
    }[] = []

    const activeGroups = groups.filter((g) => byGroup[g.id]?.length)
    activeGroups.forEach((group, gi) => {
      const members = byGroup[group.id]!
      const clusterAngle = (gi / activeGroups.length) * Math.PI * 2
      const clusterDist = 30 + gi * 6
      const cx = Math.cos(clusterAngle) * clusterDist
      const cz = Math.sin(clusterAngle) * clusterDist
      groupMeta.push({ group, cx, cz, members })
      members.forEach((user, i) => {
        groupPlanets.push({
          user,
          orbitCx: cx,
          orbitCz: cz,
          orbitRadius: 3 + (i % 3) * 1.8,
          orbitSpeed: 0.05 + seededRand(i * 13 + gi * 7) * 0.04,
          orbitAngle0: (i / Math.max(members.length, 1)) * Math.PI * 2,
          yOffset: (seededRand(i * 23 + gi * 11) - 0.5) * 1.0,
          color: group.color,
        })
      })
    })

    return { self_user, ungroupedPlanets, groupPlanets, groupMeta }
  }, [data])

  const createGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    const color = GROUP_COLORS[groups.length % GROUP_COLORS.length]
    const g = await createStargazingGroup(name, color)
    setData((d) => d ? { ...d, groups: [...d.groups, g] } : d)
    setNewGroupName("")
  }

  const assignGroup = async (userId: string, groupId: string | null) => {
    await setStargazingAssignment(userId, groupId)
    setData((d) => {
      if (!d) return d
      const a = { ...d.assignments }
      if (groupId === null) delete a[userId]
      else a[userId] = groupId
      return { ...d, assignments: a }
    })
  }

  const deleteGroup = async (groupId: string) => {
    await deleteStargazingGroup(groupId)
    setData((d) => {
      if (!d) return d
      const assignments = Object.fromEntries(
        Object.entries(d.assignments).filter(([, v]) => v !== groupId),
      )
      return { ...d, groups: d.groups.filter((g) => g.id !== groupId), assignments }
    })
  }

  return (
    <div className="fixed inset-0 z-50" style={{ background: BG_COLOR }}>
      {loading ? (
        <div className="flex items-center justify-center h-full text-slate-400">
          加载中...
        </div>
      ) : (
        <>
          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <h1
                className="text-2xl font-bold tracking-wide"
                style={{ color: "#eead72" }}
              >
                Star Gazing
              </h1>
              <span className="text-sm text-slate-500">
                {(data?.following.length ?? 0) + 1} 个星球
              </span>
            </div>
            <div className="flex gap-2 pointer-events-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGroupPanel((v) => !v)}
                className="text-slate-400 hover:text-white"
              >
                <Users className="h-4 w-4 mr-1" />
                分组
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5 text-slate-400" />
              </Button>
            </div>
          </div>

          {/* 3D scene */}
          <Canvas camera={{ position: [0, 28, 38], fov: 55 }}>
            <color attach="background" args={[BG_COLOR]} />
            <ambientLight intensity={0.08} />
            <pointLight position={[0, 40, 0]} intensity={0.4} color="#c0d8ff" />

            <Starfield />

            {layout && (
              <>
                <Planet
                  user={layout.self_user}
                  isSelf
                  color={SELF_COLOR}
                  orbitCx={0}
                  orbitCz={0}
                  orbitRadius={0}
                  orbitSpeed={0}
                  orbitAngle0={0}
                  yOffset={0}
                  onClick={() => setSelectedUser(layout.self_user)}
                  selected={selectedUser?.id === layout.self_user.id}
                />

                {layout.ungroupedPlanets.map((p) => (
                  <Planet
                    key={p.user.id}
                    {...p}
                    isSelf={false}
                    onClick={() => setSelectedUser(p.user)}
                    selected={selectedUser?.id === p.user.id}
                  />
                ))}

                {layout.groupMeta.map(({ group, cx, cz, members }) => (
                  <group key={group.id}>
                    <OrbitRing
                      cx={cx}
                      cz={cz}
                      radius={5.5 + Math.floor(members.length / 3) * 1.5}
                      color={group.color}
                    />
                    <Text
                      position={[cx, 8, cz]}
                      fontSize={0.7}
                      color={group.color}
                      anchorX="center"
                    >
                      {group.name}
                    </Text>
                  </group>
                ))}

                {layout.groupPlanets.map((p) => (
                  <Planet
                    key={p.user.id}
                    {...p}
                    isSelf={false}
                    onClick={() => setSelectedUser(p.user)}
                    selected={selectedUser?.id === p.user.id}
                  />
                ))}
              </>
            )}

            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              minDistance={5}
              maxDistance={200}
            />
          </Canvas>

          {/* Right panel */}
          {selectedUser && (
            <div
              className="absolute right-4 top-16 rounded-xl border p-5"
              style={{
                width: "300px",
                background: "rgba(8,18,38,0.92)",
                borderColor: "#1e3a5f",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-semibold text-white truncate pr-2">
                  {displayName(selectedUser)}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedUser(null)}
                >
                  <X className="h-4 w-4 text-slate-400" />
                </Button>
              </div>

              <div className="text-sm space-y-1 text-slate-400 mb-4">
                <div className="truncate">{selectedUser.email}</div>
                <div style={{ color: "#eead72" }}>
                  {selectedUser.forge_count} 篇笔记
                </div>
              </div>

              {data && selectedUser.id !== data.self_user.id && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">分配到分组</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => assignGroup(selectedUser.id, null)}
                      className="px-2.5 py-1 text-xs rounded-full"
                      style={{
                        background: data?.assignments[selectedUser.id]
                          ? "transparent"
                          : "#1e3a5f",
                        color: data?.assignments[selectedUser.id]
                          ? "#475569"
                          : "#94a3b8",
                        border: "1px solid #1e3a5f",
                      }}
                    >
                      未分组
                    </button>
                    {data?.groups.map((g) => {
                      const active =
                        data?.assignments[selectedUser.id] === g.id
                      return (
                        <button
                          key={g.id}
                          onClick={() => assignGroup(selectedUser.id, g.id)}
                          className="px-2.5 py-1 text-xs rounded-full"
                          style={{
                            background: active ? `${g.color}25` : "transparent",
                            color: g.color,
                            border: `1px solid ${g.color}60`,
                          }}
                        >
                          {g.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group panel */}
          {showGroupPanel && (
            <div
              className="absolute left-4 top-16 rounded-xl border p-4"
              style={{
                width: "256px",
                background: "rgba(8,18,38,0.92)",
                borderColor: "#1e3a5f",
                backdropFilter: "blur(10px)",
              }}
            >
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                分组管理
              </h3>

              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {data?.groups.length === 0 && (
                  <div className="text-xs text-slate-600">
                    点击星球可分配到分组
                  </div>
                )}
                {data?.groups.map((g) => {
                  const count = Object.values(data?.assignments).filter(
                    (v) => v === g.id,
                  ).length
                  return (
                    <div key={g.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: g.color }}
                        />
                        <span className="text-sm text-slate-300 truncate">
                          {g.name}
                        </span>
                        <span className="text-xs text-slate-600 flex-shrink-0">
                          ({count})
                        </span>
                      </div>
                      <button
                        onClick={() => deleteGroup(g.id)}
                        className="text-xs text-slate-600 hover:text-red-400 ml-2 flex-shrink-0"
                      >
                        删除
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-1.5">
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createGroup()}
                  placeholder="新分组名称"
                  className="flex-1 text-sm rounded-lg px-2.5 py-1.5 text-slate-300 placeholder-slate-600 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid #1e3a5f",
                  }}
                />
                <Button size="sm" variant="ghost" onClick={createGroup}>
                  <Plus className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
