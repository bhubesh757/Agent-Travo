import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The API is proxied so the browser sees one origin; the session cookie stays first-party and no CORS is needed.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
})
