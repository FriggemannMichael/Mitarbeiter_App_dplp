import React, { useEffect, useState } from "react";

import { portalAuthService } from "../services/portalAuthService";
import { CustomerPortalDashboard } from "./CustomerPortalDashboard";
import { CustomerPortalLogin } from "./CustomerPortalLogin";

export const CustomerPortalRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    const bootstrap = async () => {
      const authenticated = portalAuthService.isAuthenticated();
      if (authenticated && !portalAuthService.canAccessPortal()) {
        await portalAuthService.logout();
        setRouteError("Dieses Konto hat keinen Zugriff auf das Kundenportal.");
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
          <p className="text-slate-600">Lade Kundenportal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <CustomerPortalLogin
        initialError={routeError}
        onLoginSuccess={() => {
          setRouteError("");
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return <CustomerPortalDashboard />;
};
