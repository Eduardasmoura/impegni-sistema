import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/format";
import { TERMOS_DE_USO } from "@/lib/legal";

// As 3 páginas reais deste app hoje (/, /termos-de-uso, /privacidade). Atualizar
// esta lista se novas rotas públicas forem adicionadas ao site.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/termos-de-uso`, lastModified: new Date(TERMOS_DE_USO.atualizadoEmISO), changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
