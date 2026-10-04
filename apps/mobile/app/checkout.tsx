import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, BackHandler } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, AlertCircle } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useCartStore } from "../lib/cart";

const WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://www.shapebazaar.com").replace(/\/+$/, "");
const INIT_TIMEOUT_MS = 20000;

// /api/payment/callback, ödeme sonrası `${SITE_URL}/tr/payment/success|failed`'e
// redirect eder. Sadece kendi sitemizin host'unda eşleşen URL'leri sonuç sayıyoruz
// (banka 3D Secure sayfalarındaki benzer path'lerle karışmasın diye).
const RESULT_PATH_RE = /\/payment\/(success|failed)\/?$/;

function webHost(): string {
  try { return new URL(WEB_BASE_URL).hostname; } catch { return "www.shapebazaar.com"; }
}

function parsePaymentResult(rawUrl: string): { status: "success" | "failed"; orderId?: string } | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname;
    const isOurs = host === webHost() || host === "shapebazaar.com" || host.endsWith(".shapebazaar.com");
    if (!isOurs) return null;
    const m = url.pathname.match(RESULT_PATH_RE);
    if (!m) return null;
    return {
      status: m[1] as "success" | "failed",
      orderId: url.searchParams.get("orderId") ?? undefined,
    };
  } catch {
    return null;
  }
}

// checkoutFormContent = <script>...</script><div id="iyzipay-checkout-form"></div>
// Statik HTML olarak gömüyoruz: WebView'in parser'ı script'leri kendisi çalıştırır
// (web'deki gibi innerHTML + script yeniden oluşturma gerekmez).
function buildHtml(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:12px;background:#F8FAFC;font-family:-apple-system,Roboto,sans-serif}</style>
</head><body>${content}</body></html>`;
}

type Phase = "loading" | "ready" | "error";

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [webLoaded, setWebLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const startedAttempt = useRef(-1); // React strict mode'da çift init (= çift sipariş) olmasın
  const finished = useRef(false);

  const fail = useCallback((msg: string, code = "", loginNeeded = false) => {
    setErrorMsg(msg);
    setErrorCode(code);
    setNeedsLogin(loginNeeded);
    setPhase("error");
  }, []);

  // 1) /api/payment/init
  useEffect(() => {
    if (startedAttempt.current === attempt) return;
    startedAttempt.current = attempt;

    const { items, address, subtotal, shipping, grandTotal } = useCartStore.getState();
    if (items.length === 0) {
      router.replace("/(tabs)/cart");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INIT_TIMEOUT_MS);

    (async () => {
      setPhase("loading");
      setWebLoaded(false);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return fail(t("payment.sessionExpired"), "NO_SESSION", true);

        // Gövde, web'deki CartDrawer.handlePayment ile birebir aynı şekilde.
        const payload = JSON.stringify({
          items: items.map((i) => ({
            modelId: i.modelId,
            modelTitle: i.modelTitle,
            material: i.material,
            colorName: i.colorName,
            colorHex: i.colorHex,
            scale: i.scale,
            infill: i.infill,
            designPrice: i.designPrice,
            printCost: i.printCost,
            itemTotal: i.itemTotal,
          })),
          subtotal: subtotal(),
          shipping: shipping(),
          grandTotal: grandTotal(),
          platformFee: grandTotal() * 0.1,
          address,
        });

        const send = (accessToken: string) =>
          fetch(`${WEB_BASE_URL}/api/payment/init`, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: payload,
          });

        let res = await send(session.access_token);

        // 401: token süresi dolmuş olabilir → oturumu yenileyip bir kez daha dene
        if (res.status === 401) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed.session) res = await send(refreshed.session.access_token);
        }

        // Hâlâ 401: sorun token'da mı, sunucuda mı? Token'ı doğrudan Supabase'e doğrulatarak ayırıyoruz.
        if (res.status === 401) {
          const { data: check } = await supabase.auth.getUser();
          return check.user
            ? fail(t("payment.serverAuthError"), "HTTP_401_SERVER")  // token geçerli, sunucu kabul etmiyor
            : fail(t("payment.sessionExpired"), "HTTP_401_TOKEN", true); // oturum gerçekten geçersiz
        }

        const data = await res.json().catch(() => ({}));
        // Sunucu fiyatları yeniden hesaplar; sepetteki tutar güncelse (tasarımcı fiyatı değişti vb.) durdurur
        if (res.status === 409 && data.code === "PRICE_CHANGED") return fail(t("payment.priceChanged"), "PRICE_CHANGED");
        if (!res.ok || data.error || !data.checkoutFormContent) {
          console.warn("[checkout] init failed:", res.status, data?.error);
          return fail(t("payment.initError"), `HTTP_${res.status}`);
        }

        setHtml(buildHtml(data.checkoutFormContent));
        setPhase("ready");
      } catch (e) {
        console.warn("[checkout] init error:", e);
        fail(t("payment.connectionError"), "NETWORK");
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => { clearTimeout(timer); controller.abort(); };
  }, [attempt, fail, t]);

  // 2) Sonuç yakalama (success / failed)
  const handleNavigation = useCallback((url: string): boolean => {
    const result = parsePaymentResult(url);
    if (!result) return false;
    if (finished.current) return true;
    finished.current = true;

    if (result.status === "success") {
      useCartStore.getState().clearCart();
      router.replace({ pathname: "/payment/success", params: { orderId: result.orderId ?? "" } });
    } else {
      router.replace("/payment/failed");
    }
    return true;
  }, []);

  // 3) Kullanıcı ödemeyi yarıda bırakmak isterse
  const confirmExit = useCallback(() => {
    Alert.alert(t("payment.cancelTitle"), t("payment.cancelDesc"), [
      { text: t("payment.keepPaying"), style: "cancel" },
      { text: t("payment.cancelConfirm"), style: "destructive", onPress: () => router.back() },
    ]);
    return true;
  }, [t]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", confirmExit);
    return () => sub.remove();
  }, [confirmExit]);

  return (
    <View className="flex-1 bg-brand-light" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 h-12 border-b border-slate-200 bg-white">
        <Text className="text-base font-semibold text-brand-dark">{t("payment.title")}</Text>
        <Pressable onPress={confirmExit} hitSlop={12}>
          <X size={22} color="#64748B" />
        </Pressable>
      </View>

      {phase === "error" && (
        <View className="flex-1 items-center justify-center px-8">
          <AlertCircle size={36} color="#EF4444" />
          <Text className="text-sm text-slate-600 text-center mt-3 mb-1">{errorMsg}</Text>
          {errorCode ? (
            <Text className="text-xs text-slate-400 mb-5">{t("payment.errorCode", { code: errorCode })}</Text>
          ) : <View className="mb-4" />}
          {needsLogin ? (
            <Pressable
              onPress={() => router.replace("/auth/login")}
              className="h-11 px-6 rounded-xl bg-brand-orange items-center justify-center mb-2"
            >
              <Text className="text-sm font-medium text-white">{t("auth.loginBtn")}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setAttempt((a) => a + 1)}
              className="h-11 px-6 rounded-xl bg-brand-orange items-center justify-center mb-2"
            >
              <Text className="text-sm font-medium text-white">{t("payment.retry")}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.back()} className="h-11 px-6 items-center justify-center">
            <Text className="text-sm text-slate-500">{t("payment.backToCart")}</Text>
          </Pressable>
        </View>
      )}

      {phase === "ready" && html && (
        <WebView
          originWhitelist={["https://*", "http://*", "about:*"]}
          source={{ html, baseUrl: WEB_BASE_URL }}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          onLoadEnd={() => setWebLoaded(true)}
          onError={() => fail(t("payment.connectionError"), "WEBVIEW")}
          // iOS + Android: redirect dahil ana frame navigasyonlarını burada yakalıyoruz;
          // sonuç sayfasını WebView'de hiç yüklemeden native ekrana geçiyoruz.
          onShouldStartLoadWithRequest={(req) => !handleNavigation(req.url)}
          // Yedek: bazı sürümlerde redirect sonrası sadece bu event gelebilir.
          onNavigationStateChange={(nav: WebViewNavigation) => { handleNavigation(nav.url); }}
        />
      )}

      {(phase === "loading" || (phase === "ready" && !webLoaded)) && (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
          style={{ top: insets.top + 48 }}
        >
          <ActivityIndicator color="#FF6B35" />
          <Text className="text-xs text-slate-400 mt-3">{t("payment.preparing")}</Text>
        </View>
      )}
    </View>
  );
}
