import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Anneau du mode Focus : un arc qui se remplit selon l'avancement du cours,
 * doublé d'un anneau témoin. Tourne lentement, très bas en contraste.
 */
function Arcs({ avancement, anime }: { avancement: number; anime: boolean }) {
  const groupe = useRef<THREE.Group>(null)
  const arc = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!anime || !groupe.current) return
    groupe.current.rotation.z -= delta * 0.045
    groupe.current.rotation.x = Math.sin(performance.now() / 9000) * 0.16
  })

  const remplissage = Math.max(0.0001, Math.min(1, avancement))

  return (
    <group ref={groupe} rotation={[0.35, 0, 0]} scale={0.62}>
      <mesh>
        <torusGeometry args={[2.6, 0.012, 8, 220]} />
        <meshBasicMaterial color="#CFDCC7" transparent opacity={0.1} />
      </mesh>
      <mesh ref={arc} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[2.6, 0.028, 10, 220, remplissage * Math.PI * 2]} />
        <meshBasicMaterial color="#B8862B" transparent opacity={0.42} />
      </mesh>
      <mesh>
        <torusGeometry args={[3.15, 0.005, 6, 160]} />
        <meshBasicMaterial color="#CFDCC7" transparent opacity={0.05} />
      </mesh>
    </group>
  )
}

export function Anneau({ avancement, anime }: { avancement: number; anime: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden="true"
    >
      <PerspectiveCamera makeDefault position={[0, 0, 7.4]} fov={50} />
      <Arcs avancement={avancement} anime={anime} />
    </Canvas>
  )
}
