import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Every page, asset and auth callback lives under /admin, so this app can sit
  // behind fb.mesaschool.co.in/admin whether it ends up in its own repo (one
  // rewrite in the wall) or moved into the wall's repo.
  basePath: '/admin',
  // The floating "N" button is a development tool; keep it off screenshots and demos.
  devIndicators: false,
}

export default nextConfig
