/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Some dependencies (like googleapis) are server-only and may reference Node internals.
  // This fallback helps avoid client-side bundling errors on platforms like Vercel.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      child_process: false,
      net: false,
      tls: false
    };
    return config;
  }
};

export default nextConfig;

