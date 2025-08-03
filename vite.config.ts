import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/tapbattle/', // Set the base path for GitHub Pages
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'], // Keep this if you're manually handling lucide-react
  },
  build: {
    chunkSizeWarningLimit: 700, // Optional: Increase limit (default is 500)
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendors': ['react', 'react-dom'],
          'lucide': ['lucide-react'],
        },
      },
    },
  },
});
