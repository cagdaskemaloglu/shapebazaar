import { useRef, useState, useCallback } from "react";
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
  rotation?: { x: number; y: number; z: number };
  /** Viewer'a dokunulduğunda true, bırakıldığında false döner. Üst ekran
   *  bunu kullanarak kendi ScrollView'ını geçici olarak kapatmalı — aksi
   *  halde iOS'un native UIScrollView'ı dikey sürüklemeyi JS'teki
   *  PanResponder'dan ÖNCE yakalayıp sayfayı kaydırıyor. */
  onInteractionChange?: (active: boolean) => void;
}

const DEFAULT_DISTANCE = 3;

export function ModelViewer3D({ fileUrl, fileFormat, rotation, onInteractionChange }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unsupported">("loading");

  const sceneRef  = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef  = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<InstanceType<typeof Renderer> | null>(null);
  const glRef = useRef<any>(null);
  const cameraDistance = useRef(DEFAULT_DISTANCE);
  const lastPinchDistance = useRef<number | null>(null);
  // Bir önceki onPanResponderMove'daki KÜMÜLATİF gesture.dx/dy — aradaki
  // farkı (delta) hesaplamak için.
  const lastGesture = useRef({ dx: 0, dy: 0 });

  const rotationState = useRef({ x: rotation?.x ?? 0, y: rotation?.y ?? 0 });

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

  function resetCamera() {
    rotationState.current = { x: rotation?.x ?? 0, y: rotation?.y ?? 0 };
    if (groupRef.current) {
      groupRef.current.rotation.x = rotationState.current.x;
      groupRef.current.rotation.y = rotationState.current.y;
    }
    cameraDistance.current = DEFAULT_DISTANCE;
    applyCamera();
    render();
  }

  function zoom(delta: number) {
    const next = cameraDistance.current - delta;
    cameraDistance.current = Math.min(Math.max(next, DEFAULT_DISTANCE * 0.3), DEFAULT_DISTANCE * 3);
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
        lastGesture.current = { dx: 0, dy: 0 };
      },

      onPanResponderMove: (evt, gesture) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          // İki parmak → pinch zoom
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (lastPinchDistance.current != null) {
            const delta = (distance - lastPinchDistance.current) * 0.01;
            zoom(delta);
          }
          lastPinchDistance.current = distance;
        } else {
          // Tek parmak → döndür (gesture.dx/dy kümülatiftir; farkını alıyoruz)
          lastPinchDistance.current = null;
          if (!groupRef.current) return;

          const deltaX = gesture.dx - lastGesture.current.dx;
          const deltaY = gesture.dy - lastGesture.current.dy;
          lastGesture.current = { dx: gesture.dx, dy: gesture.dy };

          rotationState.current.y += deltaX * 0.008;
          rotationState.current.x += deltaY * 0.008;
          groupRef.current.rotation.y = rotationState.current.y;
          groupRef.current.rotation.x = rotationState.current.x;
          render();
        }
      },
      onPanResponderRelease: () => {
        lastPinchDistance.current = null;
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

      if (geometryOrObject instanceof THREE.BufferGeometry) {
        const material = new THREE.MeshStandardMaterial({ color: 0xff6b35, metalness: 0.1, roughness: 0.6 });
        mesh = new THREE.Mesh(geometryOrObject, material);
      } else {
        mesh = geometryOrObject;
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
      group.rotation.x = rotationState.current.x;
      group.rotation.y = rotationState.current.y;

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
          <Pressable onPress={() => zoom(0.4)} className="w-9 h-9 rounded-full bg-white/90 items-center justify-center">
            <ZoomIn size={16} color="#1E293B" />
          </Pressable>
          <Pressable onPress={() => zoom(-0.4)} className="w-9 h-9 rounded-full bg-white/90 items-center justify-center">
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