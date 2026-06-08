/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['@tyroneross/omniparse', 'xlsx', 'sax', 'better-sqlite3'],
}

export default nextConfig
