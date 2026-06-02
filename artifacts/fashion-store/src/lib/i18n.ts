import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import arTranslation from "../locales/ar/translation.json";
import enTranslation from "../locales/en/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        translation: arTranslation,
      },
      en: {
        translation: enTranslation,
      },
    },
    fallbackLng: "ar",
    lng: "ar",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
