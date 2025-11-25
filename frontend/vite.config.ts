import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const allowedHosts = [
  "localhost",
  "127.0.0.1",
  "reservcar.app.br",
  "www.reservcar.app.br",
  "web",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts,
  },
});
