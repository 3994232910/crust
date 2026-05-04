import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  define: {
    "process.env": {},
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      // 限制并行文件操作数，降低构建峰值内存
      maxParallelFileOps: 5,
    },
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      "/models": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/thumbnails": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/avatars": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/forge-images": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
})
