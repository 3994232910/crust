/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// React Three Fiber 类型声明
import * as THREE from 'three'

declare module '@react-three/fiber' {
  export interface ThreeElements {
    group: Object3DNode<THREE.Group, typeof THREE.Group>
    ambientLight: LightNode<THREE.AmbientLight, typeof THREE.AmbientLight>
    pointLight: LightNode<THREE.PointLight, typeof THREE.PointLight>
    directionalLight: LightNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
    spotLight: LightNode<THREE.SpotLight, typeof THREE.SpotLight>
    hemisphereLight: LightNode<THREE.HemisphereLight, typeof THREE.HemisphereLight>
    mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>
    sphereGeometry: GeometryNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
    boxGeometry: GeometryNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>
    planeGeometry: GeometryNode<THREE.PlaneGeometry, typeof THREE.PlaneGeometry>
    meshBasicMaterial: MaterialNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>
    meshStandardMaterial: MaterialNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>
    meshPhongMaterial: MaterialNode<THREE.MeshPhongMaterial, typeof THREE.MeshPhongMaterial>
    lineBasicMaterial: MaterialNode<THREE.LineBasicMaterial, typeof THREE.LineBasicMaterial>
    object3D: Object3DNode<THREE.Object3D, typeof THREE.Object3D>
  }
}

// 扩展 JSX.IntrinsicElements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group?: any
      ambientLight?: any
      pointLight?: any
      directionalLight?: any
      spotLight?: any
      hemisphereLight?: any
      mesh?: any
      sphereGeometry?: any
      boxGeometry?: any
      planeGeometry?: any
      meshBasicMaterial?: any
      meshStandardMaterial?: any
      meshPhongMaterial?: any
      lineBasicMaterial?: any
      object3D?: any
    }
  }
}
