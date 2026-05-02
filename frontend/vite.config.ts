import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: process.env.VITE_HOST || "localhost",
    proxy: {
      "/auth": { target: "http://localhost:3000", changeOrigin: true },
      "/communities": { target: "http://localhost:3000", changeOrigin: true },
      "/events": {
        target: "http://localhost:3000",
        changeOrigin: true,
        bypass(req) {
          if (req.headers.accept?.includes("text/html")) return req.url;
        },
      },
      "/participations": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/scheduler": { target: "http://localhost:3000", changeOrigin: true },
      "/health": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
