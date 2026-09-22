import type { MetadataRoute } from "next";

// App interno (só equipe da plataforma) — nunca deve aparecer em busca.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
