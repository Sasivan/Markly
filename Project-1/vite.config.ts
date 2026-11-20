import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    solid(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@dither-kit/engine': path.resolve(__dirname, './src/dither-kit/engine'),
      '@dither-kit/tailwind': path.resolve(__dirname, './src/dither-kit/tailwind'),
      '@dither-kit': path.resolve(__dirname, './src/dither-kit/solid'),
    },
  },
  server: {
    port: 3000,
  },
})
