import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Output as standalone for Docker deployments
  output: 'standalone',
};

export default nextConfig;
