import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { Plugin } from "vite";
import fs from "fs";
import path from "path";

// Plugin to exclude debug files from production build
const excludeDebugFiles = (outDir: string): Plugin => ({
  name: "exclude-debug-files",
  apply: "build", // Only apply during build
  closeBundle() {
    // Remove debug files after build
    const distDir = path.resolve(__dirname, outDir);
    const debugFiles = [
      "debug.html",
      "debug-localstorage.html",
      "debug-localstorage.js",
    ];

    debugFiles.forEach((file) => {
      const filePath = path.join(distDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(() => {
  const outDir = process.env.BUILD_OUT_DIR || "dist";

  return {
    base: "/",
    server: {
      proxy: {
        '/backend': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/backend/, ''),
          cookieDomainRewrite: 'localhost',
          cookiePathRewrite: '/',
        },
      },
    },
    plugins: [
      react(),
      excludeDebugFiles(outDir),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          // Preview/Production muessen index.html und Assets precachen koennen.
          globPatterns: ["**/*.{html,js,css,ico,png,svg,webmanifest}"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api/, /^\/debug/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 Jahr
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        includeAssets: ["favicon.ico", "logo.png"],
        manifest: {
          name: "DPL Professionals GmbH",
          short_name: "DPL Pro",
          description: "Mobile Stundennachweis-App f\u00fcr Mitarbeiter",
          theme_color: "#212f61",
          background_color: "#ffffff",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        devOptions: {
          enabled: true,
          navigateFallback: "index.html",
        },
      }),
    ],
    publicDir: "public",
    optimizeDeps: {
      include: ["pdf-lib", "qrcode"],
    },
    build: {
      outDir,
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks: {
            "pdf-lib": ["pdf-lib"],
            i18n: ["i18next", "react-i18next"],
            "react-vendor": ["react", "react-dom"],
          },
        },
      },
      sourcemap: false,
      minify: "terser",
      copyPublicDir: true,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      exclude: ["**/backup/**"],
    },
  };
});
