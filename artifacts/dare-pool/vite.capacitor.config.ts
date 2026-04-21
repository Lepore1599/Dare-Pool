import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/**
 * Capacitor production build config.
 *
 * ─── REQUIRED before building ────────────────────────────────────────────────
 * Set VITE_API_URL to your deployed API server URL (without trailing slash):
 *
 *   VITE_API_URL=https://your-api-domain.replit.app pnpm run build:capacitor
 *
 * Or create a .env.capacitor file:
 *   VITE_API_URL=https://your-api-domain.replit.app
 *
 * If not set, API calls will fail and the app will show error states.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Build pipeline on macOS:
 *   pnpm run build:capacitor   ← run this first
 *   npx cap sync ios           ← copies web assets to Xcode project
 *   npx cap open ios           ← opens Xcode
 */
export default defineConfig({
  // "/"  →  BASE_URL = "/"  →  Wouter base = ""  →  routes match from root
  // Do NOT use "./" — that makes BASE_URL = "./" which breaks Wouter routing
  base: "/",

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },

  root: path.resolve(import.meta.dirname),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          motion: ["framer-motion"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-tabs", "@radix-ui/react-accordion"],
        },
      },
    },
  },
});
