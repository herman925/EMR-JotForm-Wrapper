import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeBase(base) {
  if (!base || base === '/') return '/'
  return `/${base.replace(/^\/+|\/+$/g, '')}/`
}

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const defaultBase = process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project sites need a repo subpath, but the value should follow
  // whichever repository is building the app instead of being hardcoded upstream.
  base: normalizeBase(process.env.VITE_BASE_PATH || process.env.BASE_PATH || defaultBase),
})
