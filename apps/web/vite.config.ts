import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    preact(),
    viteStaticCopy({
      targets: [
        {
          src: 'docs/**/*.md',
          dest: 'docs'
        }
      ]
    })
  ],
  assetsInclude: ['**/*.md'],
})
