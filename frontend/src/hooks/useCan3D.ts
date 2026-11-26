"use client";

/**
 * Capability gate for the WebGL hero. Runs only on the client, lazily (after idle),
 * so the throwaway WebGL context is never created during hydration.
 *
 * Falls back to the static visual when:
 *  - WebGL is unavailable;
 *  - the renderer is software (SwiftShader, llvmpipe, "Microsoft Basic Render Driver"…):
 *    transmission shaders on a CPU rasteriser cost seconds of main thread;
 *  - the user asked to save data, or the device reports ≤ 2 GB RAM or ≤ 2 cores.
 *
 * Reduced motion is handled by the caller (it is a live preference, not a capability).
 *
 * Debug: `?force3d=1` skips only the software-renderer / low-end heuristics so the real
 * 3D path can be checked in headless browsers. WebGL support is still required.
 */

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software|basic render/i;

interface NetworkInformationLike {
  saveData?: boolean;
}

let cached: boolean | null = null;

function forced(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("force3d") === "1";
  } catch {
    return false;
  }
}

function isLowEnd(): boolean {
  const nav = navigator as Navigator & { connection?: NetworkInformationLike; deviceMemory?: number };
  if (nav.connection?.saveData === true) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 2) return true;
  return false;
}

function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  // Firefox exposes the unmasked name via RENDERER and deprecates the extension.
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const value: unknown = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  return typeof value === "string" ? value : "";
}

/** `true` when the device should get the WebGL scene. Computed once per page. */
export function detect3DCapability(): boolean {
  if (cached !== null) return cached;
  let ok = false;
  try {
    const force = forced();
    if (!force && isLowEnd()) {
      ok = false;
    } else {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (gl) {
        ok = force || !SOFTWARE_RENDERER.test(rendererName(gl));
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    }
  } catch {
    ok = false;
  }
  cached = ok;
  return ok;
}

/** Resolves on the next idle period after the page has loaded (setTimeout fallback). */
export function afterLoadIdle(cb: () => void, timeout = 2500): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(() => !cancelled && cb(), { timeout });
    } else {
      timer = setTimeout(() => !cancelled && cb(), 200);
    }
  };

  const onLoad = () => {
    // One more frame so the first paint is committed before any heavy work.
    requestAnimationFrame(() => setTimeout(schedule, 0));
  };

  if (document.readyState === "complete") onLoad();
  else window.addEventListener("load", onLoad, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener("load", onLoad);
    if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
    if (timer !== undefined) clearTimeout(timer);
  };
}
