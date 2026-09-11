import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

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

export default i18n;
