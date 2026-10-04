import { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Box, Camera } from "lucide-react-native";
import { buildPrintPhotoUrl, defaultPrintPrice, type Model } from "@shapebazaar/shared";

interface Props {
  item: Model;
  locale: "tr" | "en";
  freeLabel: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const FLIP_MS = 440;
const MIN_SCALE = 0.02;
// Görseller yüzdeyle (w-full h-full) değil, mutlak doldurmayla boyutlanır: katman boyutu animasyondan
// ve NativeWind yüzde hesabından bağımsız, kare çerçevenin tamamı olur.
const FILL = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

/**
 * 2 sütunlu model gridinde kullanılan kart (Ana sayfa + Ara).
 *
 * Admin bu modele bir vitrin baskı fotoğrafı seçtiyse sol üstte mini fotoğraf butonu görünür.
 * Butona basınca görsel alanı yatayda daralıp diğer yüzle açılır; buton fotoğraf görünürken
 * "3D" butonuna dönüşür ve tekrar basınca 3D görsele geri çevirir. (Kartta interaktif viewer yok —
 * 3D tarafı modelin render görseli; interaktif viewer detay sayfasında.)
 *
 * ANİMASYON `Animated` KULLANMAZ. Cihazda dört farklı Animated yaklaşımında (native/JS sürücü,
 * rotateY/scaleX/opacity) aynı belirti görüldü: kartın görüntüsü, animasyon karelerini değil sadece
 * son React render anındaki değeri yansıtıyor ve butonun bir basış gerisinde kalıyordu. Burada
 * görüntü doğrudan React state'inden (`face`, `scaleX`) çizilir; çevirme, state'i ~60 fps
 * güncelleyen bir requestAnimationFrame döngüsüdür. Butonun etiketi de aynı mekanizmayla
 * çalıştığı için ekrandaki her şey birbirine bağlı kalır.
 */
export function ModelCard({ item, locale, freeLabel }: Props) {
  const { t } = useTranslation();
  const title = locale === "en" && item.title_en ? item.title_en : item.title;
  const designerName = item.designer?.username
    ? `@${item.designer.username}`
    : item.designer?.full_name ?? "";

  const showcaseUrl = item.showcase_thumb_path ? buildPrintPhotoUrl(SUPABASE_URL, item.showcase_thumb_path) : null;

  const [face, setFace] = useState<"model" | "photo">("model"); // görünen yüz
  const [scaleX, setScaleX] = useState(1);                         // çevirme sırasındaki yatay ölçek
  const [toPhoto, setToPhoto] = useState(false);                   // buton etiketi: basış anında hemen değişir
  const busy = useRef(false);
  const raf = useRef<number | null>(null);

  useEffect(() => () => { if (raf.current != null) cancelAnimationFrame(raf.current); }, []);

  // Varsayılan ayarlarla baskı ücreti (kargo hariç) — ağırlığı olmayan modelde 50 g varsayılanı
  const printPrice = defaultPrintPrice(item.weight_grams, item.is_free ? 0 : item.base_price).printWithFee;

  function toggleFlip() {
    if (busy.current) return; // çevirme sürerken art arda basışları yok say
    busy.current = true;
    const target = face === "model" ? "photo" : "model";
    setToPhoto(target === "photo");

    const start = Date.now();
    let swapped = false;
    const step = () => {
      const t = Math.min((Date.now() - start) / FLIP_MS, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
      if (!swapped && eased >= 0.5) { swapped = true; setFace(target); }   // kart en dar anındayken yüz değişir
      setScaleX(Math.max(MIN_SCALE, Math.abs(Math.cos(Math.PI * eased)))); // 1 → ~0 → 1
      if (t < 1) {
        raf.current = requestAnimationFrame(step);
      } else {
        raf.current = null;
        setFace(target);   // son durum kesin
        setScaleX(1);
        busy.current = false;
      }
    };
    raf.current = requestAnimationFrame(step);
  }

  // maxWidth: sütun sayısı tek kalan son kart tüm satırı kaplamasın
  return (
    <View style={{ flex: 1, maxWidth: "50%" }} className="p-1.5">
      <Pressable
        onPress={() => router.push(`/models/${item.id}`)}
        className="bg-white rounded-2xl overflow-hidden border border-slate-100"
      >
        {/* 4:3 çerçeve = iPhone fotoğraf oranı; hem 3D görsel hem baskı fotoğrafı kesilmeden sığar */}
        <View style={{ aspectRatio: 4 / 3 }} className="bg-slate-100 overflow-hidden">
          <View style={[FILL, { transform: [{ scaleX }] }]}>
            {face === "photo" && showcaseUrl ? (
              // Gerçek baskı fotoğrafı
              <>
                <Image source={{ uri: showcaseUrl }} style={FILL} resizeMode="contain" />
                <View className="absolute bottom-2 left-2 flex-row items-center bg-black/55 px-2 py-0.5 rounded-full">
                  <Camera size={9} color="#fff" />
                  <Text className="text-[10px] text-white ml-1">{t("printPhotos.realPrint")}</Text>
                </View>
              </>
            ) : item.thumbnail_url ? (
              // 3D model görseli
              <Image source={{ uri: item.thumbnail_url }} style={FILL} resizeMode="contain" />
            ) : null}
          </View>

          {/* Sol üst: önce mini baskı fotoğrafı, fotoğraf görünürken "3D" butonu */}
          {showcaseUrl && (
            <Pressable
              onPress={toggleFlip}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={toPhoto ? t("printPhotos.show3d") : t("printPhotos.showPhoto")}
              className="absolute top-2 left-2"
            >
              {toPhoto ? (
                <View className="h-9 px-2.5 flex-row items-center rounded-lg bg-white border border-slate-300">
                  <Box size={14} color="#FF6B35" />
                  <Text className="text-xs font-semibold text-brand-dark ml-1.5">{t("printPhotos.label3d")}</Text>
                </View>
              ) : (
                <Image source={{ uri: showcaseUrl }} className="w-9 h-9 rounded-lg border-2 border-white" resizeMode="cover" />
              )}
            </Pressable>
          )}
        </View>
        <View className="p-2.5">
          <Text numberOfLines={1} className="text-sm font-medium text-brand-dark">{title}</Text>
          {designerName ? (
            <Text numberOfLines={1} className="text-xs text-slate-400 mt-0.5">{designerName}</Text>
          ) : null}
          <View className="flex-row items-baseline flex-wrap mt-1.5">
            <Text className="text-sm font-semibold text-brand-orange">
              {item.is_free ? freeLabel : `₺${item.base_price}`}
            </Text>
            {printPrice !== null && (
              <Text className="text-[11px] text-slate-400 ml-1.5">
                + {t("home.printPrice", { price: Math.round(printPrice) })}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
