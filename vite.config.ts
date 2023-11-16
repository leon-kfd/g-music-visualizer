import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import importToCDN from 'vite-plugin-cdn-import'
// import { visualizer } from "rollup-plugin-visualizer"
import { resolve } from 'path'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@antv/g-lite': resolve(__dirname, 'src/g-lite')
    }
  },
  plugins: [
    react(),
    importToCDN({
      modules: [
        {
          name: 'react',
          var: 'React',
          path: `https://cdn.staticfile.org/react/18.2.0/umd/react.production.min.js`,
          // path: `https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js`
        },
        {
          name: 'react-dom',
          var: 'ReactDOM',
          path: `https://cdn.staticfile.org/react-dom/18.2.0/umd/react-dom.production.min.js`,
          // path: `https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js`
        },
        {
          name: 'stats.js',
          var: 'Stats',
          path: 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/r17/Stats.min.js'
        }
      ]
    }),
    // visualizer()
  ]
})
