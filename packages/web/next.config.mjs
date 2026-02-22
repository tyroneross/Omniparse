/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['@tyroneross/omniparse', 'xlsx', 'sax', '@prisma/client', '@prisma/adapter-better-sqlite3', 'better-sqlite3'],
}

export default nextConfig
