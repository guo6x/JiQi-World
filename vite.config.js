import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/JiQi-World/', // GitHub Pages deployment path
  plugins: [react()],
})
