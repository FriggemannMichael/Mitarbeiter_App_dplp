import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import all translation files
import de from "./locales/de.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ro from "./locales/ro.json";
import pl from "./locales/pl.json";
import ru from "./locales/ru.json";
import ar from "./locales/ar.json";
import bg from "./locales/bg.json";
import uk from "./locales/uk.json";
import fa from "./locales/fa.json";

/**
 * i18n Configuration
 *
 * Translations are now split into separate JSON files in src/locales/
 * This improves:
 * - Maintainability (each language in its own file)
 * - Collaboration (translators can work on individual files)
 * - Bundle size (potential for lazy loading in the future)
 * - Version control (clearer diffs per language)
 *
 * Supported languages:
 * - de: German (Deutsch)
 * - en: English
 * - fr: French (Français)
 * - ro: Romanian (Română)
 * - pl: Polish (Polski)
 * - ru: Russian (Русский)
 * - ar: Arabic (العربية)
 * - bg: Bulgarian (Български)
 * - uk: Ukrainian (Українська)
 * - fa: Persian/Farsi (فارسی)
 */
const resources = {
  de: { translation: de },
  en: { translation: en },
  fr: { translation: fr },
  ro: { translation: ro },
  pl: { translation: pl },
  ru: { translation: ru },
  ar: { translation: ar },
  bg: { translation: bg },
  uk: { translation: uk },
  fa: { translation: fa },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("wpdl_language") || "de",
  fallbackLng: "de",

  // IMPORTANT: This project uses flat keys with dots (e.g., 'day.shiftConfig.workTimes').
  // By default, i18next interprets dots as key separators for nested objects.
  // Since our translations use flat keys with dots, we disable the key separator
  // to match keys literally (including the dot).
  keySeparator: false,

  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;
