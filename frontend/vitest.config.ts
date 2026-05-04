import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vitest/config';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    passWithNoTests: false,
    watch: false,
  },
});
