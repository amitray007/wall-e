import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow connections from any host
  },
  preview: {
    host: true, // Allow connections from any host for preview
    allowedHosts: [], // Empty array allows all hosts
  },
})
