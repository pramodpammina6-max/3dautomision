import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@metaverse/floorplan-schema'],
  serverExternalPackages: ['sharp', 'mongodb'],
};

export default nextConfig;
