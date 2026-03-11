/**
 * Authentication Service für Admin-Login
 * Verwendet REST API für Session-basierte Authentifizierung
 */

import { configService } from './configService';
import { apiService } from './apiService';

const AUTH_KEY = 'admin_authenticated';
const AUTH_TIMESTAMP_KEY = 'admin_auth_timestamp';
const AUTH_USER_KEY = 'admin_auth_user';
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 Stunden

/**
 * Auth Service Interface
 */
export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface AuthUser {
  id: number;
  account_id?: number | null;
  username: string;
  email: string;
  role?: string;
  customer_key?: string;
}

class AuthService {
  /**
   * Admin-Login mit Benutzername und Passwort
   * Verwendet REST API für Session-basierte Authentifizierung
   */
  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // Versuche Login über REST API
      const response = await apiService.login(username, password);

      if (response.success && response.data) {
        // Speichere Auth-Status in localStorage
        localStorage.setItem(AUTH_KEY, 'true');
        localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.data));

        return {
          success: true,
        };
      }

      return {
        success: false,
        error: response.error || 'Falsches Passwort',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login fehlgeschlagen. API nicht erreichbar.',
      };
    }
  }

  /**
   * Logout (löscht Auth-Status und beendet Server-Session)
   */
  async logout(): Promise<void> {
    try {
      // Versuche Logout über REST API
      await apiService.logout();
    } catch (error) {
      // REST API Logout fehlgeschlagen
    }

    // Lokalen Auth-Status immer löschen
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }

  /**
   * Prüft ob Benutzer eingeloggt ist
   */
  isAuthenticated(): boolean {
    const isAuth = localStorage.getItem(AUTH_KEY) === 'true';
    const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);

    if (!isAuth || !timestamp) {
      return false;
    }

    // Prüfe ob Session noch gültig ist
    const loginTime = parseInt(timestamp, 10);
    const now = Date.now();

    if (now - loginTime > SESSION_DURATION_MS) {
      // Session abgelaufen
      this.logout();
      return false;
    }

    return true;
  }

  /**
   * Verlängert die Session (z.B. bei Aktivität)
   */
  refreshSession(): void {
    if (this.isAuthenticated()) {
      localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
    }
  }

  getCurrentUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  /**
   * Ändert das Passwort in der aktuellen Config
   * WICHTIG: Dies ändert nur die lokale Kopie!
   * Der Benutzer muss die config.json herunterladen und auf den Server hochladen.
   */
  async changePassword(oldPassword: string, _newPassword: string): Promise<LoginResult> {
    if (!this.isAuthenticated()) {
      return {
        success: false,
        error: 'Nicht eingeloggt',
      };
    }

    try {
      const config = await configService.loadConfiguration();

      // Prüfe altes Passwort
      if (config.admin?.password !== oldPassword) {
        return {
          success: false,
          error: 'Altes Passwort ist falsch',
        };
      }

      // Hinweis: Das neue Passwort wird im AdminDashboard in die Config geschrieben
      // und der Benutzer muss die config.json herunterladen
      return {
        success: true,
      };
    } catch (error) {
      console.error('Password change error:', error);

      return {
        success: false,
        error: 'Passwortänderung fehlgeschlagen',
      };
    }
  }

  /**
   * Prüft ob Desktop-Gerät (für Admin-Zugriff)
   */
  isDesktopDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    // Zusätzlich Bildschirmgröße prüfen
    const isSmallScreen = window.innerWidth < 768;

    return !isMobile && !isSmallScreen;
  }

  /**
   * Prüft ob Admin-Zugriff erlaubt ist (Desktop + Auth)
   */
  canAccessAdmin(): boolean {
    return this.isDesktopDevice() && this.isAuthenticated();
  }
}

// Singleton-Instanz exportieren
export const authService = new AuthService();
