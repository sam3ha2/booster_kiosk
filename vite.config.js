import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: './',
    build: {
      target: 'esnext',
      outDir: path.resolve(__dirname, 'dist'), // 빌드 출력 경로 수정
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    root: path.resolve(__dirname, 'src/renderer'),
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    define: {
      'process.env': env,
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    server: {
      port: 5173,
    },
  }
});
