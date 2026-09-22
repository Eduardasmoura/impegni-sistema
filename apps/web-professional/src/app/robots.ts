import type { MetadataRoute } from "next";

// App interno (painel do profissional, tudo atrás de login) — nunca deve
// aparecer em busca. Nenhuma rota daqui é destinada a visitante anônimo.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
