import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './dist-web',
  publicDir: './dist-web/public',
  build: {
    outDir: './dist-web/dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'dist-web/index.html'),
        board: resolve(__dirname, 'dist-web/board-view.html'),
        preview: resolve(__dirname, 'dist-web/public/preview.html')
      }
    }
  }
});
