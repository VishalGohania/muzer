import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  images: {
    domains: [
      'placehold.co',
      'cdn.pixabay.com',
      'i.ytimg.com',  // for YouTube thumbnails
      'img.youtube.com'  // for YouTube thumbnails
    ],
  },
};

export default nextConfig;
