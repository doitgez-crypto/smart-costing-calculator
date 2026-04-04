/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['googleapis', '@prisma/client'],
  turbopack: {},
};

export default nextConfig;