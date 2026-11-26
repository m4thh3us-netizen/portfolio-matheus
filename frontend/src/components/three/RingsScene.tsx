"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
// Deep imports: the drei barrel pulls Environment's HDR/EXR/gain-map loaders into the chunk.
import { Float } from "@react-three/drei/core/Float";
import { MeshTransmissionMaterial } from "@react-three/drei/core/MeshTransmissionMaterial";
import * as THREE from "three";
import { palette, rgba } from "./palette";

/** Shared, non-React input state (pointer + scroll), written by window listeners. */
interface Inputs {
  px: number; // pointer -1..1
  py: number;
  scroll: number; // 0..1 across the first viewport
}

interface RingSpec {
  radius: number;
  tube: number;
  position: [number, number, number];
  rotation: [number, number, number];
  spin: [number, number];
  tint: string;
}

/*
 * Original composition: three offset glass tori of decreasing size, each on its own
 * tilted axis so they visually interlock without touching a common center.
 */
const RINGS: RingSpec[] = [
  { radius: 1.32, tube: 0.15, position: [0, 0.05, 0], rotation: [1.15, 0.35, -0.4], spin: [0.06, 0.04], tint: "#f2f9ff" },
  { radius: 1.02, tube: 0.12, position: [0.38, -0.12, 0.18], rotation: [0.25, -0.55, 0.3], spin: [-0.05, 0.07], tint: "#efe9ff" },
  { radius: 0.66, tube: 0.1, position: [-0.42, 0.34, -0.12], rotation: [-0.6, 1.1, 0.9], spin: [0.08, -0.05], tint: "#eaf6ff" },
];

/**
 * What the glass "sees" where the alpha canvas is empty: a light, cyan-shifted ice
 * (a dark desaturated navy here reads as steel blue). Tuned so the tube body lands
 * around #9CCBEF; step down (e.g. #86b9e3) if the tubes start reading as solid white.
 */
const GLASS_BG = new THREE.Color(palette.glassBackground);

/** Glass material: slight frost + ice IOR + thin-film iridescence for violet/cyan reflections. */
const GLASS = {
  transmission: 1,
  thickness: 0.6,
  roughness: 0.1,
  ior: 1.31,
  chromaticAberration: 0.08,
  anisotropicBlur: 0.1,
  distortion: 0.08,
  distortionScale: 0.35,
  temporalDistortion: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  iridescence: 0.8,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [240, 560] as [number, number],
  envMapIntensity: 3,
  attenuationDistance: 2.4,
} as const;

const TONE_MAPPING_EXPOSURE = 1.45;

/** Render-cost tier: below lg the canvas is a dimmed, partly off-screen backdrop. */
interface Quality {
  samples: number;
  resolution: number;
  radialSegments: number;
  tubularSegments: number;
  dpr: [number, number];
}
const QUALITY_DESKTOP: Quality = { samples: 4, resolution: 512, radialSegments: 48, tubularSegments: 160, dpr: [1, 1.75] };
const QUALITY_MOBILE: Quality = { samples: 2, resolution: 256, radialSegments: 32, tubularSegments: 96, dpr: [1, 1.5] };

function pickQuality(): Quality {
  return window.matchMedia("(min-width: 1024px)").matches ? QUALITY_DESKTOP : QUALITY_MOBILE;
}

function useBackdropTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const blob = (x: number, y: number, r: number, color: string) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, rgba.bg(0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      };
      blob(size * 0.38, size * 0.42, size * 0.42, rgba.ice(0.4));
      blob(size * 0.66, size * 0.62, size * 0.38, rgba.violet(0.34));
      blob(size * 0.5, size * 0.5, size * 0.18, rgba.text(0.3));
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function Rings({ inputs, quality }: { inputs: React.RefObject<Inputs>; quality: Quality }) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const backdrop = useBackdropTexture();

  useFrame((_state, delta) => {
    const g = group.current;
    const input = inputs.current;
    if (!g || !input) return;
    const d = Math.min(delta, 1 / 30);
    // Damped mouse parallax.
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, input.px * 0.35 + input.scroll * 0.9, 3, d);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -input.py * 0.22 + input.scroll * 0.35, 3, d);
    // Subtle scroll response: drift up and shrink slightly.
    const s = 1 - input.scroll * 0.14;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 4, d));
    g.position.y = THREE.MathUtils.damp(g.position.y, input.scroll * 0.6, 4, d);
    // Slow independent spin per ring.
    meshes.current.forEach((m, i) => {
      if (!m) return;
      m.rotation.x += RINGS[i].spin[0] * d;
      m.rotation.y += RINGS[i].spin[1] * d;
    });
  });

  return (
    <>
      <mesh position={[0, 0, -2.4]} scale={5.2}>
        <planeGeometry />
        <meshBasicMaterial map={backdrop} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={group}>
        <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.5} floatingRange={[-0.08, 0.08]}>
          {RINGS.map((r, i) => (
            <mesh
              key={i}
              ref={(m) => {
                meshes.current[i] = m;
              }}
              position={r.position}
              rotation={r.rotation}
            >
              <torusGeometry args={[r.radius, r.tube, quality.radialSegments, quality.tubularSegments]} />
              <MeshTransmissionMaterial
                {...GLASS}
                samples={quality.samples}
                resolution={quality.resolution}
                background={GLASS_BG}
                color={r.tint}
                // Middle ring leans violet.
                attenuationColor={i === 1 ? palette.violetAttenuation : palette.iceAttenuation}
              />
            </mesh>
          ))}
        </Float>
      </group>
    </>
  );
}

interface FormerSpec {
  form: "rect" | "ring";
  intensity: number;
  color: string;
  position: [number, number, number];
  scale: number | [number, number];
}

/*
 * Studio "lightformers" baked once into a cube map (equivalent to drei's
 * <Environment frames={1}> + <Lightformer>, without its file loaders).
 * Every former faces the origin.
 */
const FORMERS: FormerSpec[] = [
  { form: "rect", intensity: 10, color: palette.iceLight, position: [-4, 3, 3], scale: [6, 2] },
  { form: "rect", intensity: 8, color: palette.violet, position: [3.5, 0.5, -1], scale: [3, 5] },
  { form: "rect", intensity: 4, color: palette.violet, position: [-3, -2.5, 2], scale: [5, 0.6] },
  // Back-left ice strip: grazing-angle rims catch it as a bright #E6F5FF edge.
  { form: "rect", intensity: 12, color: palette.iceLight, position: [-3.5, 1, -3], scale: [1.2, 6] },
  { form: "ring", intensity: 4, color: palette.ice, position: [0, 0, 6], scale: 3 },
  { form: "rect", intensity: 3, color: palette.text, position: [0, 5, 0], scale: [8, 1] },
];

/** Yields to the event loop so each warm-up step is its own (short) task. */
const nextTask = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** `isReady` exists on three's WebGLProgram (used by compileAsync) but is not in the typings. */
type ProgramWithStatus = { isReady?: () => boolean };

/** Polls until every program known to the renderer finished (parallel) compilation. */
async function programsReady(gl: THREE.WebGLRenderer, isCancelled: () => boolean, budgetMs = 4000) {
  const start = performance.now();
  for (;;) {
    const programs = (gl.info.programs ?? []) as unknown as ProgramWithStatus[];
    if (programs.every((p) => p.isReady?.() ?? true)) return;
    if (isCancelled() || performance.now() - start > budgetMs) return;
    await nextTask(16);
  }
}

/**
 * PMREMGenerator compiles its GGX prefilter shaders lazily inside its first render, which
 * blocks the main thread (≈300 ms on ANGLE/D3D11). Run it once with `render` swapped for
 * `compile`: identical programs are created (same render targets, same cache keys) but not
 * drawn, so with KHR_parallel_shader_compile nothing waits. The real pass then hits the cache.
 */
function prewarmPmrem(gl: THREE.WebGLRenderer, pmrem: THREE.PMREMGenerator, source: THREE.CubeTexture) {
  const render = gl.render;
  gl.render = ((scene: THREE.Object3D, camera: THREE.Camera) => {
    gl.compile(scene, camera);
  }) as typeof gl.render;
  try {
    // Keep `pmrem` alive afterwards: disposing it would release the warmed programs.
    pmrem.fromCubemap(source).dispose();
  } finally {
    gl.render = render;
  }
}

/**
 * Warm-up, one short task per step, before the first frame is allowed to render:
 *  1. bake the lightformers into a cube map (drei <Environment frames={1}> equivalent);
 *  2. compile the PMREM shaders in parallel (prewarmPmrem);  3. prefilter (PMREM) the cube map;
 *  4. compile every material program for the render-target passes (MeshTransmissionMaterial
 *     re-renders the scene into an FBO: no tone mapping / linear output) and 5. on screen,
 *     both via compileAsync (KHR_parallel_shader_compile when available).
 */
function useWarmup(onDone: () => void) {
  const get = useThree((s) => s.get);

  useEffect(() => {
    let cancelled = false;
    const disposables: { dispose: () => void }[] = [];
    const { gl, scene, camera } = get();
    const previousEnv = scene.environment;

    const run = async () => {
      const cube = new THREE.WebGLCubeRenderTarget(256);
      cube.texture.type = THREE.HalfFloatType;
      const virtual = new THREE.Scene();
      // Cool fill so grazing-angle (Fresnel) rims reflect pale ice instead of black.
      virtual.background = new THREE.Color(palette.envFill);
      disposables.push(cube);
      const origin = new THREE.Vector3(0, 0, 0);
      for (const f of FORMERS) {
        const geometry = f.form === "ring" ? new THREE.RingGeometry(0.25, 0.5, 64) : new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide });
        material.color.set(f.color).multiplyScalar(f.intensity);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...f.position);
        if (Array.isArray(f.scale)) mesh.scale.set(f.scale[0], f.scale[1], 1);
        else mesh.scale.setScalar(f.scale);
        mesh.lookAt(origin);
        virtual.add(mesh);
        disposables.push(geometry, material);
      }
      const cubeCamera = new THREE.CubeCamera(0.1, 1000, cube);
      const autoClear = gl.autoClear;
      gl.autoClear = true;
      cubeCamera.update(gl, virtual);
      gl.autoClear = autoClear;

      await nextTask();
      if (cancelled) return;
      const pmrem = new THREE.PMREMGenerator(gl);
      disposables.push(pmrem);
      prewarmPmrem(gl, pmrem, cube.texture);
      await programsReady(gl, () => cancelled);

      await nextTask();
      if (cancelled) return;
      const env = pmrem.fromCubemap(cube.texture);
      disposables.push(env);
      scene.environment = env.texture;

      await nextTask();
      if (cancelled) return;
      const probe = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
      disposables.push(probe);
      const previousTarget = gl.getRenderTarget();
      gl.setRenderTarget(probe);
      const offscreen = gl.compileAsync(scene, camera);
      gl.setRenderTarget(previousTarget);

      await nextTask();
      if (cancelled) return;
      const onscreen = gl.compileAsync(scene, camera);

      await Promise.all([offscreen, onscreen]).catch(() => undefined);
      if (!cancelled) onDone();
    };
    run();

    return () => {
      cancelled = true;
      scene.environment = previousEnv;
      disposables.forEach((d) => d.dispose());
    };
  }, [get, onDone]);
}

function Warmup({ onDone }: { onDone: () => void }) {
  useWarmup(onDone);
  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} color={palette.ice} />
      {/* Ice-blue key light */}
      <directionalLight position={[-3, 4, 5]} intensity={2.4} color={palette.iceLight} />
      {/* Violet rim light from behind-right */}
      <pointLight position={[3.2, 1.2, -1.8]} intensity={45} distance={12} decay={2} color={palette.violet} />
    </>
  );
}

/** Calls `onReady` once the first frame has actually been drawn (shaders compiled). */
function FirstFrame({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    // useFrame runs before the render of its tick: on the 2nd tick, frame 1 is on screen.
    frames.current += 1;
    if (frames.current >= 2) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

/**
 * The FOV is vertical: on narrow canvases the 2.9-unit ring group overflows the width.
 * Pull the camera back as the aspect drops below ~0.9 so the rings always fit.
 */
function FitCamera() {
  const get = useThree((s) => s.get);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    const aspect = width / Math.max(1, height);
    const cam = get().camera as THREE.PerspectiveCamera;
    cam.position.z = THREE.MathUtils.clamp(7.8 * Math.max(1, 0.9 / aspect), 7.8, 12.5);
    cam.updateProjectionMatrix();
  }, [get, width, height]);
  return null;
}

export default function RingsScene({ active, onReady }: { active: boolean; onReady: () => void }) {
  const inputs = useRef<Inputs>({ px: 0, py: 0, scroll: 0 });
  // Chosen once per mount: switching tiers on resize would recompile the shaders.
  const [quality] = useState(pickQuality);
  const [compiled, setCompiled] = useState(false);
  const markCompiled = useCallback(() => setCompiled(true), []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      inputs.current.px = (e.clientX / window.innerWidth) * 2 - 1;
      inputs.current.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      inputs.current.scroll = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));
    };
    onScroll();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <Canvas
      dpr={quality.dpr}
      frameloop={active && compiled ? "always" : "never"}
      camera={{ position: [0, 0, 7.8], fov: 36 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        // Neutral keeps the ice hue (ACES pulled saturated blues toward grey).
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = TONE_MAPPING_EXPOSURE;
      }}
      style={{ background: "transparent" }}
    >
      <FitCamera />
      <Lights />
      <Rings inputs={inputs} quality={quality} />
      <FirstFrame onReady={onReady} />
      <Warmup onDone={markCompiled} />
    </Canvas>
  );
}
