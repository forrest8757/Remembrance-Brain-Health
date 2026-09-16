import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type BrainModelProps = {
  className?: string;
  /** Keep the default view still; this is opt-in for contexts that want motion. */
  gentleRotation?: boolean;
  /** Changing this causes a clean loader/renderer retry. */
  retryKey?: number;
  modelUrl?: string;
};

type ViewerStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

type SharedBrainAsset = {
  scene: THREE.Group;
};

const DEFAULT_MODEL_URL = `${import.meta.env.BASE_URL}models/brain.glb`;
const POSTER_URL = `${import.meta.env.BASE_URL}models/brain-poster.png`;
const sharedAssetCache = new Map<string, Promise<SharedBrainAsset>>();

function readableError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'The brain model could not be loaded.';
}

function hasWebGL(canvas: HTMLCanvasElement): boolean {
  try {
    return Boolean(
      canvas.getContext('webgl2', { alpha: true }) ||
        canvas.getContext('webgl', { alpha: true }),
    );
  } catch {
    return false;
  }
}

function loadSharedBrainAsset(url: string): Promise<SharedBrainAsset> {
  const cached = sharedAssetCache.get(url);
  if (cached) return cached;

  const request = import('three/examples/jsm/loaders/GLTFLoader.js')
    .then(({ GLTFLoader }) => {
      return new Promise<SharedBrainAsset>((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
          url,
          (gltf) => {
            if (!gltf.scene) {
              reject(new Error('The uploaded brain model did not contain a scene.'));
              return;
            }
            resolve({ scene: gltf.scene });
          },
          undefined,
          (error) => reject(error),
        );
      });
    })
    .catch((error: unknown) => {
      // A failed request must not poison a later explicit Retry. Successful
      // assets remain shared for the lifetime of the page.
      if (sharedAssetCache.get(url) === request) {
        sharedAssetCache.delete(url);
      }
      throw error;
    });

  sharedAssetCache.set(url, request);
  return request;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ViewerStatusMessage({
  status,
  onRetry,
}: {
  status: ViewerStatus;
  onRetry: () => void;
}) {
  if (status.kind === 'ready') return null;
  if (status.kind === 'loading') {
    return (
      <>
        <img src={POSTER_URL} alt="Uploaded anatomical brain model" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        <p role="status" className="absolute inset-x-0 bottom-1 text-center text-xs text-navy/70">
          Loading interactive 3D…
        </p>
      </>
    );
  }

  return (
    <div
      className="absolute inset-0 z-20 text-center"
    >
      <img src={POSTER_URL} alt="Still render of the uploaded anatomical brain model" className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 rounded-xl bg-cream/95 px-2 text-xs text-navy/70">
        <span role="status">Still view · interactive 3D unavailable</span>
        <button type="button" onClick={onRetry} className="min-h-11 px-2 font-semibold text-navy underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-cyan">
          Retry 3D
        </button>
      </div>
      <span className="sr-only">{status.message}</span>
    </div>
  );
}

/**
 * Small native Three.js viewer. It deliberately does not use a per-mesh
 * disposal routine: all clones share the GLTF loader's geometry/material/
 * texture resources through sharedAssetCache.
 */
export function BrainModel({
  className = 'absolute inset-0',
  gentleRotation = false,
  retryKey = 0,
  modelUrl = DEFAULT_MODEL_URL,
}: BrainModelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ViewerStatus>({ kind: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return undefined;

    let disposed = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let frame: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let modelRoot: THREE.Group | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let modelReady = false;
    let visible = true;
    let documentVisible = document.visibilityState !== 'hidden';
    const reducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const animateGently = gentleRotation && !reducedMotion;

    setStatus({ kind: 'loading' });

    const stopFrame = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const render = () => {
      if (!renderer || !scene || !camera || !modelReady || !visible || !documentVisible) {
        return;
      }
      renderer.render(scene, camera);
    };

    const startFrame = () => {
      if (!animateGently || frame !== null || !visible || !documentVisible) return;
      frame = requestAnimationFrame(tick);
    };

    const tick = (time: number) => {
      frame = null;
      if (disposed || !renderer || !scene || !camera || !modelRoot || !modelReady) {
        return;
      }
      if (!visible || !documentVisible) return;
      // A deliberately tiny oscillation is opt-in. Dragging stays in control
      // and the default is entirely still.
      if (animateGently) {
        modelRoot.rotation.z = Math.sin(time * 0.00018) * 0.018;
        renderer.render(scene, camera);
        startFrame();
      }
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };

    const onDocumentVisibility = () => {
      documentVisible = document.visibilityState !== 'hidden';
      if (documentVisible) {
        render();
        startFrame();
      } else {
        stopFrame();
      }
    };

    const drag = {
      pointerId: -1,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      intent: 'none' as 'none' | 'undecided' | 'orbit' | 'scroll',
    };

    const finishPointer = (event: PointerEvent) => {
      if (drag.pointerId !== event.pointerId) return;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      drag.pointerId = -1;
      drag.intent = 'none';
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!modelReady || (event.pointerType === 'mouse' && event.button !== 0)) return;
      drag.pointerId = event.pointerId;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.intent = 'undecided';
    };

    const onPointerMove = (event: PointerEvent) => {
      if (drag.pointerId !== event.pointerId || !modelRoot) return;
      const totalX = event.clientX - drag.startX;
      const totalY = event.clientY - drag.startY;
      if (drag.intent === 'undecided' && Math.hypot(totalX, totalY) > 6) {
        // Let the browser keep vertical touch gestures for page scrolling.
        // Only claim a clear horizontal gesture for model rotation.
        if (
          event.pointerType !== 'mouse' &&
          Math.abs(totalY) > Math.abs(totalX) * 1.1
        ) {
          drag.intent = 'scroll';
          drag.pointerId = -1;
          return;
        }
        drag.intent = 'orbit';
        canvas.setPointerCapture(event.pointerId);
      }
      if (drag.intent !== 'orbit') return;

      event.preventDefault();
      modelRoot.rotation.y += (event.clientX - drag.lastX) * 0.008;
      modelRoot.rotation.x = clamp(
        modelRoot.rotation.x + (event.clientY - drag.lastY) * 0.006,
        -0.42,
        0.42,
      );
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      render();
    };

    const onPointerUp = (event: PointerEvent) => finishPointer(event);
    const onPointerCancel = (event: PointerEvent) => finishPointer(event);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      if (!disposed) {
        stopFrame();
        setStatus({
          kind: 'error',
          message: 'The WebGL context was lost while displaying the brain model.',
        });
      }
    };

    if (!hasWebGL(canvas)) {
      setStatus({
        kind: 'error',
        message: 'This browser does not provide a usable WebGL context.',
      });
      return () => {
        disposed = true;
      };
    }

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xe8fbff, 0x142947, 1.8));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
      keyLight.position.set(2.5, 3.5, 4);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x83e9f1, 0.8);
      fillLight.position.set(-3, 1, 2);
      scene.add(fillLight);

      camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
      camera.position.set(0.12, 0.08, 4.4);
      camera.lookAt(0, 0, 0);
      modelRoot = new THREE.Group();
      // A calm 3/4 view; users can rotate it horizontally when they choose.
      modelRoot.rotation.set(0.1, -0.65, 0);
      scene.add(modelRoot);

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove, { passive: false });
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerCancel);
      canvas.addEventListener('webglcontextlost', onContextLost);
      document.addEventListener('visibilitychange', onDocumentVisibility);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      }
      window.addEventListener('resize', resize);
      if ('IntersectionObserver' in window) {
        intersectionObserver = new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting;
            if (visible) {
              resize();
              render();
              startFrame();
            } else {
              stopFrame();
            }
          },
          { threshold: 0, rootMargin: '80px' },
        );
        intersectionObserver.observe(host);
      }
      resize();
    } catch (error) {
      setStatus({
        kind: 'error',
        message: `WebGL could not start: ${readableError(error)}`,
      });
      return () => {
        disposed = true;
      };
    }

    loadSharedBrainAsset(modelUrl)
      .then(({ scene: sourceScene }) => {
        if (disposed || !modelRoot || !scene) return;
        const modelInstance = sourceScene.clone(true);
        modelInstance.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(modelInstance);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);

        if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
          throw new Error('The uploaded brain model has no visible dimensions.');
        }

        // The uploaded OBJ conversion is centered and normalized. This small
        // fit step also keeps a future export with a different unit scale
        // comfortably inside the camera without making the brain tiny.
        const normalized = new THREE.Group();
        const fitScale = 1.82 / maxDimension;
        normalized.position.copy(center).multiplyScalar(-fitScale);
        normalized.scale.setScalar(fitScale);
        normalized.add(modelInstance);
        modelRoot.add(normalized);

        modelReady = true;
        setStatus({ kind: 'ready' });
        resize();
        render();
        startFrame();
      })
      .catch((error: unknown) => {
        if (disposed) return;
        stopFrame();
        setStatus({
          kind: 'error',
          message: `The uploaded brain model could not be loaded: ${readableError(error)}`,
        });
      });

    return () => {
      disposed = true;
      stopFrame();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onDocumentVisibility);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (drag.pointerId !== -1 && canvas.hasPointerCapture(drag.pointerId)) {
        canvas.releasePointerCapture(drag.pointerId);
      }
      // Do not traverse/dispose model resources: clones intentionally share
      // GLTF geometry, materials, and textures in sharedAssetCache.
      if (modelRoot?.parent) modelRoot.parent.remove(modelRoot);
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer = null;
    };
  }, [gentleRotation, loadAttempt, modelUrl, retryKey]);

  const retry = () => setLoadAttempt((attempt) => attempt + 1);

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      data-brain-viewer="three"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
        style={{ touchAction: 'pan-y', userSelect: 'none' }}
        aria-label="Interactive 3D brain model"
        tabIndex={-1}
      />
      <ViewerStatusMessage status={status} onRetry={retry} />
    </div>
  );
}
