/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/programas',
        destination: '/proyectos',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
