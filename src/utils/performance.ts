import { useEffect } from "react";

interface PerformanceMetrics {
  bundleLoadTime: number;
  initialRenderTime: number;
  memoryUsage?: number;
}

export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Performance-Metriken sammeln
    const collectMetrics = () => {
      if ("performance" in window) {
        const navigation = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming;

        // Guard: Navigation API nicht verfügbar (z.B. in Tests)
        if (
          !navigation ||
          typeof navigation.loadEventEnd !== "number" ||
          typeof navigation.loadEventStart !== "number"
        ) {
          return;
        }

        const metrics: PerformanceMetrics = {
          bundleLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
          initialRenderTime:
            navigation.domContentLoadedEventEnd -
              (navigation as any).navigationStart || 0,
        };

        // Memory-API falls verfügbar
        if ("memory" in performance) {
          const memInfo = (performance as any).memory;
          metrics.memoryUsage = memInfo.usedJSHeapSize;
        }

        // Metriken loggen (nur in Development)
        if (import.meta.env.DEV) {
          console.group("🚀 Performance Metrics");
          console.log(
            "Bundle Load Time:",
            `${metrics.bundleLoadTime.toFixed(2)}ms`
          );
          console.log(
            "Initial Render Time:",
            `${metrics.initialRenderTime.toFixed(2)}ms`
          );
          if (metrics.memoryUsage) {
            console.log(
              "Memory Usage:",
              `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
            );
          }
          console.groupEnd();
        }

        // Core Web Vitals messen
        measureWebVitals();
      }
    };

    // Web Vitals messen
    const measureWebVitals = () => {
      // LCP (Largest Contentful Paint)
      if ("PerformanceObserver" in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];

            if (import.meta.env.DEV) {
              console.log(
                "LCP (Largest Contentful Paint):",
                `${lastEntry.startTime.toFixed(2)}ms`
              );
            }
          });
          observer.observe({ entryTypes: ["largest-contentful-paint"] });
        } catch (e) {
          // PerformanceObserver nicht unterstützt
        }
      }
    };

    // Metriken nach DOM-Load sammeln
    if (document.readyState === "complete") {
      collectMetrics();
    } else {
      window.addEventListener("load", collectMetrics);
    }

    return () => {
      window.removeEventListener("load", collectMetrics);
    };
  }, []);
};

// Bundle-Größen-Analyse (Development only)
export const analyzeBundleSize = () => {
  if (import.meta.env.DEV && "performance" in window) {
    const resources = performance.getEntriesByType(
      "resource"
    ) as PerformanceResourceTiming[];

    const jsResources = resources.filter(
      (resource) =>
        resource.name.includes(".js") && !resource.name.includes("node_modules")
    );

    const cssResources = resources.filter((resource) =>
      resource.name.includes(".css")
    );

    console.group("📦 Bundle Analysis");
    console.log("JavaScript Bundles:");
    jsResources.forEach((resource) => {
      console.log(
        `- ${resource.name.split("/").pop()}: ${(
          resource.transferSize / 1024
        ).toFixed(2)}KB`
      );
    });

    console.log("CSS Bundles:");
    cssResources.forEach((resource) => {
      console.log(
        `- ${resource.name.split("/").pop()}: ${(
          resource.transferSize / 1024
        ).toFixed(2)}KB`
      );
    });
    console.groupEnd();
  }
};

// React-Performance Hook
export const useRenderPerformance = (componentName: string) => {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const startTime = performance.now();

      return () => {
        const renderTime = performance.now() - startTime;
        if (renderTime > 16) {
          // Mehr als 1 Frame (16ms)
          console.warn(
            `⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(
              2
            )}ms`
          );
        }
      };
    }
  });
};
