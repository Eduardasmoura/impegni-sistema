import type { MetadataRoute } from "next";

// Site 100% público (marketing) — libera tudo pra indexação e aponta pro
// sitemap. `NEXT_PUBLIC_SITE_URL` é a mesma variável já usada em
// `layout.tsx` (metadataBase); sem ela definida em produção, cai no
// fallback de dev (mesmo comportamento já documentado ali).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
