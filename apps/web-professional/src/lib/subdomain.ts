/**
 * Suporte a `{slug}.{ROOT_DOMAIN}` no app profissional — mesmo princípio já
 * usado em `apps/web-client/src/lib/subdomain.ts` para o agendamento
 * público, mas aqui o domínio raiz é o do painel (`app.impegni.com.br` em
 * produção, `localhost:3000` em dev — configurável via
 * `NEXT_PUBLIC_ROOT_DOMAIN`), separado do domínio do web-client
 * (`impegni.com.br`) de propósito: os dois coringas de DNS não colidem.
 *
 * Diferença importante em relação ao web-client: aqui NÃO existe reescrita
 * de path nenhuma. As rotas (`/agenda`, `/financeiro`, ...) já existem
 * como estão hoje; o slug vive só no hostname e é lido em
 * `getCurrentCompany()` via `headers()` — nenhuma página muda de lugar.
 */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

/** Igual a `apps/web-client/src/lib/subdomain.ts` — ver comentários lá. */
export function extractSubdomain(host: string, rootDomain: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  const rootHostname = rootDomain.split(":")[0].toLowerCase();

  if (hostname === rootHostname || hostname === `www.${rootHostname}`) {
    return null;
  }

  if (hostname.endsWith(`.${rootHostname}`)) {
    const subdomain = hostname.slice(0, -(rootHostname.length + 1));
    return subdomain.includes(".") ? null : subdomain;
  }

  return null;
}

/**
 * Domain do cookie de sessão do Supabase. Precisa cobrir TODOS os
 * subdomínios de empresa (`.app.impegni.com.br`, com o ponto na frente —
 * sintaxe padrão de cookie válido pro domínio e qualquer subdomínio dele),
 * senão logar em `studio-bella.app.impegni.com.br` deixaria a pessoa
 * "deslogada" ao entrar em `outra-empresa.app.impegni.com.br` (cookie
 * ficaria preso ao host exato de login) — e a checagem de segurança por
 * subdomínio (ver `getCurrentCompany`) nunca chegaria a rodar de verdade
 * nesse caso, porque o middleware já teria barrado antes por falta de
 * sessão.
 *
 * Em `localhost` isso não funciona: `Domain=.localhost` passa quando
 * injetado direto no cookie jar (ex. via ferramenta de teste), mas o
 * próprio navegador REJEITA silenciosamente um `document.cookie`/
 * `Set-Cookie` real com esse domain vindo de uma página em
 * `*.localhost` (confirmado testando) — resultado seria pior que não
 * setar nada: login pararia de funcionar em dev. `app.impegni.com.br` é
 * um domínio de verdade, sem essa restrição — funciona normalmente.
 */
export function cookieDomain(): string | undefined {
  const hostname = ROOT_DOMAIN.split(":")[0];
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return undefined;
  return `.${hostname}`;
}
