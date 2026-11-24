import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: 'REACT_APP_',
  server: { port: 3000, strictPort: true }, // The backend allows this origin
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    restoreMocks: true,
  },
});
