import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// dev: index.html -> main.tsx (standalone, token auth, HMR)
// build: panel.tsx -> ../../../custom_components/lightwick/frontend/panel.js (HA panel web component)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    lib: { entry: "src/panel.tsx", formats: ["es"], fileName: () => "panel.js" },
    outDir: "../../../custom_components/lightwick/frontend",
    emptyOutDir: true,
  },
});
