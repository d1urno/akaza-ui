import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [vue()],
  resolve: { alias: { "akaza-ui": fileURLToPath(new URL("../../src/index.ts", import.meta.url)) } },
});
