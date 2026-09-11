import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// dev:               index.html -> main.tsx (standalone, HMR)
// build:             panel.tsx -> custom_components/lightwick/frontend/panel.js (HA panel web component)
// build --mode app:  index.html -> dist/ (SPA for Capacitor)
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build:
    mode === "app"
      ? { outDir: "dist", emptyOutDir: true }
      : {
          lib: { entry: "src/panel.tsx", formats: ["es"], fileName: () => "panel.js" },
          outDir: "../../../custom_components/lightwick/frontend",
          emptyOutDir: true,
        },
}));
