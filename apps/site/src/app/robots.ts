import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/format";

// Site 100% público (marketing) — libera tudo pra indexação e aponta pro
// sitemap. `NEXT_PUBLIC_SITE_URL` é a mesma variável já usada em
// `layout.tsx` (metadataBase); sem ela definida em produção, cai no
// fallback de dev (mesmo comportamento já documentado ali).

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
