import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import tr from "./locales/tr.json";

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "tr";
const supportedLocale = deviceLocale === "en" ? "en" : "tr"; // sadece tr/en destekliyoruz, başka her şey tr'ye düşer

i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: supportedLocale,
  fallbackLng: "tr",
  interpolation: {
    escapeValue: false, // React zaten XSS'e karşı escape ediyor
  },
});

const LANG_KEY = "app_language";

// Kullanıcı Profil'den dil seçtiyse onu uygula (yoksa cihaz dili). AsyncStorage asenkron olduğu için
// açılışta kısa süre cihaz dili görünebilir; sadece tr/en kabul edilir.
AsyncStorage.getItem(LANG_KEY)
  .then((stored) => {
    if ((stored === "tr" || stored === "en") && stored !== i18n.language) i18n.changeLanguage(stored);
  })
  .catch(() => {});

/** Uygulama dilini değiştirir ve kalıcı kaydeder. */
export async function setAppLanguage(lang: "tr" | "en") {
  await i18n.changeLanguage(lang);
  try { await AsyncStorage.setItem(LANG_KEY, lang); } catch { /* kalıcı kayıt başarısızsa bu oturumda yine de geçerli */ }
}

export default i18n;
