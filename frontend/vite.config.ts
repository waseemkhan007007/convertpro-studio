import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, requests to /api are forwarded to the Python backend,
// so the browser never needs to know the backend address.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
