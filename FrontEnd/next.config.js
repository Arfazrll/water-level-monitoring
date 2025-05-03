/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['0.0.0.0'],
  },
};

module.exports = nextConfig;