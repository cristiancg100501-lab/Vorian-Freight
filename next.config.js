/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize heavy package imports — allows Next.js to tree-shake and
  // only bundle the specific icons/components actually used, instead of
  // the entire library. Significantly reduces JS bundle size.
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'motion'],
  },
  webpack: (config, { isServer }) => {
    // mapbox-gl uses browser-only APIs. Prevent SSR bundling errors.
    if (isServer) {
      config.externals = [...(config.externals || []), 'mapbox-gl'];
    }
    return config;
  },
}

module.exports = nextConfig

