import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { prerender } from "./scripts/prerender.js";

// Runs the post-build prerender (static per-route HTML for link previews / SEO)
// as part of `vite build` itself — so it fires no matter whether the host runs
// `vite build` or `npm run build`. Never throws: a prerender failure logs and
// leaves the plain SPA build intact rather than failing the whole build.
const prerenderPlugin = () => ({
  name: "gunji-prerender",
  apply: "build",
  async closeBundle() {
    try {
      await prerender();
    } catch (err) {
      console.warn(`[prerender] skipped due to error: ${err?.message || err}`);
    }
  },
});

export default defineConfig({
  plugins: [react(), prerenderPlugin()],
  server: {
    port: 5173,
    // Backend runs on :3001 (npm run dev starts both). /admin is the owner
    // dashboard served by the API server.
    proxy: {
      "/api": "http://localhost:3001",
      "/admin": "http://localhost:3001",
    },
  },
});
