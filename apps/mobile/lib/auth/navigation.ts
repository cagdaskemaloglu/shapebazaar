import { router } from "expo-router";

/** Giriş/kayıt modal'ını kapatıp kullanıcıyı geldiği yere (sepet, profil…) döndürür. */
export function leaveAuthScreen() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}
