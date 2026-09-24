/**
 * Monta a URL do painel profissional para uma empresa específica
 * (`https://{slug}.app.impegni.com.br`), a partir de
 * `NEXT_PUBLIC_WEB_PROFESSIONAL_URL` (hoje o domínio "nu",
 * `https://app.impegni.com.br`) — sem precisar de uma env var nova. Usado
 * nos links de "Acessar como empresa" e "Redefinir acesso", que agora
 * levam a pessoa direto pro subdomínio certo em vez do domínio genérico.
 *
 * Em dev, `NEXT_PUBLIC_WEB_PROFESSIONAL_URL` costuma ser
 * `http://localhost:3000` — o resultado (`http://{slug}.localhost:3000`)
 * já funciona sem configuração extra (RFC 6761).
 */
export function professionalUrlForCompany(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_WEB_PROFESSIONAL_URL || (process.env.NODE_ENV === "production" ? "https://app.impegni.com.br" : "http://localhost:3000");
  // Subdomínio por empresa só quando o domínio curinga *.app.impegni.com.br
  // estiver servindo HTTPS na Vercel (hoje resolve no DNS mas não responde)
  // — até lá, os links do Super Admin usam o domínio principal do painel.
  if (process.env.NEXT_PUBLIC_PROFESSIONAL_SUBDOMAINS !== "true") return base.replace(/\/$/, "");
  try {
    const url = new URL(base);
    url.hostname = `${slug}.${url.hostname}`;
    return url.origin;
  } catch {
    return base;
  }
}
