import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  getBrainDomain,
  OVERVIEW_VIEW,
  type BrainDomain,
} from '../lib/brain-domains';

export type BrainModelProps = {
  className?: string;
  /** Keep the default view still; this is opt-in for contexts that want motion. */
  gentleRotation?: boolean;
  /** Changing this causes a clean loader/renderer retry. */
  retryKey?: number;
  modelUrl?: string;
  /** Educational focus index. Null (or an unknown index) shows the overview. */
  focusSector?: number | null;
};

type ViewerStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

type SharedBrainAsset = {
  scene: THREE.Group;
};

type ViewController = {
  focus: (index: number | null | undefined) => void;
};

const DEFAULT_MODEL_URL = `${import.meta.env.BASE_URL}models/brain.glb?v=neutral`;
const OVERVIEW_POSTER_URL = `${import.meta.env.BASE_URL}models/brain-poster.png?v=neutral`;
const sharedAssetCache = new Map<string, Promise<SharedBrainAsset>>();

function readableError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'The brain model could not be loaded.';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function getDomain(index: number | null | undefined): BrainDomain | undefined {
  return getBrainDomain(index);
}

function posterForDomain(domain: BrainDomain | undefined): string {
  return domain
    ? `${import.meta.env.BASE_URL}models/brain-focus-${domain.id}.png`
    : OVERVIEW_POSTER_URL;
}

function ViewerStatusMessage({
  status,
  domain,
  onRetry,
}: {
  status: ViewerStatus;
  domain?: BrainDomain;
  onRetry: () => void;
}) {
  const poster = posterForDomain(domain);
  const focusDescription = domain
    ? ` focused on approximate ${domain.region} region`
    : '';

  if (status.kind === 'ready') return null;
  if (status.kind === 'loading') {
    return (
      <>
        <img
          src={poster}
          alt={
            domain
              ? `Still render of the brain model, approximate ${domain.region} focus`
              : 'Still render of the overview anatomical brain model'
          }
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
        <p
          role="status"
          className="absolute inset-x-0 bottom-1 text-center text-xs text-navy/70"
        >
          Loading interactive 3D{focusDescription}…
        </p>
      </>
    );
  }

  return (
    <div className="absolute inset-0 z-20 text-center">
      <img
        src={poster}
        alt={
          domain
            ? `Still render of the brain model, approximate ${domain.region} focus`
            : 'Still render of the overview anatomical brain model'
        }
        className="absolute inset-0 h-full w-full object-contain"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 rounded-xl bg-cream/95 px-2 text-xs text-navy/70">
        <span role="status">Still view · interactive 3D unavailable</span>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 px-2 font-semibold text-navy underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-cyan"
        >
          Retry 3D
        </button>
      </div>
      <span className="sr-only">{status.message}</span>
    </div>
  );
}

/**
 * Small native Three.js viewer. It deliberately does not dispose shared GLTF
 * resources: all clones share the loader's geometry/material/texture cache.
 */
export function BrainModel({
  className = 'absolute inset-0',
  gentleRotation = false,
  retryKey = 0,
  modelUrl = DEFAULT_MODEL_URL,
  focusSector = null,
}: BrainModelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ViewController | null>(null);
  const focusSectorRef = useRef<number | null | undefined>(focusSector);
  const [status, setStatus] = useState<ViewerStatus>({ kind: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const domain = getDomain(focusSector);

  // Keep this value current without making focus changes tear down the renderer.
  focusSectorRef.current = focusSector;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    // A fresh canvas is intentional. forceContextLoss() makes a reused canvas
    // unusable in some browsers (and during HMR), so it must never be retained
    // in JSX or reused by a later renderer setup.
    const canvas = document.createElement('canvas');
    canvas.className =
      'block h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing';
    canvas.style.touchAction = 'pan-y';
    canvas.style.userSelect = 'none';
    canvas.setAttribute('aria-label', 'Interactive 3D brain model');
    canvas.tabIndex = -1;
    host.appendChild(canvas);

    let disposed = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let frame: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let modelRoot: THREE.Group | null = null;
    let markerRoot: THREE.Group | null = null;
    let markerMaterial: THREE.MeshBasicMaterial | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let modelReady = false;
    let visible = true;
    let documentVisible = document.visibilityState !== 'hidden';
    const reducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const animateGently = gentleRotation && !reducedMotion;
    // Focus posters use a straight-on camera at (0, 0, distance).
    const cameraDirection = new THREE.Vector3(0, 0, 1);
    const overviewQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(...OVERVIEW_VIEW.rotation),
    );
    let gentleBaseQuaternion = overviewQuaternion.clone();
    let gentlePaused = false;
    let transition:
      | {
          startedAt: number;
          elapsed: number;
          fromQuaternion: THREE.Quaternion;
          toQuaternion: THREE.Quaternion;
          fromPosition: THREE.Vector3;
          toPosition: THREE.Vector3;
          fromDistance: number;
          toDistance: number;
        }
      | null = null;

    type DragState = {
      pointerId: number;
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
      intent: 'none' | 'undecided' | 'orbit' | 'scroll';
    };
    const drag: DragState = {
      pointerId: -1,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      intent: 'none',
    };

    const stopFrame = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const pauseTransition = () => {
      if (!transition) return;
      const now = performance.now();
      transition.elapsed += now - transition.startedAt;
      transition.startedAt = now;
    };

    const render = () => {
      if (!renderer || !scene || !camera || !modelReady || !visible || !documentVisible) {
        return;
      }
      renderer.render(scene, camera);
    };

    const needsFrame = () => Boolean(transition) || (animateGently && !gentlePaused);

    let tick: (time: number) => void;
    const startFrame = () => {
      if (
        frame !== null ||
        disposed ||
        !visible ||
        !documentVisible ||
        !needsFrame()
      ) {
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const tickFrame = (time: number) => {
      frame = null;
      if (disposed || !renderer || !scene || !camera || !modelRoot || !modelReady) {
        return;
      }
      if (!visible || !documentVisible) return;

      if (transition) {
        const progress = clamp(
          (transition.elapsed + time - transition.startedAt) / 1100,
          0,
          1,
        );
        // Smoothstep avoids an abrupt start or stop while keeping rapid
        // selections responsive (each transition starts from the current pose).
        const eased = progress * progress * (3 - 2 * progress);
        modelRoot.quaternion.slerpQuaternions(
          transition.fromQuaternion,
          transition.toQuaternion,
          eased,
        );
        modelRoot.position.lerpVectors(
          transition.fromPosition,
          transition.toPosition,
          eased,
        );
        const distance =
          transition.fromDistance +
          (transition.toDistance - transition.fromDistance) * eased;
        camera.position.copy(cameraDirection).multiplyScalar(distance);
        camera.lookAt(0, 0, 0);
        if (progress >= 1) {
          modelRoot.quaternion.copy(transition.toQuaternion);
          modelRoot.position.copy(transition.toPosition);
          gentleBaseQuaternion.copy(transition.toQuaternion);
          transition = null;
        }
        renderer.render(scene, camera);
      } else if (animateGently && !gentlePaused) {
        const gentleQuaternion = gentleBaseQuaternion.clone().multiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            Math.sin(time * 0.00018) * 0.018,
          ),
        );
        modelRoot.quaternion.copy(gentleQuaternion);
        renderer.render(scene, camera);
      }

      if (needsFrame()) startFrame();
    };
    tick = tickFrame;

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

    const setMarker = (nextDomain: BrainDomain | undefined) => {
      if (!markerRoot) return;
      if (!nextDomain) {
        markerRoot.visible = false;
        return;
      }
      markerRoot.visible = true;
      markerRoot.position
        .set(...nextDomain.view.target)
        .multiplyScalar(0.91);
    };

    const applyFocus = (nextDomain: BrainDomain | undefined, instantly = reducedMotion) => {
      if (!modelRoot || !camera || !modelReady) return;
      setMarker(nextDomain);
      const view = nextDomain?.view ?? OVERVIEW_VIEW;
      const targetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...view.rotation),
      );
      const targetPoint = new THREE.Vector3(...view.target).multiplyScalar(0.91);
      const targetPosition = targetPoint.clone().applyQuaternion(targetQuaternion).negate();
      const currentDistance = camera.position.length() || OVERVIEW_VIEW.distance;

      if (instantly) {
        modelRoot.quaternion.copy(targetQuaternion);
        modelRoot.position.copy(targetPosition);
        camera.position.copy(cameraDirection).multiplyScalar(view.distance);
        camera.lookAt(0, 0, 0);
        gentleBaseQuaternion.copy(targetQuaternion);
        transition = null;
        render();
        return;
      }

      transition = {
        startedAt: performance.now(),
        elapsed: 0,
        fromQuaternion: modelRoot.quaternion.clone(),
        toQuaternion: targetQuaternion,
        fromPosition: modelRoot.position.clone(),
        toPosition: targetPosition,
        fromDistance: currentDistance,
        toDistance: view.distance,
      };
      startFrame();
    };

    const focus = (index: number | null | undefined) => {
      // Resolve on every call so a rapid sequence always replaces the previous
      // destination, rather than queueing stale transitions.
      applyFocus(getDomain(index));
    };
    controllerRef.current = { focus };

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
        if (
          event.pointerType !== 'mouse' &&
          Math.abs(totalY) > Math.abs(totalX) * 1.1
        ) {
          drag.intent = 'scroll';
          drag.pointerId = -1;
          return;
        }
        drag.intent = 'orbit';
        // A real orbit gesture cancels a focus transition at its current pose.
        transition = null;
        gentlePaused = true;
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
      render();
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
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

    const onDocumentVisibility = () => {
      documentVisible = document.visibilityState !== 'hidden';
      if (documentVisible) {
        if (transition) transition.startedAt = performance.now();
        render();
        startFrame();
      } else {
        pauseTransition();
        stopFrame();
      }
    };

    const cleanup = () => {
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
      if (modelRoot?.parent) modelRoot.parent.remove(modelRoot);
      markerMaterial?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer = null;
      controllerRef.current = null;
      // Never leave a context-lost canvas behind for a retry or HMR setup.
      if (canvas.parentElement === host) host.removeChild(canvas);
    };

    setStatus({ kind: 'loading' });

    try {
      // Three r186 viewer support is deliberately WebGL2-only. Do not fall
      // through to a WebGL1 renderer with different material behavior.
      const webgl2 = canvas.getContext('webgl2', { alpha: true });
      if (!webgl2) {
        setStatus({
          kind: 'error',
          message: 'This browser does not provide a usable WebGL2 context.',
        });
        cleanup();
        return undefined;
      }

      renderer = new THREE.WebGLRenderer({
        canvas,
        context: webgl2,
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
      camera.position.copy(cameraDirection).multiplyScalar(OVERVIEW_VIEW.distance);
      camera.lookAt(0, 0, 0);
      modelRoot = new THREE.Group();
      modelRoot.quaternion.copy(overviewQuaternion);
      scene.add(modelRoot);

      markerRoot = new THREE.Group();
      markerRoot.visible = false;
      const markerGeometry = new THREE.SphereGeometry(0.045, 16, 10);
      markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x63e6ed,
        transparent: true,
        opacity: 0.78,
        depthTest: false,
      });
      markerRoot.add(new THREE.Mesh(markerGeometry, markerMaterial));
      modelRoot.add(markerRoot);

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
              if (transition) transition.startedAt = performance.now();
              resize();
              render();
              startFrame();
            } else {
              pauseTransition();
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
      cleanup();
      return undefined;
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

        // The normalized model's max dimension is 1.82. Domain targets are
        // authored in max-dimension-2 coordinates and are scaled by .91 below.
        const normalized = new THREE.Group();
        const fitScale = 1.82 / maxDimension;
        normalized.position.copy(center).multiplyScalar(-fitScale);
        normalized.scale.setScalar(fitScale);
        normalized.add(modelInstance);
        modelRoot.add(normalized);

        modelReady = true;
        applyFocus(getDomain(focusSectorRef.current), true);
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

    return cleanup;
  }, [gentleRotation, loadAttempt, modelUrl, retryKey]);

  useEffect(() => {
    controllerRef.current?.focus(focusSector);
  }, [focusSector]);

  const retry = () => setLoadAttempt((attempt) => attempt + 1);
  const focusLabel = domain
    ? `Approximate focus · ${domain.region}`
    : 'Overview';

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      data-brain-viewer="three"
    >
      <ViewerStatusMessage status={status} domain={domain} onRetry={retry} />
      <div
        aria-live="polite"
        className={`pointer-events-none absolute left-3 right-3 top-3 z-30 w-fit rounded-full bg-cream/95 px-3 py-1 text-[11px] font-semibold tracking-wide text-navy/80 shadow-sm ${
          domain ? '' : 'sr-only'
        }`}
      >
        {focusLabel}
      </div>
    </div>
  );
}