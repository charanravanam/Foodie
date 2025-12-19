
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Vital for GitHub Pages subfolder deployment
  define: {
    // Ensure the build uses the environment variable if available, otherwise fallback to empty string
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "") 
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts', 'lucide-react', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  }
})
