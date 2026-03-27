import type { NextConfig } from 'next'
import redirectsJson from './redirects.json'

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
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
  async redirects() {
    return Object.entries(redirectsJson).map(([source, destination]) => ({
      source: source.startsWith('/') ? source : `/${source}`,
      destination: destination as string,
      permanent: true,
    }))
  },
}

export default nextConfig
