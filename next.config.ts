import type { NextConfig } from 'next'
import redirectsJson from './redirects.json'

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
    // Keep static generation reliable on high-core developer machines with limited free RAM.
    cpus: 4,
  },
  images: {
    qualities: [75, 95],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'dd17w042cevyt.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'www.goinvo.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Self-hosted font files carry the upstream version in their names
        // (scripts/self-host-google-fonts.mjs), so a new version is a new URL.
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
  async redirects() {
    return Object.entries(redirectsJson).map(([source, destination]) => ({
      source: source.startsWith('/') ? source : `/${source}`,
      destination: destination as string,
      permanent: true,
    }))
  },
}

export default nextConfig
