import { apiService } from "./apiService";

const AUTH_KEY = "portal_authenticated";
const AUTH_TIMESTAMP_KEY = "portal_auth_timestamp";
const AUTH_USER_KEY = "portal_auth_user";
const AUTH_TOKEN_KEY = "portal_auth_token";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export interface PortalLoginResult {
  success: boolean;
  error?: string;
}

export interface PortalAuthUser {
  id: number;
  account_id?: number | null;
  username: string;
  email: string;
  role?: string;
  customer_key?: string;
}

class PortalAuthService {
  private readonly allowedRoles = new Set([
    "customer_admin",
    "platform_owner",
    "backoffice",
    "dispatcher",
    "branch_manager",
    "viewer",
  ]);

  async login(username: string, password: string): Promise<PortalLoginResult> {
    try {
      const response = await apiService.login(username, password);
      if (response.success && response.data) {
        apiService.setAuthToken(response.data.token || "");
        localStorage.setItem(AUTH_KEY, "true");
        localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.data));
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.token || "");
        if (!this.canAccessPortal()) {
          await this.logout();
          return {
            success: false,
            error: "Dieses Konto hat keinen Zugriff auf das Verwaltungsportal.",
          };
        }
        return { success: true };
      }
      return {
        success: false,
        error: response.error || "Login fehlgeschlagen",
      };
    } catch (error) {
      console.error("Portal login error:", error);
      return {
        success: false,
        error: "Login fehlgeschlagen. API nicht erreichbar.",
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await apiService.logout();
    } catch {
      // ignore
    }
    apiService.setAuthToken("");
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const isAuth = localStorage.getItem(AUTH_KEY) === "true";
    const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!isAuth || !timestamp || !token) {
      return false;
    }

    const loginTime = parseInt(timestamp, 10);
    if (Number.isNaN(loginTime) || Date.now() - loginTime > SESSION_DURATION_MS) {
      void this.logout();
      return false;
    }

    return true;
  }

  getCurrentUser(): PortalAuthUser | null {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY) || "";
      apiService.setAuthToken(token);
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? (JSON.parse(raw) as PortalAuthUser) : null;
    } catch {
      return null;
    }
  }

  canApproveTimesheets(): boolean {
    const role = this.getCurrentUser()?.role;
    return role === "customer_admin" || role === "platform_owner" || role === "backoffice";
  }

  canAccessPortal(): boolean {
    const role = this.getCurrentUser()?.role || "";
    return this.allowedRoles.has(role);
  }

  isViewerOnly(): boolean {
    return this.getCurrentUser()?.role === "viewer";
  }
}

export const managementPortalAuthService = new PortalAuthService();
