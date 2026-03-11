/**
 * Admin-Login-Seite
 * Nur auf Desktop-Geräten zugänglich
 * Verwendet REST API für Session-basierte Authentifizierung
 */

import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Lock, AlertCircle, Monitor, User } from 'lucide-react';
import { useCompanyConfig } from "../contexts/ConfigContext";

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const companyConfig = useCompanyConfig();
  const defaultLogoSrc = `${import.meta.env.BASE_URL}logo.svg`;
  const logoSrc = companyConfig.company_logo || defaultLogoSrc;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  // Prüfe ob Desktop-Gerät
  useEffect(() => {
    setIsDesktop(authService.isDesktopDevice());

    const handleResize = () => {
      setIsDesktop(authService.isDesktopDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prüfe ob bereits eingeloggt
  useEffect(() => {
    if (authService.isAuthenticated()) {
      onLoginSuccess();
    }
  }, [onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await authService.login(username, password);

      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Login fehlgeschlagen');
      }
    } catch (err: any) {
      setError('Ein unerwarteter Fehler ist aufgetreten');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile Warnung
  if (!isDesktop) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Desktop erforderlich</h2>
          <p className="text-gray-600 mb-4">
            Der Admin-Bereich ist nur auf Desktop-Geräten verfügbar.
          </p>
          <p className="text-sm text-gray-500">
            Bitte öffnen Sie diese Seite auf einem Computer mit einer Bildschirmbreite von mindestens 768px.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src={logoSrc}
            alt="Logo"
            className="h-16 w-auto mx-auto mb-4"
          />
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin-Login</h1>
          <p className="text-gray-600">Konfigurationsbereich</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-danger">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Benutzername
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                className="input-field pl-10"
                placeholder="admin"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-field pl-10"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Anmeldung läuft...</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Anmelden</span>
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Dieser Bereich ist nur für autorisierte Administratoren zugänglich.
          </p>
          <p className="text-xs text-gray-400 text-center mt-2">
            Login erfolgt mit Ihrem zugewiesenen Account pro Mandant.
          </p>
        </div>
      </div>
    </div>
  );
};
