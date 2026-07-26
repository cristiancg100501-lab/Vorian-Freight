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
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Previene clickjacking — nadie puede embeber tu sitio en un iframe
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Previene MIME sniffing attacks
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Controla información del referrer enviada a terceros
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desactiva APIs del browser que no usas (micrófono, cámara, etc.)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // Fuerza HTTPS por 1 año (activar solo cuando tengas dominio con SSL)
          // { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
}

module.exports = nextConfig

