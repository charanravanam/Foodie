import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are linked correctly on GitHub Pages
  define: {
    // This prevents "process is not defined" error in the browser
    // IMPORTANT: Replace 'YOUR_GEMINI_API_KEY' with your actual key in the .env file or here for testing
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "") 
  }
})