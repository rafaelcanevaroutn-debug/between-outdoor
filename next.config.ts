import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir hasta 100MB por upload (fotos y videos del banco de imágenes)
  experimental: {
    serverActions: { bodySizeLimit: '100mb' },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
