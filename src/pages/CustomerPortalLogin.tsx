import React, { useEffect, useState } from "react";
import { AlertCircle, Building2, Lock, User } from "lucide-react";

import { useCompanyConfig } from "../contexts/ConfigContext";
import { portalAuthService } from "../services/portalAuthService";

interface CustomerPortalLoginProps {
  onLoginSuccess: () => void;
  initialError?: string;
}

export const CustomerPortalLogin: React.FC<CustomerPortalLoginProps> = ({
  onLoginSuccess,
  initialError = "",
}) => {
  const companyConfig = useCompanyConfig();
  const defaultLogoSrc = `${import.meta.env.BASE_URL}customers/DPL%20Logo.svg`;
  const logoSrc = companyConfig.company_logo || defaultLogoSrc;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (portalAuthService.isAuthenticated()) {
      onLoginSuccess();
    }
  }, [onLoginSuccess]);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await portalAuthService.login(username, password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || "Login fehlgeschlagen");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_55%,_#e2e8f0)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <img src={logoSrc} alt="Logo" className="h-24 w-auto mx-auto mb-4" />
          <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Kundenportal</h1>
          <p className="text-sm text-slate-600 mt-2">
            Zugriff auf Mitarbeiterdaten, Zeiten und Abwesenheiten
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-2">
              Benutzername
            </span>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-11 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                autoComplete="username"
                required
                autoFocus
              />
            </div>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-2">
              Passwort
            </span>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-11 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3"
          >
            {isLoading ? "Anmeldung laeuft..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
};
