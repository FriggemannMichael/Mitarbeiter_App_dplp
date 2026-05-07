import React, { useEffect, useState } from "react";

import { managementPortalAuthService } from "../services/managementPortalAuthService";
import { ManagementPortalDashboard } from "./ManagementPortalDashboard";
import { ManagementPortalLogin } from "./ManagementPortalLogin";

export const ManagementPortalRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    const bootstrap = async () => {
      const authenticated = managementPortalAuthService.isAuthenticated();
      if (authenticated && !managementPortalAuthService.canAccessPortal()) {
        await managementPortalAuthService.logout();
        setRouteError("Dieses Konto hat keinen Zugriff auf das Verwaltungsportal.");
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };

    void bootstrap();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Lade Verwaltungsportal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ManagementPortalLogin
        initialError={routeError}
        onLoginSuccess={() => {
          setRouteError("");
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return <ManagementPortalDashboard />;
};
