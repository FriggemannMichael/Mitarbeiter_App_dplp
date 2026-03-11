import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Download,
  Smartphone,
  Share,
  Copy,
  Mail,
  ExternalLink,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { storage } from "../utils/storage";
import type { AppConfiguration } from "../types/config.types";

interface PWAInstallGuideProps {
  onClose: () => void;
  config: AppConfiguration;
}

export const PWAInstallGuide: React.FC<PWAInstallGuideProps> = ({
  onClose,
  config,
}) => {
  const { t } = useTranslation();
  const [deviceType, setDeviceType] = useState<
    "ios" | "android" | "desktop" | "ios-not-safari"
  >("android");
  const [currentUrl, setCurrentUrl] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    setCurrentUrl(window.location.href);

    const userAgent = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(userAgent);
    const isSafari =
      /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(userAgent);

    // Check if app is already installed
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isInstalled) {
      // App is already installed, don't show modal
      onClose();
      return;
    }

    if (isIOS) {
      if (isSafari) {
        setDeviceType("ios");
      } else {
        setDeviceType("ios-not-safari");
      }
    } else if (isAndroid) {
      setDeviceType("android");
    } else {
      setDeviceType("desktop");
    }
  }, [onClose]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(t("pwa.email.subject"));
    const body = encodeURIComponent(`${t("pwa.email.body")}\n\n${currentUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleNeverShow = () => {
    storage.setPWAModalNever(true);
    onClose();
  };

  const handleRemindLater = () => {
    storage.setPWAModalDismissed();
    onClose();
  };

  if (deviceType === "desktop") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {t("pwa.desktop.title")}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center">
            <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">{t("pwa.desktop.description")}</p>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <div className="flex justify-center mb-4">
                <QRCodeSVG
                  value={config.technical.pwa_qr_code_url}
                  size={200}
                  level="M"
                  includeMargin={true}
                  className="border-2 border-white shadow-sm"
                />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {t("pwa.desktop.qrHint")}
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleCopyUrl}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>
                    {copyFeedback
                      ? t("pwa.desktop.copied")
                      : t("pwa.desktop.copyLink")}
                  </span>
                </button>

                <button
                  onClick={handleEmailShare}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>{t("pwa.desktop.sendEmail")}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t("pwa.desktop.continueDesktop")}</span>
              </button>

              <button
                onClick={handleNeverShow}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t("pwa.desktop.neverShow")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {t("pwa.install.title")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">{t("pwa.install.description")}</p>

        {deviceType === "ios" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-blue-50 p-4 rounded-full">
                <Share className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <p className="text-gray-700">{t("pwa.ios.step1")}</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <p className="text-gray-700">{t("pwa.ios.step2")}</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <p className="text-gray-700">{t("pwa.ios.step3")}</p>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg mt-6">
              <h4 className="font-medium text-green-800 mb-2">
                {t("pwa.benefits.title")}
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li> {t("pwa.benefits.homescreen")}</li>
                <li> {t("pwa.benefits.offline")}</li>
                <li> {t("pwa.benefits.noAppStore")}</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-50 p-4 rounded-full">
                <Download className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <p className="text-gray-700">{t("pwa.android.step1")}</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <p className="text-gray-700">{t("pwa.android.step2")}</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <p className="text-gray-700">{t("pwa.android.step3")}</p>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg mt-6">
              <h4 className="font-medium text-green-800 mb-2">
                {t("pwa.benefits.title")}
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li> {t("pwa.benefits.homescreen")}</li>
                <li> {t("pwa.benefits.fast")}</li>
                <li> {t("pwa.benefits.offline")}</li>
                <li> {t("pwa.benefits.noStorage")}</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex space-x-3 mt-8">
          <button
            onClick={handleRemindLater}
            className="flex-1 py-3 px-4 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t("pwa.buttons.later")}
          </button>
          <button
            onClick={handleNeverShow}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t("pwa.buttons.understood")}
          </button>
        </div>
      </div>
    </div>
  );
};
