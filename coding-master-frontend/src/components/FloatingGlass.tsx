import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Instance,
  Instances,
  Environment,
  Lightformer,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// FloatingGlass
//
// A "visual hook" background layer: a series of sleek, semi-transparent glass
// prisms that drift, rotate, and float (sinusoidal) in a slow, hypnotic loop.
//
//   • Glassmorphism .......... MeshTransmissionMaterial (real refraction + IOR,
//                              chromatic aberration on the edges, clearcoat
//                              highlights to sell the "glass").
//   • Performance ............ one InstancedMesh — every prism shares a single
//                              geometry + material → a single draw call.
//   • Cinematic lighting ..... a self-contained studio rig built from drei
//                              <Lightformer>s (no external HDRI fetch), tinted
//                              with the app's violet / cyan / green palette so
//                              the glass edges pick up the brand colors.
//   • Depth of field ......... soft bokeh blur via post-processing (desktop).
//   • Responsive ............. camera FOV + dolly adapt to the viewport aspect
//                              so the cluster stays framed on mobile portrait.
//
// Drop it in as a full-bleed, pointer-events-none background behind your UI.
// ─────────────────────────────────────────────────────────────────────────────

// ── Per-device quality profile ──────────────────────────────────────────────
// Transmission + DoF are GPU-heavy, so we scale every knob down on small / touch
// devices and honour the user's reduced-motion preference.
type Quality = {
  count: number; // number of glass prisms (instances)
  samples: number; // transmission blur samples
  resolution: number; // transmission render-target size
  dpr: number; // max device-pixel-ratio cap
  bokeh: number; // depth-of-field bokeh scale
  focalLength: number;
  bloom: number;
  msaa: number;
  dof: boolean; // depth of field on/off
  vignette: boolean;
  reducedMotion: boolean;
};

function getQuality(): Quality {
  const mq = (q: string) =>
    typeof window !== "undefined" && window.matchMedia(q).matches;

  const isMobile = mq("(max-width: 768px)") || mq("(pointer: coarse)");
  const reducedMotion = mq("(prefers-reduced-motion: reduce)");

  return isMobile
    ? {
        count: 9,
        samples: 4,
        resolution: 512,
        dpr: 1.5,
        bokeh: 2,
        focalLength: 0.02,
        bloom: 0.5,
        msaa: 0,
        dof: false,
        vignette: false,
        reducedMotion,
      }
    : {
        count: 16,
        samples: 6,
        resolution: 1024,
        dpr: 2,
        bokeh: 3,
        focalLength: 0.04,
        bloom: 0.8,
        msaa: 2,
        dof: true,
        vignette: true,
        reducedMotion,
      };
}

// ── Per-instance motion seeds ───────────────────────────────────────────────
// Generated once. Each prism gets its own axis, speeds, float amplitude, phase
// offset and a subtle brand tint so the cluster never reads as "in sync".
type Seed = {
  position: [number, number, number];
  rotationAxis: THREE.Vector3;
  rotationSpeed: number;
  floatAmplitude: number;
  floatSpeed: number;
  driftRadius: number;
  driftSpeed: number;
  phase: number;
  scale: number;
  color: string;
};

// Near-white tints so the glass stays *clear*, but each prism leans subtly
// toward the app's violet / cyan / green identity.
const PALETTE = ["#e8efff", "#d9f3ff", "#e7e0ff", "#dafff1", "#f3e9ff"];

function makeSeeds(count: number): Seed[] {
  const r = Math.random;
  const seeds: Seed[] = [];
  for (let i = 0; i < count; i++) {
    seeds.push({
      position: [(r() - 0.5) * 14, (r() - 0.5) * 9, (r() - 0.5) * 7 - 1],
      rotationAxis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
      rotationSpeed: 0.04 + r() * 0.11, // very slow spin
      floatAmplitude: 0.4 + r() * 0.9, // sinusoidal bob height
      floatSpeed: 0.25 + r() * 0.5,
      driftRadius: 0.3 + r() * 0.9, // lateral drift
      driftSpeed: 0.08 + r() * 0.16,
      phase: r() * Math.PI * 2,
      scale: 0.5 + Math.pow(r(), 1.5) * 1.2, // bias toward smaller gems
      color: PALETTE[Math.floor(r() * PALETTE.length)],
    });
  }
  return seeds;
}

// ── A single animated prism (drives one slot of the InstancedMesh) ──────────
function Gem({ seed, reducedMotion }: { seed: Seed; reducedMotion: boolean }) {
  const ref = useRef<THREE.Object3D>(null!);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state) => {
    const o = ref.current;
    if (!o) return;
    // Reduced-motion users get a near-frozen, gently breathing scene.
    const t = state.clock.elapsedTime * (reducedMotion ? 0.12 : 1);

    // Sinusoidal float + a slow circular drift = the "hovering" feel.
    const floatY = Math.sin(t * seed.floatSpeed + seed.phase) * seed.floatAmplitude;
    const driftX = Math.cos(t * seed.driftSpeed + seed.phase) * seed.driftRadius;
    const driftZ =
      Math.sin(t * seed.driftSpeed * 0.8 + seed.phase) * seed.driftRadius * 0.5;

    o.position.set(
      seed.position[0] + driftX,
      seed.position[1] + floatY,
      seed.position[2] + driftZ
    );

    // Slow continuous rotation about the prism's own fixed axis.
    quat.setFromAxisAngle(seed.rotationAxis, t * seed.rotationSpeed + seed.phase);
    o.quaternion.copy(quat);
  });

  // drei <Instances> reads each <Instance>'s transform every frame — no manual
  // matrix bookkeeping needed. Scale + tint are static, set once here.
  return <Instance ref={ref as never} scale={seed.scale} color={seed.color} />;
}

// ── The instanced cluster of glass prisms (single draw call) ────────────────
function GlassPrisms({ quality }: { quality: Quality }) {
  const seeds = useMemo(() => makeSeeds(quality.count), [quality.count]);

  return (
    <Instances limit={quality.count} range={quality.count}>
      {/* Faceted icosahedron = gem-like refraction. Swap for
          <dodecahedronGeometry/> or <octahedronGeometry/> to taste. */}
      <icosahedronGeometry args={[1, 0]} />

      <MeshTransmissionMaterial
        // One shared transmission buffer for every instance (avoids per-mesh
        // buffers + flicker, keeps it cheap).
        transmissionSampler
        samples={quality.samples}
        resolution={quality.resolution}
        transmission={1}
        roughness={0.0}
        thickness={1.2}
        ior={1.45}
        chromaticAberration={0.18} // rainbow fringe on the glass edges
        anisotropy={0.2}
        distortion={0.2}
        distortionScale={0.3}
        temporalDistortion={0.1} // makes the refraction feel "alive"
        clearcoat={1} // glossy edge highlights
        clearcoatRoughness={0.0}
        attenuationDistance={2.5}
        attenuationColor="#ffffff"
        color="#eaf2ff"
        toneMapped={false}
      />

      {seeds.map((seed, i) => (
        <Gem key={i} seed={seed} reducedMotion={quality.reducedMotion} />
      ))}
    </Instances>
  );
}

// ── Responsive camera + slow hypnotic sway ──────────────────────────────────
// On resize we set a base FOV / dolly from the viewport aspect (portrait phones
// pull back + widen so nothing clips). Each frame we add a tiny time-based sway.
function Rig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const base = useRef({ z: 13, fov: 42 });

  useEffect(() => {
    const aspect = size.width / size.height;
    if (aspect < 1)
      base.current = { z: 18, fov: 62 }; // portrait / mobile
    else if (aspect < 1.6)
      base.current = { z: 15, fov: 50 }; // square-ish / tablet
    else base.current = { z: 13, fov: 42 }; // widescreen

    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = base.current.fov;
    cam.position.z = base.current.z;
    cam.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.08) * 1.2;
    camera.position.y = Math.cos(t * 0.1) * 0.8;
    camera.position.z = base.current.z;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ── Self-contained cinematic studio lighting (baked once, no HDRI fetch) ─────
function StudioLighting() {
  return (
    <Environment resolution={256} frames={1}>
      {/* env-map background only — does NOT touch canvas transparency */}
      <color attach="background" args={["#06070a"]} />

      {/* soft key from above */}
      <Lightformer
        form="rect"
        intensity={2.4}
        position={[0, 6, -6]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[14, 8, 1]}
        color="#ffffff"
      />
      {/* cool fill from below */}
      <Lightformer
        form="rect"
        intensity={0.7}
        position={[0, -5, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[12, 6, 1]}
        color="#aab6ff"
      />
      {/* vertical strip lights → crisp edge highlights down the prism facets */}
      <Lightformer
        form="rect"
        intensity={3}
        position={[-6, 1, 2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[8, 1.2, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="rect"
        intensity={3}
        position={[6, 0, 2]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[8, 1.2, 1]}
        color="#ffffff"
      />
      {/* brand-tinted rims: violet / cyan / signature green */}
      <Lightformer form="ring" intensity={2} position={[5, 3, 4]} scale={3} color="#7c3aed" />
      <Lightformer form="circle" intensity={1.6} position={[-5, -2, 4]} scale={3} color="#22d3ee" />
      <Lightformer form="circle" intensity={1.2} position={[0, -3, 5]} scale={2} color="#00e290" />
    </Environment>
  );
}

// ── Post-processing: depth-of-field bokeh + bloom + vignette ─────────────────
function Effects({ quality }: { quality: Quality }) {
  return (
    <EffectComposer multisampling={quality.msaa} enableNormalPass={false}>
      {quality.dof ? (
        <DepthOfField
          focusDistance={0.0}
          focalLength={quality.focalLength}
          bokehScale={quality.bokeh}
          height={480}
        />
      ) : (
        <></>
      )}
      <Bloom
        mipmapBlur
        luminanceThreshold={0.35}
        luminanceSmoothing={0.5}
        intensity={quality.bloom}
      />
      {quality.vignette ? <Vignette eskil={false} offset={0.25} darkness={0.55} /> : <></>}
    </EffectComposer>
  );
}

// ── Public component ─────────────────────────────────────────────────────────
export default function FloatingGlass({
  className = "fixed inset-0 z-0 pointer-events-none",
}: {
  className?: string;
}) {
  // Computed once on mount; treated as a constant for the session.
  const quality = useMemo(getQuality, []);

  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, quality.dpr]}
        camera={{ position: [0, 0, 13], fov: 42, near: 0.1, far: 100 }}
        gl={{
          alpha: true, // transparent canvas → the page shows through the glass
          antialias: false, // post-processing handles AA
          stencil: false,
          depth: true,
          powerPreference: "high-performance",
        }}
        performance={{ min: 0.5 }} // let R3F regress under load
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Suspense fallback={null}>
          <Rig reducedMotion={quality.reducedMotion} />

          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} color="#ffffff" />

          <GlassPrisms quality={quality} />
          <StudioLighting />

          <Effects quality={quality} />
        </Suspense>
      </Canvas>
    </div>
  );
}
