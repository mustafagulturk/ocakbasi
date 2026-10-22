import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// base "./": oyun hem GitHub Pages alt dizininde hem de Capacitor içinde (file://) çalışsın
export default defineConfig({
  base: "./",
  // çekirdek kurallar derlenmeden doğrudan kaynaktan kullanılır
  resolve: { alias: { "@ocakbasi/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)) } },
  build: { target: "es2020", chunkSizeWarningLimit: 1600 },
  server: { host: true },
});
