import React, { useEffect, useState } from "react";
import { APP_VERSION } from "../version";
import { useTranslation } from "react-i18next";
import { Shield, Globe, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { storage } from "../utils/storage";
import { PWAInstallGuide } from "../components/PWAInstallGuide";
import { useCompanyConfig, usePdfConfig } from "../contexts/ConfigContext";
import { useConfig } from "../contexts/ConfigContext";
import {
  apiService,
  type EmployeeSessionDto,
} from "../services/apiService";

interface WelcomeProps {
  onAuthenticated: (session: EmployeeSessionDto) => void;
}

type WelcomeMode = "register" | "login" | "resetPin";
type ConflictActionState = {
  suggestedMode?: WelcomeMode;
  canResetPin?: boolean;
} | null;

const languages = [
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "fa", name: "فارسی", flag: "🇮🇷" },
];

export const Welcome: React.FC<WelcomeProps> = ({ onAuthenticated }) => {
  const { t, i18n } = useTranslation();
  const companyConfig = useCompanyConfig();
  const pdfConfig = usePdfConfig();
  const { config } = useConfig();
  const defaultLogoSrc = `${import.meta.env.BASE_URL}customers/DPL%20Logo.svg`;
  const privacyPolicyUrl = "https://www.dplp.de/datenschutz/";
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [mode, setMode] = useState<WelcomeMode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [pinRepeat, setPinRepeat] = useState("");
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [showPWAGuide, setShowPWAGuide] = useState(false);
  const [pendingSession, setPendingSession] = useState<EmployeeSessionDto | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginNeedsPhoneNumber, setLoginNeedsPhoneNumber] = useState(false);
  const [conflictAction, setConflictAction] = useState<ConflictActionState>(null);

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    i18n.changeLanguage(languageCode);
    storage.setLanguage(languageCode);
  };

  const validateForm = () => {
    const nextErrors: Record<string, string | undefined> = {};
    const requiredMessage = t("validation.required") || "Pflichtfeld";

    if (!firstName.trim()) nextErrors.firstName = requiredMessage;
    if (!lastName.trim()) nextErrors.lastName = requiredMessage;

    if ((mode !== "login" || loginNeedsPhoneNumber) && !phoneNumber.trim()) {
      nextErrors.phoneNumber = requiredMessage;
    }

    if (!/^\d{4}$/.test(pin.trim())) {
      nextErrors.pin = t("welcome.pin.invalid") || "PIN muss genau 4 Ziffern haben";
    }

    if (mode !== "login" && pin.trim() !== pinRepeat.trim()) {
      nextErrors.pinRepeat = t("welcome.pin.mismatch") || "PIN-Wiederholung stimmt nicht überein";
    }

    if (mode === "register" && !consent) {
      nextErrors.consent = requiredMessage;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetSubmitState = () => {
    setSubmitError("");
    setConflictAction(null);
  };

  const completeAuthentication = (session: EmployeeSessionDto) => {
    storage.setEmployeeName(session.display_name);
    if (mode === "register") {
      storage.setConsent(true);
    }

    const isTestMode =
      typeof process !== "undefined" &&
      (process.env.NODE_ENV === "test" ||
        (import.meta &&
          (import.meta as any).env &&
          (import.meta as any).env.MODE === "test"));

    if (isTestMode) {
      storage.setPWAGuideShown(true);
      onAuthenticated(session);
      return;
    }

    if (!storage.getPWAGuideShown()) {
      setPendingSession(session);
      setShowPWAGuide(true);
      return;
    }

    onAuthenticated(session);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetSubmitState();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "register") {
        const response = await apiService.registerEmployee({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          pin: pin.trim(),
        });
        const employee = response.data?.employee;
        if (!response.success || !employee) {
          throw new Error(response.error || t("welcome.error.register") || "Registrierung fehlgeschlagen");
        }
        completeAuthentication(employee);
      } else if (mode === "login") {
        const response = await apiService.loginEmployee({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          pin: pin.trim(),
          phoneNumber: loginNeedsPhoneNumber ? phoneNumber.trim() : undefined,
        });
        const employee = response.data?.employee;
        if (!response.success || !employee) {
          throw new Error(response.error || t("welcome.error.login") || "Anmeldung fehlgeschlagen");
        }
        setLoginNeedsPhoneNumber(false);
        completeAuthentication(employee);
      } else {
        const response = await apiService.resetEmployeePin({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          pin: pin.trim(),
        });
        const employee = response.data?.employee;
        if (!response.success || !employee) {
          throw new Error(response.error || t("welcome.error.resetPin") || "PIN konnte nicht zurückgesetzt werden");
        }
        completeAuthentication(employee);
      }
    } catch (submitErrorValue) {
      const errorCode =
        submitErrorValue instanceof Error && "code" in submitErrorValue
          ? (submitErrorValue as Error & { code?: string }).code
          : undefined;
      const errorData =
        submitErrorValue instanceof Error && "data" in submitErrorValue
          ? (submitErrorValue as Error & { data?: unknown }).data
          : undefined;

      if (errorCode === "DUPLICATE_NAME" && mode === "login") {
        setLoginNeedsPhoneNumber(true);
      }

      if (errorCode === "ACCOUNT_ALREADY_EXISTS") {
        const details =
          errorData && typeof errorData === "object"
            ? (errorData as {
                suggestedMode?: WelcomeMode;
                canResetPin?: boolean;
              })
            : undefined;
        setConflictAction({
          suggestedMode: details?.suggestedMode || "login",
          canResetPin: details?.canResetPin ?? true,
        });
      } else {
        setConflictAction(null);
      }

      setSubmitError(
        submitErrorValue instanceof Error
          ? submitErrorValue.message
          : t("welcome.error.generic") || "Aktion konnte nicht abgeschlossen werden",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePWAGuideComplete = () => {
    setShowPWAGuide(false);
    if (pendingSession) {
      onAuthenticated(pendingSession);
      setPendingSession(null);
    }
  };

  useEffect(() => {
    const savedName = storage.getEmployeeName();
    if (savedName) {
      const parts = savedName.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setMode("login");
    }
    setConsent(storage.getConsent());
  }, []);

  const modeDescription =
    mode === "register"
      ? t("welcome.mode.desc.register") || "Beim ersten Mal bitte Name, Handynummer und PIN festlegen."
      : mode === "login"
        ? loginNeedsPhoneNumber
          ? t("welcome.mode.desc.loginDuplicate") || "Für diesen Namen gibt es mehrere Mitarbeiter. Bitte zusätzlich die Handynummer eingeben."
          : t("welcome.mode.desc.login") || "Bitte mit Vorname, Nachname und PIN anmelden."
        : t("welcome.mode.desc.resetPin") || "Handynummer eingeben und eine neue PIN festlegen.";

  const submitLabel =
    mode === "register"
      ? t("welcome.submit.register") || "Jetzt registrieren"
      : mode === "login"
        ? t("welcome.submit.login") || "Anmelden"
        : t("welcome.submit.resetPin") || "PIN zurücksetzen";

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="app-surface-card rounded-2xl overflow-hidden">
            <div className="text-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-4 flex justify-center"
              >
                <img
                  src={companyConfig.company_logo || defaultLogoSrc}
                  alt={companyConfig.company_name || "Firma"}
                  className="h-28 w-auto shadow-sm"
                />
              </motion.div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                {pdfConfig.app_name}
              </h1>
              <h2 className="text-lg sm:text-xl text-slate-600 mb-1 font-medium">
                {t("welcome.subtitle")}
              </h2>
              <p className="text-sm text-slate-500">{modeDescription}</p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
                {[
                  { id: "register", label: t("welcome.mode.register") || "Registrieren" },
                  { id: "login", label: t("welcome.mode.login") || "Anmelden" },
                  { id: "resetPin", label: t("welcome.mode.resetPin") || "PIN vergessen" },
                ].map((item) => (
                  <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMode(item.id as WelcomeMode);
                        resetSubmitState();
                        setErrors({});
                        setLoginNeedsPhoneNumber(false);
                      }}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      mode === item.id
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="block mb-2">
                    <div className="flex items-center space-x-2 text-slate-700 font-medium mb-2">
                      <Globe className="w-4 h-4" />
                      <span>{t("welcome.language")}</span>
                    </div>
                    <div className="relative">
                      <select
                        value={selectedLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="input-field appearance-none pr-10 cursor-pointer"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </label>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block mb-2">
                      <span className="text-slate-700 font-medium">
                        {t("welcome.firstName")} <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (mode === "login" && loginNeedsPhoneNumber) {
                            setLoginNeedsPhoneNumber(false);
                          }
                          if (errors.firstName) {
                            setErrors({ ...errors, firstName: undefined });
                          }
                        }}
                        placeholder={t("welcome.placeholders.firstName")}
                        className={`input-field mt-2 ${
                          errors.firstName ? "border-red-300 focus:ring-red-500 focus:border-red-500" : ""
                        }`}
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block mb-2">
                      <span className="text-slate-700 font-medium">
                        {t("welcome.lastName")} <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          if (mode === "login" && loginNeedsPhoneNumber) {
                            setLoginNeedsPhoneNumber(false);
                          }
                          if (errors.lastName) {
                            setErrors({ ...errors, lastName: undefined });
                          }
                        }}
                        placeholder={t("welcome.placeholders.lastName")}
                        className={`input-field mt-2 ${
                          errors.lastName ? "border-red-300 focus:ring-red-500 focus:border-red-500" : ""
                        }`}
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                      )}
                    </label>
                  </div>
                </motion.div>

                {(mode !== "login" || loginNeedsPhoneNumber) && (
                  <div>
                    <label className="block mb-2">
                      <span className="text-slate-700 font-medium">
                        {t("welcome.phoneNumber") || "Handynummer"} <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (errors.phoneNumber) {
                            setErrors({ ...errors, phoneNumber: undefined });
                          }
                        }}
                        placeholder={t("welcome.placeholders.phoneNumber") || "z. B. 0176 12345678"}
                        className={`input-field mt-2 ${
                          errors.phoneNumber ? "border-red-300 focus:ring-red-500 focus:border-red-500" : ""
                        }`}
                      />
                      {errors.phoneNumber && (
                        <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
                      )}
                    </label>
                  </div>
                )}

                <div className={mode === "login" && !loginNeedsPhoneNumber ? "grid grid-cols-1" : "grid grid-cols-2 gap-4"}>
                  <div>
                    <label className="block mb-2">
                      <span className="text-slate-700 font-medium">
                        {t("welcome.pin") || "4-stellige PIN"} <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => {
                          setPin(e.target.value.replace(/\D+/g, "").slice(0, 4));
                          if (errors.pin) {
                            setErrors({ ...errors, pin: undefined });
                          }
                        }}
                        placeholder="••••"
                        className={`input-field mt-2 ${
                          errors.pin ? "border-red-300 focus:ring-red-500 focus:border-red-500" : ""
                        }`}
                      />
                      {errors.pin && (
                        <p className="text-red-500 text-sm mt-1">{errors.pin}</p>
                      )}
                    </label>
                  </div>

                  {mode !== "login" && (
                    <div>
                      <label className="block mb-2">
                        <span className="text-slate-700 font-medium">
                          {t("welcome.pinRepeat") || "PIN wiederholen"} <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={pinRepeat}
                          onChange={(e) => {
                            setPinRepeat(e.target.value.replace(/\D+/g, "").slice(0, 4));
                            if (errors.pinRepeat) {
                              setErrors({ ...errors, pinRepeat: undefined });
                            }
                          }}
                          placeholder="••••"
                          className={`input-field mt-2 ${
                            errors.pinRepeat ? "border-red-300 focus:ring-red-500 focus:border-red-500" : ""
                          }`}
                        />
                        {errors.pinRepeat && (
                          <p className="text-red-500 text-sm mt-1">{errors.pinRepeat}</p>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {mode === "register" && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="app-surface-card rounded-xl p-4">
                        <button
                          type="button"
                          onClick={() => setShowPrivacy(!showPrivacy)}
                          className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center flex-shrink-0">
                              <Shield className="w-5 h-5 text-primary-600" />
                            </div>
                            <span className="font-semibold text-slate-900">
                              {t("welcome.privacy.title")}
                            </span>
                          </div>
                          <motion.div
                            animate={{ rotate: showPrivacy ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ChevronDown className="w-5 h-5 text-primary-600" />
                          </motion.div>
                        </button>

                        {showPrivacy && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 pt-4 border-t border-slate-200"
                          >
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {t("welcome.privacy.text")}
                            </p>
                            <a
                              href={privacyPolicyUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-sm font-medium text-primary-700 hover:text-primary-800 underline underline-offset-2"
                            >
                              {t("welcome.privacy.link") || "Datenschutzhinweise öffnen"}
                            </a>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <label className="flex items-start space-x-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => {
                              setConsent(e.target.checked);
                              if (errors.consent) {
                                setErrors({ ...errors, consent: undefined });
                              }
                            }}
                            className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                          />
                        </div>
                        <span className="text-sm text-slate-600 flex-1 pt-0.5">
                          {t("welcome.consent")}
                        </span>
                      </label>
                      {errors.consent && (
                        <p className="text-red-500 text-sm mt-2 ml-8">{errors.consent}</p>
                      )}
                    </motion.div>
                  </>
                )}

                {submitError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                )}

                {conflictAction && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 space-y-3">
                    <p className="font-medium">
                      Dieses Konto ist bereits vorhanden. Bitte melden Sie sich
                      an oder setzen Sie Ihre PIN zurück.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode(conflictAction.suggestedMode || "login");
                          setLoginNeedsPhoneNumber(false);
                          resetSubmitState();
                          setPin("");
                          setPinRepeat("");
                        }}
                        className="rounded-xl border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                      >
                        {t("welcome.submit.login") || "Anmelden"}
                      </button>
                      {conflictAction.canResetPin && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode("resetPin");
                            setLoginNeedsPhoneNumber(false);
                            resetSubmitState();
                            setPin("");
                            setPinRepeat("");
                          }}
                          className="rounded-xl border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                        >
                          {t("welcome.submit.resetPin") || "PIN zurücksetzen"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 text-base font-semibold rounded-xl border border-primary-200 bg-primary-50 text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? t("welcome.submitting") || "Bitte warten..." : submitLabel}
                  </button>
                </motion.div>
              </form>
            </div>

            <div className="text-center p-6 bg-slate-50/70 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                {t("footer.version", { version: APP_VERSION })}
              </p>
              <p className="text-xs text-slate-400 mt-1">{t("footer.features")}</p>
            </div>
          </div>
        </motion.div>

        {showPWAGuide && (
          <PWAInstallGuide
            onClose={handlePWAGuideComplete}
            config={config}
            key={i18n.language}
          />
        )}
      </div>
    </div>
  );
};
