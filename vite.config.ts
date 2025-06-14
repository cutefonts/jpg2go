import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['qrcode', 'jszip']
  },
  build: {
    // Enable minification for better performance
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
          utils: ['jszip', 'qrcode']
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Ensure compatibility
    target: 'es2015',
    sourcemap: false
  },
  // Enable compression
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    open: false
  },
  // Optimize assets
  assetsInclude: ['**/*.woff2', '**/*.woff'],
  // Define global constants
  define: {
    global: 'globalThis',
  },
  // PWA specific configurations
  publicDir: 'public',
  // Improve dev server performance
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});