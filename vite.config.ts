import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { execSync } from 'child_process'

const commitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
})()

export default defineConfig({
  plugins: [react(), basicSsl()],
  define: {
    __COMMIT__: JSON.stringify(commitHash),
  },
  server: {
    host: true,
    https: {},
  },
})
