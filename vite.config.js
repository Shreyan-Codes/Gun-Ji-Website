import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
