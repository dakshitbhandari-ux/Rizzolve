import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

// 3D Particles simulating city sparks, rain, and dimensional nanites
function CityDebrisParticles({ count = 1200 }) {
  const pointsRef = useRef()

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)

    const colorPalette = [
      new THREE.Color('#E23636'), // Spidey Red
      new THREE.Color('#0066FF'), // Web Blue
      new THREE.Color('#FFE600'), // Spider-Sense Gold
      new THREE.Color('#ffffff'), // Web Silver
    ]

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }

    return [pos, col]
  }, [count])

  useFrame((state, delta) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y += delta * 0.04
    pointsRef.current.rotation.x += delta * 0.02

    const positionsArray = pointsRef.current.geometry.attributes.position.array
    for (let i = 1; i < count * 3; i += 3) {
      positionsArray[i] -= delta * 0.8
      if (positionsArray[i] < -10) {
        positionsArray[i] = 10
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// 3D Spider-Man Stylized Mask & Spider Emblem
function SpiderManEmblem({ mousePosition }) {
  const groupRef = useRef()
  const eyeLeftRef = useRef()
  const eyeRightRef = useRef()
  const outerWebRing = useRef()

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Smooth mouse-follow parallax
    const targetRotX = (mousePosition.current.y * 0.4)
    const targetRotY = (mousePosition.current.x * 0.6)

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      0.06
    )
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY + Math.sin(state.clock.elapsedTime * 0.8) * 0.15,
      0.06
    )

    // Breathing float animation
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.15
    groupRef.current.position.z = Math.cos(state.clock.elapsedTime * 1.2) * 0.1

    if (outerWebRing.current) {
      outerWebRing.current.rotation.z += delta * 0.3
      outerWebRing.current.rotation.x += delta * 0.15
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Main Faceted Head/Mask Base */}
      <mesh position={[0, 0, 0]} scale={[1.2, 1.45, 1.1]}>
        <dodecahedronGeometry args={[1.2, 2]} />
        <meshStandardMaterial
          color="#E23636"
          roughness={0.25}
          metalness={0.7}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
          wireframe={false}
        />
      </mesh>

      {/* 2. Stylized Web-Pattern Wireframe Overlay */}
      <mesh position={[0, 0, 0]} scale={[1.22, 1.47, 1.12]}>
        <dodecahedronGeometry args={[1.2, 2]} />
        <meshBasicMaterial
          color="#050510"
          wireframe={true}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* 3. Outer Web-Shooter Tech Orbital Rings */}
      <group ref={outerWebRing}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[2.2, 0.025, 16, 64]} />
          <meshStandardMaterial
            color="#0066FF"
            emissive="#0033CC"
            emissiveIntensity={1.5}
            roughness={0.1}
          />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 4, Math.PI / 5, 0]}>
          <torusGeometry args={[2.5, 0.02, 16, 64]} />
          <meshStandardMaterial
            color="#E23636"
            emissive="#E23636"
            emissiveIntensity={1.8}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* 4. Left Spider Eye Lens (Angled & Glowing White with Black Bezel) */}
      <group position={[-0.48, 0.22, 1.05]} rotation={[0.08, -0.28, -0.2]}>
        {/* Outer Black Bezel */}
        <mesh scale={[0.42, 0.32, 0.12]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#050510" roughness={0.4} />
        </mesh>
        {/* Inner Glowing White Lens */}
        <mesh position={[0, 0, 0.06]} scale={[0.34, 0.24, 0.08]} ref={eyeLeftRef}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={2.5}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* 5. Right Spider Eye Lens */}
      <group position={[0.48, 0.22, 1.05]} rotation={[0.08, 0.28, 0.2]}>
        {/* Outer Black Bezel */}
        <mesh scale={[0.42, 0.32, 0.12]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#050510" roughness={0.4} />
        </mesh>
        {/* Inner Glowing White Lens */}
        <mesh position={[0, 0, 0.06]} scale={[0.34, 0.24, 0.08]} ref={eyeRightRef}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={2.5}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* 6. Spider Chest Insignia Symbol Floating in Center Front */}
      <group position={[0, -0.65, 1.0]} scale={[0.65, 0.65, 0.65]}>
        {/* Spider Thorax */}
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
        </mesh>
        {/* Spider Abdomen */}
        <mesh position={[0, -0.15, 0]}>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
        </mesh>
        {/* 8 Geometric Spider Legs */}
        {[-1, 1].map((dir, i) => (
          <group key={i} scale={[dir, 1, 1]}>
            <mesh position={[0.28, 0.28, 0]} rotation={[0, 0, 0.4]}>
              <cylinderGeometry args={[0.025, 0.025, 0.45]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.0} />
            </mesh>
            <mesh position={[0.45, 0.45, 0]} rotation={[0, 0, -0.5]}>
              <cylinderGeometry args={[0.02, 0.02, 0.4]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.0} />
            </mesh>
            <mesh position={[0.3, 0.05, 0]} rotation={[0, 0, 0.8]}>
              <cylinderGeometry args={[0.025, 0.025, 0.45]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.0} />
            </mesh>
            <mesh position={[0.32, -0.22, 0]} rotation={[0, 0, 1.2]}>
              <cylinderGeometry args={[0.025, 0.025, 0.5]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.0} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

export default function SpideyCanvas({ mousePosition }) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <Canvas
        className="w-full h-full"
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.2]} fov={50} />

        {/* Cinematic Spider-Man Atmosphere & Fog */}
        <fog attach="fog" args={['#050510', 3.5, 14]} />
        <ambientLight intensity={0.4} color="#0a1030" />

        {/* Hot Red Point Light (Right Front) */}
        <pointLight position={[3.5, 2.5, 3]} intensity={4.5} color="#E23636" distance={12} />

        {/* Deep Web-Slinger Blue Point Light (Left Back) */}
        <pointLight position={[-4, -2, 2.5]} intensity={5.0} color="#0066FF" distance={14} />

        {/* Rim Lighting from above */}
        <directionalLight position={[0, 6, -3]} intensity={2.0} color="#ffffff" />
        <pointLight position={[0, -4, -2]} intensity={2.5} color="#E23636" />

        {/* 3D Floating Interactive Spider-Man Model */}
        <SpiderManEmblem mousePosition={mousePosition} />

        {/* Drifting City Sparks & Particles */}
        <CityDebrisParticles count={1000} />
      </Canvas>
    </div>
  )
}
