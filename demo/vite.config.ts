import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ui-morph/react': resolve(__dirname, '../packages/react/src/index.ts'),
    },
  },
})
