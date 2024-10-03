import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  base: process.env.ELECTRON == "true" ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      'src': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html')
      }
    }
  },
  server: {
    port: 5173
  },
  root: path.resolve(__dirname, 'src/renderer')
})