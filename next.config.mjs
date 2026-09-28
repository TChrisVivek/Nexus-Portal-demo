/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Build currently passes lint — this is a safety net for Vercel deploys
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avgiyfvyrqtoexcukaxx.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
