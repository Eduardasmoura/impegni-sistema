/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prints do produto servidos em AVIF (quando o browser aceita) ou WebP.
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    // Endereço antigo dos termos — mantido funcionando (links já divulgados).
    return [{ source: "/termos", destination: "/termos-de-uso", permanent: true }];
  },
};

export default nextConfig;
