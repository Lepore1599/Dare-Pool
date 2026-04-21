import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/**
 * Capacitor production build config.
 *
 * Use this when building the app for iOS packaging:
 *   pnpm run build:capacitor
 *   npx cap sync ios
 *   npx cap open ios
 *
 * This config intentionally does NOT require the Replit-specific
 * PORT / BASE_PATH env vars and sets base to "./" so that the
 * built files can be loaded by Capacitor from the local filesystem.
 */
export default defineConfig({
  base: "./",
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
  define: {
    "import.meta.env.BASE_URL": JSON.stringify("./"),
    "import.meta.env.VITE_API_URL": JSON.stringify(""),
  },
});
