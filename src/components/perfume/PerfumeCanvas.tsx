import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  PresentationControls,
  useGLTF,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";

type PerfumeCanvasProps = {
  reducedMotion: boolean;
};

function StaticSceneFallback() {
  return (
    <div
      aria-label="Ilustração demonstrativa de um frasco de perfume"
      className="perfume-scene-fallback"
      role="img"
    >
      <svg fill="none" viewBox="0 0 220 310">
        <defs>
          <linearGradient id="fallback-glass" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#383039" />
            <stop offset=".45" stopColor="#0E0C10" />
            <stop offset="1" stopColor="#050506" />
          </linearGradient>
          <linearGradient id="fallback-edge" x1="0" x2="1">
            <stop stopColor="#EC78B8" stopOpacity=".1" />
            <stop offset=".2" stopColor="#EC78B8" stopOpacity=".8" />
            <stop offset=".8" stopColor="#EC78B8" stopOpacity=".1" />
          </linearGradient>
        </defs>
        <ellipse cx="110" cy="275" fill="#C94E91" opacity=".14" rx="72" ry="15" />
        <rect
          fill="url(#fallback-glass)"
          height="34"
          rx="4"
          stroke="url(#fallback-edge)"
          width="42"
          x="89"
          y="32"
        />
        <path
          d="M92 66h36v28H92z"
          fill="url(#fallback-glass)"
          stroke="url(#fallback-edge)"
          strokeWidth="2"
        />
        <path
          d="M79 94h62a14 14 0 0 1 14 14v139a22 22 0 0 1-22 22H87a22 22 0 0 1-22-22V108a14 14 0 0 1 14-14Z"
          fill="url(#fallback-glass)"
          stroke="url(#fallback-edge)"
          strokeWidth="2"
        />
        <rect
          fill="#0B090D"
          height="53"
          stroke="#EC78B8"
          strokeOpacity=".4"
          width="64"
          x="76"
          y="147"
        />
        <text
          fill="#F5F1F5"
          fontFamily="Kanit, sans-serif"
          fontSize="12"
          letterSpacing="2"
          textAnchor="middle"
          x="108"
          y="169"
        >
          MAZÉ
        </text>
        <text
          fill="#EC78B8"
          fontFamily="Kanit, sans-serif"
          fontSize="7"
          letterSpacing="2"
          textAnchor="middle"
          x="108"
          y="187"
        >
          DEMO
        </text>
      </svg>
    </div>
  );
}

function ModelLoader() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div className="perfume-scene-loader" role="status">
        <span>Preparando a experiência</span>
        <span className="perfume-scene-loader__track">
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}

function PerfumeModel({ reducedMotion }: PerfumeCanvasProps) {
  const { scene } = useGLTF("/models/perfume-black.glb");
  const entrance = useRef<Group>(null);
  const entranceStarted = useRef<number | null>(null);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    clone.position.sub(center);
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    return {
      object: clone,
      scale: maxDimension > 0 ? 2.45 / maxDimension : 1,
    };
  }, [scene]);

  useFrame(({ clock }) => {
    if (!entrance.current) return;

    const now = clock.getElapsedTime();
    if (entranceStarted.current === null) entranceStarted.current = now;
    const elapsed = now - entranceStarted.current;
    const progress = reducedMotion ? 1 : Math.min(elapsed / 5.8, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    entrance.current.scale.setScalar(Math.max(eased, 0.001));
    entrance.current.position.y = -0.62 * (1 - eased);
    entrance.current.rotation.y =
      (1 - eased) * 1.35 +
      (reducedMotion ? 0 : Math.sin(elapsed * 0.36) * 0.018 * eased);
    entrance.current.rotation.x = (1 - eased) * -0.08;
  });

  return (
    <PresentationControls
      azimuth={[-0.72, 0.72]}
      config={{ mass: 2, tension: 180 }}
      cursor
      polar={[-0.25, 0.25]}
      snap={reducedMotion ? undefined : { mass: 3, tension: 240 }}
    >
      <group ref={entrance}>
        <primitive object={model.object} scale={model.scale} />
      </group>
    </PresentationControls>
  );
}

function Scene({ reducedMotion }: PerfumeCanvasProps) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        color="#FFF4FA"
        intensity={2.2}
        position={[3.5, 4, 4]}
      />
      <pointLight
        color="#EC78B8"
        distance={8}
        intensity={14}
        position={[-3, -0.7, 2]}
      />
      <pointLight
        color="#C94E91"
        distance={7}
        intensity={10}
        position={[3, 0.8, -2]}
      />
      <Environment resolution={64}>
        <Lightformer
          color="#FFF4FA"
          form="rect"
          intensity={3}
          position={[2, 2, 3]}
          scale={[4, 5, 1]}
        />
        <Lightformer
          color="#EC78B8"
          form="rect"
          intensity={2.5}
          position={[-3, 0, 1]}
          scale={[1, 5, 1]}
        />
        <Lightformer
          color="#C94E91"
          form="rect"
          intensity={2}
          position={[0, -3, -1]}
          scale={[5, 1, 1]}
        />
      </Environment>
      <ContactShadows
        blur={2.8}
        far={2.8}
        opacity={0.3}
        position={[0, -1.33, 0]}
        scale={3.5}
      />
      <Suspense fallback={<ModelLoader />}>
        <PerfumeModel reducedMotion={reducedMotion} />
      </Suspense>
    </>
  );
}

export default function PerfumeCanvas({
  reducedMotion,
}: PerfumeCanvasProps) {
  return (
    <Canvas
      aria-label="Frasco de perfume em 3D. Arraste para girar."
      camera={{ fov: 30, position: [0, 0, 5.2] }}
      dpr={[1, 1.5]}
      fallback={<StaticSceneFallback />}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      frameloop={reducedMotion ? "demand" : "always"}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Scene reducedMotion={reducedMotion} />
    </Canvas>
  );
}

useGLTF.preload("/models/perfume-black.glb");
