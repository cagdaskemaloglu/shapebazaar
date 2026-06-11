"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";
import { RotateCcw, ZoomIn, ZoomOut, Sun } from "lucide-react";

interface ModelViewerProps {
  url?: string;
  file?: File;
  color?: string;
  format?: "stl" | "obj" | "3mf";
  className?: string;
  toolbar?: boolean;
  onThumbnail?: (dataUrl: string) => void;
  /** Euler rotasyon (radyan). Tasarımcının kaydettiği rotasyonu uygulamak için. */
  rotation?: { x: number; y: number; z: number };
}

type LoadStatus = "idle" | "loading" | "success" | "error";

function detectFormat(name: string): "stl" | "obj" | "3mf" | null {
  const cleanName = name.split("?")[0];
  const ext = cleanName.split(".").pop()?.toLowerCase();
  if (ext === "stl") return "stl";
  if (ext === "obj") return "obj";
  if (ext === "3mf") return "3mf";
  return null;
}

export function ModelViewer({
  url,
  file,
  color = "#FF6B35",
  format: formatProp,
  className = "",
  toolbar = true,
  onThumbnail,
  rotation,
}: ModelViewerProps) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef     = useRef<THREE.Object3D | null>(null);
  const animRef     = useRef<number>(0);
  const colorRef    = useRef<string>(color ?? "#FF6B35");
  const onThumbnailRef = useRef<((dataUrl: string) => void) | undefined>(onThumbnail);

  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error,  setError]  = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => { onThumbnailRef.current = onThumbnail; }, [onThumbnail]);

  /* ── dark mode ── */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(document.documentElement.classList.contains("dark") || mq.matches);
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  /* ── Three.js init ── */
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? "#1E293B" : "#F1F5F9");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 10, 7);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffeedd, 0.4);
    fill.position.set(-5, -5, -5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xaaddff, 0.3);
    rim.position.set(0, 5, -10);
    scene.add(rim);

    const grid = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance   = 0.1;
    controls.maxDistance   = 500;
    controls.enablePan     = true;
    controlsRef.current    = controls;

    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(el);

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [isDark]);

  /* ── load model ── */
  const loadModel = useCallback(async () => {
    const scene    = sceneRef.current;
    const camera   = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls) return;

    let sourceUrl: string | null = null;
    let format: "stl" | "obj" | "3mf" | null = null;
    let objectUrl: string | null = null;

    if (file) {
      format    = formatProp ?? detectFormat(file.name);
      objectUrl = URL.createObjectURL(file);
      sourceUrl = objectUrl;
    } else if (url) {
      format    = formatProp ?? detectFormat(url);
      sourceUrl = url;
    }

    if (!sourceUrl || !format) {
      setError("Desteklenmeyen format. STL, OBJ veya 3MF yükleyin.");
      setStatus("error");
      return;
    }

    if (meshRef.current) { scene.remove(meshRef.current); meshRef.current = null; }

    setStatus("loading");
    setError("");

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorRef.current),
      roughness: 0.4,
      metalness: 0.1,
    });

    try {
      let object: THREE.Object3D;

      if (format === "stl") {
        const loader = new STLLoader();
        const geometry = await new Promise<THREE.BufferGeometry>((res, rej) => {
          loader.load(sourceUrl!, res, undefined, rej);
        });
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = true;
        object = mesh;
      } else if (format === "obj") {
        const loader = new OBJLoader();
        object = await new Promise<THREE.Object3D>((res, rej) => {
          loader.load(sourceUrl!, res, undefined, rej);
        });
        object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = mat;
            child.castShadow = true;
          }
        });
      } else {
        const loader = new ThreeMFLoader();
        object = await new Promise<THREE.Object3D>((res, rej) => {
          loader.load(sourceUrl!, res, undefined, rej);
        });
        object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = mat;
        });
      }

      /* Center & scale */
      const box    = new THREE.Box3().setFromObject(object);
      const size   = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale  = 4 / maxDim;
      object.scale.setScalar(scale);
      object.position.sub(center.multiplyScalar(scale));

      /* Apply saved rotation if provided */
      if (rotation) {
        object.rotation.set(rotation.x, rotation.y, rotation.z);
      }

      // Rotasyon sonrası merkezi yeniden hesapla ve ortala
      object.updateMatrixWorld(true);
      const rotatedBox    = new THREE.Box3().setFromObject(object);
      const rotatedCenter = new THREE.Vector3();
      rotatedBox.getCenter(rotatedCenter);
      object.position.sub(rotatedCenter);

      scene.add(object);
      meshRef.current = object;

      /* Fit camera */
      const newBox  = new THREE.Box3().setFromObject(object);
      const newSize = new THREE.Vector3();
      newBox.getSize(newSize);
      const dist = Math.max(newSize.x, newSize.y, newSize.z) * 1.6;
      camera.position.set(dist, dist * 0.6, dist);
      controls.target.set(0, 0, 0);
      controls.update();

      setStatus("success");

      if (onThumbnailRef.current) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const renderer = rendererRef.current;
            if (!renderer) return;
            renderer.render(scene, camera);
            try {
              const dataUrl = renderer.domElement.toDataURL("image/png");
              onThumbnailRef.current?.(dataUrl);
            } catch (e) {
              console.warn("Thumbnail capture failed:", e);
            }
          });
        });
      }
    } catch (e) {
      console.error(e);
      setError("Model yüklenemedi. Dosyayı kontrol edin.");
      setStatus("error");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }, [url, file, rotation]);

  useEffect(() => {
    if (!url && !file) return;
    const t = setTimeout(() => loadModel(), 10);
    return () => clearTimeout(t);
  }, [loadModel]);

  /* ── color update ── */
  useEffect(() => {
    colorRef.current = color ?? "#FF6B35";
    if (!meshRef.current) return;
    const c = new THREE.Color(color);
    meshRef.current.traverse((child) => {
      const m = child as THREE.Mesh;
      if (m.isMesh && m.material)
        (m.material as THREE.MeshStandardMaterial).color = c;
    });
  }, [color]);

  /* ── toolbar actions ── */
  function resetCamera() {
    if (!cameraRef.current || !controlsRef.current || !meshRef.current) return;
    const box  = new THREE.Box3().setFromObject(meshRef.current);
    const size = new THREE.Vector3();
    box.getSize(size);
    const dist = Math.max(size.x, size.y, size.z) * 1.6;
    cameraRef.current.position.set(dist, dist * 0.6, dist);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }

  function zoom(factor: number) {
    if (!cameraRef.current || !controlsRef.current) return;
    const dir = new THREE.Vector3();
    cameraRef.current.getWorldDirection(dir);
    cameraRef.current.position.addScaledVector(dir, factor);
    controlsRef.current.update();
  }

  function toggleLight() {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.background = new THREE.Color(
      scene.background instanceof THREE.Color &&
      scene.background.getHexString() === "f1f5f9"
        ? "#1E293B" : "#F1F5F9"
    );
  }

  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      <div ref={mountRef} className="w-full h-full rounded-2xl overflow-hidden" />

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl">
          <div className="w-10 h-10 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Model yükleniyor…</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-sm text-red-500 text-center max-w-[200px]">{error}</p>
          <button onClick={loadModel} className="mt-3 text-xs text-[#FF6B35] hover:underline">
            Tekrar dene
          </button>
        </div>
      )}

      {status === "idle" && !url && !file && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" className="mb-3 opacity-30">
            <path d="M16 3L29 10V22L16 29L3 22V10L16 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M16 3V29M3 10L16 17L29 10" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2"/>
          </svg>
          <p className="text-sm">3D model bekleniyor</p>
          <p className="text-xs opacity-60 mt-1">STL · OBJ · 3MF</p>
        </div>
      )}

      {toolbar && status === "success" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[var(--bg-primary)]/90 backdrop-blur border border-[var(--border)] rounded-xl px-2 py-1.5 shadow-sm">
          {[
            { icon: RotateCcw, action: resetCamera,      tip: "Sıfırla"     },
            { icon: ZoomIn,    action: () => zoom(0.5),  tip: "Yakınlaştır" },
            { icon: ZoomOut,   action: () => zoom(-0.5), tip: "Uzaklaştır"  },
            { icon: Sun,       action: toggleLight,      tip: "Arkaplan"    },
          ].map(({ icon: Icon, action, tip }) => (
            <button key={tip} onClick={action} title={tip}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <Icon size={14} />
            </button>
          ))}
        </div>
      )}

      {status === "success" && (url || file) && (
        <div className="absolute top-3 left-3 text-[10px] font-medium bg-[rgba(255,107,53,0.12)] text-[#FF6B35] px-2 py-0.5 rounded-full">
          {file ? detectFormat(file.name)?.toUpperCase() : detectFormat(url!)?.toUpperCase()}
        </div>
      )}

      {status === "success" && (
        <div className="absolute top-3 right-3 text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-primary)]/70 backdrop-blur px-2 py-1 rounded-lg">
          🖱 Döndür · Kaydır · Yakınlaştır
        </div>
      )}
    </div>
  );
}