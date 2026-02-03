import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
}

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
});

export default pwaConfig(nextConfig);
