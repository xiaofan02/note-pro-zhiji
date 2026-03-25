import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "node:fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./package.json"), "utf8"));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    process.env.VITE_PWA === "false"
      ? false
      : VitePWA({
          registerType: "prompt",
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
            navigateFallbackDenylist: [/^\/~oauth/],
            maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                  cacheName: "google-fonts-cache",
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                },
              },
            ],
          },
          manifest: {
            name: "智记 AI",
            short_name: "智记AI",
            description: "智记AI，笔记软件，便携记录，随时随地记录灵感！",
            theme_color: "#1a1b2e",
            background_color: "#1a1b2e",
            display: "standalone",
            scope: "/",
            start_url: "/",
            icons: [{ src: "/favicon.ico", sizes: "64x64", type: "image/x-icon" }],
          },
        }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: "esnext",
  },
}));
