import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone Demo Frontend Configuration
// No backend proxy required — runs 100% in-browser with mock data.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5174,
    host: "0.0.0.0",
  },
});
