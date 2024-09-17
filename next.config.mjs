/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/podcasts',
        destination: 'http://127.0.0.1:8000/podcasts/',
      },
      {
        source: '/api/podcasts/:path*',
        destination: 'http://127.0.0.1:8000/podcasts/:path*',
      },
    ];
  },
};

export default nextConfig;
