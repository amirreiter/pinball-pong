import { defineConfig } from "vite";
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl()
  ],
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
