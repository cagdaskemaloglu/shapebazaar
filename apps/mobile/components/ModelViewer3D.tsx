import { useRef, useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, PanResponder, ActivityIndicator } from "react-native";
import { GLView } from "expo-gl";
import { Renderer, THREE } from "expo-three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react-native";
import { useTranslation } from "react-i18next";

// three.js global instance sorunu için (bkz. expo-three dokümantasyonu):
// paket kendi içinde birden fazla THREE kopyası oluşmasını önlemek amacıyla
// tek bir global referans bekliyor.
// @ts-ignore
global.THREE = global.THREE || THREE;

interface Props {
  fileUrl: string;
  fileFormat: string; // "stl" | "obj" — 3mf mobile'da desteklenmiyor (bkz. not)
  /** Tasarımcının kaydettiği başlangıç yönelimi (Euler, radyan) — web viewer ile aynı: x, y VE z. */
  rotation?: { x: number; y: number; z: number };
  /** Seçilen baskı rengi (hex). Değişince model anında bu rengi alır. */
  colorHex?: string;
  /** Viewer'a dokunulduğunda true, bırakıldığında false döner. Üst ekran
   *  bunu kullanarak kendi ScrollView'ını geçici olarak kapatmalı — aksi
   *  halde iOS'un native UIScrollView'ı dikey sürüklemeyi JS'teki
   *  PanResponder'dan ÖNCE yakalayıp sayfayı kaydırıyor. */
  onInteractionChange?: (active: boolean) => void;
}

const DEFAULT_DISTANCE = 3;
const MIN_DISTANCE = DEFAULT_DISTANCE * 0.35;
const MAX_DISTANCE = DEFAULT_DISTANCE * 3;
const DEFAULT_COLOR = "#FF6B35";
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);

export function ModelViewer3D({ fileUrl, fileFormat, rotation, colorHex, onInteractionChange }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unsupported">("loading");

  const sceneRef  = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef  = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<InstanceType<typeof Renderer> | null>(null);
  const glRef = useRef<any>(null);
  const cameraDistance = useRef(DEFAULT_DISTANCE);

  // Modelin malzemeleri (renk değişince güncellenir) ve geçerli renk
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const colorRef = useRef(colorHex ?? DEFAULT_COLOR);

  // Başlangıç yönelimi: web viewer ile aynı Euler (x, y, z) → quaternion
  const baseQuat = useRef(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation?.x ?? 0, rotation?.y ?? 0, rotation?.z ?? 0))
  );

  // Gesture durumu
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistance = useRef<number | null>(null);
  const velocity = useRef({ x: 0, y: 0 }); // rad/ms (yaw, pitch)
  const lastMoveTime = useRef(0);
  const rafId = useRef<number | null>(null);
  const viewSize = useRef(320);

  const render = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !glRef.current) return;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    glRef.current.endFrameEXP();
  }, []);

  // Kamera hafif yukarıdan (yaklaşık 17°) modele bakıyor — böylece zemin
  // gridi yatay bir çizgi yerine perspektifli bir düzlem olarak görünüyor.
  function applyCamera() {
    const camera = cameraRef.current;
    if (!camera) return;
    const d = cameraDistance.current;
    camera.position.set(0, d * 0.3, d);
    camera.lookAt(0, 0, 0);
  }

  // ── Renk ──────────────────────────────────────────────────────────────
  const applyColor = useCallback((hex: string) => {
    colorRef.current = hex;
    materialsRef.current.forEach((m) => m.color.set(hex));
  }, []);

  useEffect(() => {
    applyColor(colorHex ?? DEFAULT_COLOR);
    render();
  }, [colorHex, applyColor, render]);

  // ── Döndürme: DÜNYA eksenleri etrafında (trackball) ───────────────────
  // Eski sürüm Euler açılarını biriktiriyordu: model bir kez eğilince yatay sürükleme modelin
  // KENDİ ekseni etrafında dönüyor, parmağın yönüyle uyuşmuyordu. Burada her sürükleme, ekrana
  // göre sağ-sol (dünya Y) ve yukarı-aşağı (dünya X) eksenlerinde dönüş olarak modele eklenir.
  function rotateBy(yaw: number, pitch: number) {
    const g = groupRef.current;
    if (!g) return;
    const qy = new THREE.Quaternion().setFromAxisAngle(AXIS_Y, yaw);
    const qx = new THREE.Quaternion().setFromAxisAngle(AXIS_X, pitch);
    g.quaternion.premultiply(qy).premultiply(qx);
    render();
  }

  function cancelInertia() {
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
  }

  // Parmak kalkınca hız sönümlenerek dönmeye devam eder
  function startInertia() {
    cancelInertia();
    let last = Date.now();
    const step = () => {
      const now = Date.now();
      const dt = Math.min(now - last, 32);
      last = now;
      const v = velocity.current;
      if (Math.hypot(v.x, v.y) < 0.00004) { rafId.current = null; return; }
      rotateBy(v.x * dt, v.y * dt);
      const decay = Math.pow(0.94, dt / 16);
      v.x *= decay;
      v.y *= decay;
      rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
  }

  useEffect(() => cancelInertia, []);

  function resetCamera() {
    cancelInertia();
    velocity.current = { x: 0, y: 0 };
    if (groupRef.current) groupRef.current.quaternion.copy(baseQuat.current);
    cameraDistance.current = DEFAULT_DISTANCE;
    applyCamera();
    render();
  }

  // Çarpımsal zoom: factor < 1 yaklaşır, > 1 uzaklaşır
  function zoom(factor: number) {
    cameraDistance.current = Math.min(Math.max(cameraDistance.current * factor, MIN_DISTANCE), MAX_DISTANCE);
    applyCamera();
    render();
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,

      onPanResponderGrant: () => {
        cancelInertia();
        velocity.current = { x: 0, y: 0 };
        lastTouch.current = null;
        lastPinchDistance.current = null;
        lastMoveTime.current = Date.now();
      },

      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length >= 2) {
          // İki parmak → oransal pinch zoom (parmaklar açılınca yaklaş)
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.hypot(dx, dy);
          if (lastPinchDistance.current != null && distance > 0) {
            zoom(lastPinchDistance.current / distance);
          }
          lastPinchDistance.current = distance;
          lastTouch.current = null; // parmak sayısı değişince döndürmede sıçrama olmasın
          velocity.current = { x: 0, y: 0 };
          return;
        }

        // Tek parmak → döndür. Hassasiyet görünüm genişliğine bağlı: görünümü baştan sona
        // sürüklemek ≈ 180° döndürür (cihaz/boyuttan bağımsız aynı his).
        lastPinchDistance.current = null;
        const touch = touches[0];
        if (!touch) return;
        const now = Date.now();

        if (lastTouch.current) {
          const k = Math.PI / Math.max(viewSize.current, 200);
          const yaw = (touch.pageX - lastTouch.current.x) * k;
          const pitch = (touch.pageY - lastTouch.current.y) * k;
          rotateBy(yaw, pitch);

          const dt = Math.max(now - lastMoveTime.current, 1);
          // Hız: son hareketlerin yumuşatılmış ortalaması (rad/ms)
          velocity.current = {
            x: velocity.current.x * 0.5 + (yaw / dt) * 0.5,
            y: velocity.current.y * 0.5 + (pitch / dt) * 0.5,
          };
        }
        lastTouch.current = { x: touch.pageX, y: touch.pageY };
        lastMoveTime.current = now;
      },

      onPanResponderRelease: () => {
        lastPinchDistance.current = null;
        lastTouch.current = null;
        // Parmak durup bırakıldıysa fırlatma yok; hareket ederken bırakıldıysa eylemsizlik
        if (Date.now() - lastMoveTime.current < 80) startInertia();
        else velocity.current = { x: 0, y: 0 };
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  async function onContextCreate(gl: any) {
    glRef.current = gl;
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(0xf8fafc, 1);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
    cameraRef.current = camera;
    applyCamera();

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);
    // Arkadan yumuşak dolgu ışığı: model döndükçe karanlık kalan yüzler okunabilsin
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-3, -1, -2);
    scene.add(fillLight);

    // Zemin gridi — sahneye (group'a değil) ekleniyor, bu yüzden model
    // dönerken grid sabit kalıyor (gerçek bir zemin gibi).
    const grid = new THREE.GridHelper(4, 16, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = -0.85;
    scene.add(grid);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // 3MF, three.js'in tarayıcıya-özgü XML/DOM altyapısına dayanıyor ve
    // React Native'de güvenilir çalışmıyor (iki farklı düzeltme denendi,
    // ikisi de başarısız oldu). Bu format için mobile'da yükleme
    // denemiyoruz, açık bir mesaj gösteriyoruz — web'de sorunsuz çalışıyor.
    if (fileFormat.toLowerCase() === "3mf") {
      setStatus("unsupported");
      return;
    }

    try {
      const geometryOrObject = await loadModelFile(fileUrl, fileFormat);
      let mesh: THREE.Object3D;
      materialsRef.current = [];

      const makeMaterial = () => {
        const m = new THREE.MeshStandardMaterial({ color: colorRef.current, metalness: 0.1, roughness: 0.6 });
        materialsRef.current.push(m);
        return m;
      };

      if (geometryOrObject instanceof THREE.BufferGeometry) {
        mesh = new THREE.Mesh(geometryOrObject, makeMaterial());
      } else {
        mesh = geometryOrObject;
        // OBJ: her alt mesh'e, renk değişince güncellenebilen kendi malzememizi ver
        mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = makeMaterial();
        });
      }

      // Merkeze al ve kameraya sığacak şekilde ölçekle.
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      mesh.position.sub(center);

      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 1.5 / maxDim;
      mesh.scale.setScalar(scale);

      group.add(mesh);
      group.quaternion.copy(baseQuat.current);

      // Grid'i modelin (başlangıç yönelimindeki) tabanına oturt.
      group.updateMatrixWorld(true);
      const worldBox = new THREE.Box3().setFromObject(group);
      grid.position.y = worldBox.min.y - 0.02;

      setStatus("ready");
      render();
    } catch (e) {
      console.error("[ModelViewer3D]", e);
      setStatus("error");
    }
  }

  return (
    <View
      className="relative w-full aspect-square bg-brand-light rounded-2xl overflow-hidden"
      onLayout={(e) => { viewSize.current = e.nativeEvent.layout.width; }}
      onTouchStart={() => onInteractionChange?.(true)}
      onTouchEnd={() => onInteractionChange?.(false)}
      onTouchCancel={() => onInteractionChange?.(false)}
    >
      <GLView
        style={{ flex: 1 }}
        onContextCreate={onContextCreate}
        {...panResponder.panHandlers}
      />

      {status === "loading" && (
        <View className="absolute inset-0 items-center justify-center bg-brand-light">
          <ActivityIndicator color="#FF6B35" />
          <Text className="text-xs text-slate-400 mt-2">{t("modelDetail.loadingModel")}</Text>
        </View>
      )}

      {status === "error" && (
        <View className="absolute inset-0 items-center justify-center bg-brand-light px-6">
          <Text className="text-sm text-slate-500 text-center">{t("modelDetail.viewerError")}</Text>
        </View>
      )}

      {status === "unsupported" && (
        <View className="absolute inset-0 items-center justify-center bg-brand-light px-6">
          <Text className="text-sm text-slate-500 text-center">{t("modelDetail.viewerError3mf")}</Text>
        </View>
      )}

      {status === "ready" && (
        <View className="absolute bottom-3 right-3 flex-row gap-2">
          <Pressable onPress={resetCamera} className="w-9 h-9 rounded-full bg-white/90 items-center justify-center">
            <RotateCcw size={16} color="#1E293B" />
          </Pressable>
          <Pressable onPress={() => zoom(0.8)} className="w-9 h-9 rounded-full bg-white/90 items-center justify-center">
            <ZoomIn size={16} color="#1E293B" />
          </Pressable>
          <Pressable onPress={() => zoom(1.25)} className="w-9 h-9 rounded-full bg-white/90 items-center justify-center">
            <ZoomOut size={16} color="#1E293B" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * Dosyayı RN'in kendi fetch()'i ile indirip loader'ın .parse() metoduna
 * veriyoruz — .load() KULLANMIYORUZ (tarayıcıya özgü FileLoader/XHR/
 * ProgressEvent altyapısı RN'de çalışmıyor).
 */
async function loadModelFile(url: string, format: string): Promise<THREE.BufferGeometry | THREE.Object3D> {
  const fmt = format.toLowerCase();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Model dosyası indirilemedi: ${response.status}`);
  }

  if (fmt === "stl") {
    const buffer = await response.arrayBuffer();
    return new STLLoader().parse(buffer);
  }

  if (fmt === "obj") {
    const text = await response.text();
    return new OBJLoader().parse(text);
  }

  throw new Error(`Desteklenmeyen format: ${format}`);
}