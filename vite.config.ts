import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// DuckDB-WASM needs these headers to enable SharedArrayBuffer (for multithreaded mode).
// Not strictly required for single-threaded mode, but harmless to include.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787'
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  }
});
