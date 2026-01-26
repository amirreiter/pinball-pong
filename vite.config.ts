import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ command }) => {
  return {
    base: command === "build" ? "/pinball-pong/" : "/",
    build: {
      outDir: "docs",
      emptyOutDir: true,
      sourcemap: false,
      minify: "terser",
      target: "es2015",
      rollupOptions: {
        output: {
          entryFileNames: "game.js",
          format: "umd",
          name: "Game",
          inlineDynamicImports: true,
        },
      },
    },
    plugins: [basicSsl()],
  };
});
