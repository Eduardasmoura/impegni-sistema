/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Endereço antigo dos termos — mantido funcionando (links já divulgados).
    return [{ source: "/termos", destination: "/termos-de-uso", permanent: true }];
  },
};

export default nextConfig;
