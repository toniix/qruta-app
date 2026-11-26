import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            /node_modules\/(leaflet|react-leaflet|leaflet-geosearch|@react-leaflet)\//.test(
              id,
            )
          ) {
            return "leaflet-vendor";
          }
          if (
            /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(
              id,
            )
          ) {
            return "react-vendor";
          }
          if (/node_modules\/(lucide-react|zod|axios)\//.test(id)) {
            return "ui-vendor";
          }
          if (/node_modules\/@tanstack\//.test(id)) {
            return "tanstack-vendor";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    allowedHosts: ["front.anthonywar.dev"],
    // Cloudflare caches .js by default and rewrites the response with a 4 hour
    // Browser Cache TTL, which leaves the browser serving stale modules long after
    // they change. no-store keeps both the edge and the browser out of the way.
    headers: {
      "Cache-Control": "no-store",
    },
  },
});
