import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "static-dashboard",
  base: "/Supply-Chain-Profitability-Control-Tower/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-pages",
    emptyOutDir: true,
  },
});
