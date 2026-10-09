import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
