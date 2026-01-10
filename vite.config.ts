import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: "game.js",
        chunkFileNames: "game.js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
