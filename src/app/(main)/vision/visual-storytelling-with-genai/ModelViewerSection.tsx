'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import Image from 'next/image'
import { cn, cloudfrontImage } from '@/lib/utils'

const hotspots = [
  {
    id: 1,
    title: 'Scene 1: Entering emergency room',
    position: [3, 1, -3] as [number, number, number],
    rotation: [0, -Math.PI / 24, 0] as [number, number, number],
  },
  {
    id: 2,
    title: 'Scene 2: Emergency trauma room',
    position: [5, 1, -9] as [number, number, number],
    rotation: [0, -Math.PI / 6, 0] as [number, number, number],
  },
  {
    id: 3,
    title: 'Scene 3: Emergency room',
    position: [5, 1, -18] as [number, number, number],
    rotation: [0, -Math.PI / 2, 0] as [number, number, number],
  },
  {
    id: 4,
    title: 'Scene 4: Emergency room treatment area',
    position: [12, 1, -19] as [number, number, number],
    rotation: [0, Math.PI, -1] as [number, number, number],
  },
  {
    id: 5,
    title: 'Scene 5: Hospital waiting room',
    position: [12, 1, -1] as [number, number, number],
    rotation: [0, Math.PI / 4, 0] as [number, number, number],
  },
]

function HospitalModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

function CameraController({
  target,
}: {
  target: { position: [number, number, number]; rotation: [number, number, number] } | null
}) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    if (target) {
      camera.position.set(...target.position)
      camera.rotation.set(...target.rotation)
      if (controlsRef.current) {
        const lookDir = new THREE.Vector3(0, 0, -1)
        lookDir.applyEuler(new THREE.Euler(...target.rotation))
        const lookTarget = new THREE.Vector3(...target.position).add(
          lookDir.multiplyScalar(5)
        )
        controlsRef.current.target.copy(lookTarget)
        controlsRef.current.update()
      }
    }
  }, [target, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      target={[8, 0, -10]}
      rotateSpeed={0.6}
      zoomSpeed={0.2}
      panSpeed={0.6}
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={50}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
    />
  )
}

function EnhancedLighting() {
  return (
    <>
      <ambientLight intensity={0.1} color="white" />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.2}
        color="white"
        castShadow
      />
      <directionalLight
        position={[-8, 6, -8]}
        intensity={0.5}
        color="#a6d8ff"
      />
      <directionalLight
        position={[-2, 8, -12]}
        intensity={0.6}
        color="#d4c5ff"
      />
      <directionalLight position={[2, 15, -2]} intensity={0.2} color="white" />
      <pointLight position={[0, 5, -5]} intensity={0.3} color="#a6d8ff" />
      <pointLight position={[10, 3, -10]} intensity={0.2} color="#d4c5ff" />
      <pointLight position={[5, 2, 0]} intensity={0.15} color="#a6d8ff" />
      <pointLight position={[15, 4, -15]} intensity={0.15} color="#d4c5ff" />
    </>
  )
}

function ModelCanvas({
  cameraTarget,
}: {
  cameraTarget: { position: [number, number, number]; rotation: [number, number, number] } | null
}) {
  return (
    <Canvas
      shadows
      camera={{
        fov: 50,
        position: [25, 12, 4],
        rotation: [-Math.PI / 4, Math.PI / 4, 0],
      }}
      style={{ height: 500, width: '100%' }}
    >
      <EnhancedLighting />
      <Suspense fallback={null}>
        <HospitalModel url="/visual-storytelling-with-genai/hospital-3d-model.glb" />
      </Suspense>
      <CameraController target={cameraTarget} />
    </Canvas>
  )
}

export function ModelViewerSection() {
  const [activeHotspot, setActiveHotspot] = useState<string>('')
  const [cameraTarget, setCameraTarget] = useState<{
    position: [number, number, number]
    rotation: [number, number, number]
  } | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) setIsSupported(false)
    } catch {
      setIsSupported(false)
    }
  }, [])

  const handleHotspot = (hotspot: (typeof hotspots)[0]) => {
    setActiveHotspot(hotspot.title)
    setCameraTarget({
      position: hotspot.position,
      rotation: hotspot.rotation,
    })
  }

  return (
    <div className="max-width content-padding mx-auto my-12">
      <p className="leading-relaxed mb-4">
        Navigate through our 3D hospital model — the virtual sandbox we use to
        capture compositions for GenAI styling. Click a hotspot or orbit freely.
      </p>

      <div className="grid grid-cols-1 gap-8 items-start">
        {/* Hotspot Image — w-fit shrink-wraps to image so overlay % positions match */}
        <div className="relative w-fit">
          <Image
            src={cloudfrontImage(
              '/images/features/visual-storytelling-with-genai/genai-3d-model-3.jpg'
            )}
            alt="Hospital 3D model overview with hotspots"
            width={800}
            height={500}
            className="image--max-width rounded"
          />
          {/* Transparent hotspot overlays — numbered markers are baked into the image PNG */}
          <div className="absolute inset-0">
            {[
              { id: 1, left: '25%', top: '51.2%' },
              { id: 2, left: '41%', top: '46.8%' },
              { id: 3, left: '50.5%', top: '22.3%' },
              { id: 4, left: '75.5%', top: '56%' },
              { id: 5, left: '37.25%', top: '72.8%' },
            ].map((pos) => {
              const hotspot = hotspots.find((h) => h.id === pos.id)!
              return (
                <button
                  key={pos.id}
                  onClick={() => handleHotspot(hotspot)}
                  className={cn(
                    'absolute w-10 h-10 rounded-lg cursor-pointer transition-colors',
                    activeHotspot === hotspot.title
                      ? 'bg-[#c53e20]'
                      : 'bg-transparent hover:bg-[#c53e20]/30'
                  )}
                  style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}
                  title={hotspot.title}
                  aria-label={`Scene ${pos.id}`}
                >
                </button>
              )
            })}
          </div>
          {activeHotspot && (
            <p className="mt-2 text-sm text-gray text-center">
              {activeHotspot}
            </p>
          )}
        </div>

        {/* 3D Model Viewer */}
        <div className="border border-gray-medium rounded-lg overflow-hidden">
          {isSupported ? (
            <ModelCanvas cameraTarget={cameraTarget} />
          ) : (
            <div className="h-[500px] flex items-center justify-center bg-gray-lightest">
              <p className="text-gray text-center px-4">
                3D model viewer requires WebGL support.
                <br />
                Please use a modern browser to view the interactive model.
              </p>
            </div>
          )}
          <div className="p-3 bg-gray-lightest text-xs text-gray text-center">
            Click and drag to orbit. Scroll to zoom. Right-click to pan.
          </div>
        </div>
      </div>

      {/* Hotspot list for mobile */}
      <div className="mt-4 lg:hidden">
        <div className="flex flex-wrap gap-2">
          {hotspots.map((h) => (
            <button
              key={h.id}
              onClick={() => handleHotspot(h)}
              className={cn(
                'px-3 py-1.5 text-sm rounded border cursor-pointer transition-colors',
                activeHotspot === h.title
                  ? 'border-primary bg-primary-lightest text-primary'
                  : 'border-gray-light text-gray hover:border-gray-medium'
              )}
            >
              Scene {h.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
