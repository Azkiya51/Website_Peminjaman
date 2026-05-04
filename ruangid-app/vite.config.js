import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Ubah baris ini

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})