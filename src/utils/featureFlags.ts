import type { TechnicalConfig } from "../types/config.types";

export const isFeatureEnabled = (
  technical: TechnicalConfig | null | undefined,
  key: string,
  fallback = false,
): boolean => {
  if (!technical?.feature_flags) {
    return fallback;
  }
  const value = technical.feature_flags[key];
  return typeof value === "boolean" ? value : fallback;
};
