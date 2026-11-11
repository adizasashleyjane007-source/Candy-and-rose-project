// Polyfill / safe wrapper for process.exit on Node 22+ (Next.js 13 passes 'SIGINT' string to process.exit during Ctrl+C shutdown)
if (typeof process !== 'undefined' && typeof process.exit === 'function') {
  const origExit = process.exit;
  process.exit = function (code) {
    if (typeof code !== 'number') {
      code = typeof code === 'string' && !Number.isNaN(Number(code)) ? Number(code) : 0;
    }
    return origExit.call(process, code);
  };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: true,
  swcMinify: true,
  compiler: {
    removeConsole: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
  webpack: (config) => {
    config.module.exprContextCritical = false;
    return config;
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          source: '/_next/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, must-revalidate',
            },
          ],
        },
      ];
    }
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|woff2|woff|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
