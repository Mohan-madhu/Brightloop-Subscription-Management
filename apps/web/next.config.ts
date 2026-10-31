import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The VPS publishes this app below /odoo. Keep local development at /.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
};
export default nextConfig;
