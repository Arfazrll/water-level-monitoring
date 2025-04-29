/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['0.0.0.0'],
  },
  // Enable server components
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;