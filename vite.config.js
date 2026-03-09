import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // Changed for custom domain jiqi-idea.com
  plugins: [react()],
})
