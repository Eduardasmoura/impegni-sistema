/**
 * Extrai o subdomínio de tenant de um hostname, dado o domínio raiz da
 * aplicação (ex.: "inova.app" em produção, "localhost:3001" em dev — ambos
 * configuráveis via NEXT_PUBLIC_ROOT_DOMAIN).
 *
 * Retorna `null` quando o host É o domínio raiz (ou "www.") — nesse caso não
 * há tenant, é o diretório/marketing da plataforma. Retorna o subdomínio
 * (ex.: "kellyrein") quando o host é `{slug}.{root}`.
 *
 * `*.localhost` resolve pra 127.0.0.1 sozinho em qualquer navegador/SO
 * moderno (RFC 6761) — não precisa mexer em /etc/hosts pra testar
 * `kellyrein.localhost:3001` em dev.
 */
export function extractSubdomain(host: string, rootDomain: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  const rootHostname = rootDomain.split(":")[0].toLowerCase();

  if (hostname === rootHostname || hostname === `www.${rootHostname}`) {
    return null;
  }

  if (hostname.endsWith(`.${rootHostname}`)) {
    const subdomain = hostname.slice(0, -(rootHostname.length + 1));
    // "www" já é tratado acima; qualquer outro rótulo composto (múltiplos
    // pontos, ex. algo.kellyrein.inova.app) não é um formato suportado hoje.
    return subdomain.includes(".") ? null : subdomain;
  }

  // Host que não bate com o domínio raiz configurado (ex.: preview deploy
  // com outro hostname) — trata como domínio raiz, não quebra a build.
  return null;
}
