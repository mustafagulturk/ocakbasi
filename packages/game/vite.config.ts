import { defineConfig } from "vite";

// base "./": oyun hem GitHub Pages alt dizininde hem de Capacitor içinde (file://) çalışsın
export default defineConfig({
  base: "./",
  build: { target: "es2020", chunkSizeWarningLimit: 1600 },
  server: { host: true },
});
