# Barber iNova — Web Cliente

App público (sem login pra navegar) que atende **todos os estabelecimentos**
através do mesmo código — multi-tenant por subdomínio.

## Como o subdomínio funciona

- `{slug}.inova.app` → identifica a empresa pelo `companies.slug` e reescreve
  internamente pra `/​{slug}` (home) ou `/{slug}/agendar` — mesmas páginas que
  já respondem por path.
- `inova.app` (ou `www.inova.app`) → domínio raiz, mostra o diretório de
  empresas ativas (`/`).
- Acesso direto por path (`inova.app/{slug}`) continua funcionando também —
  o rewrite de subdomínio só se soma a isso, não substitui.
- Lógica em `src/lib/subdomain.ts` (`extractSubdomain`) +
  `src/lib/supabase/middleware.ts` (`resolveTenantRewrite`).

## Rodando localmente com subdomínio

`*.localhost` resolve pra `127.0.0.1` sozinho em qualquer navegador/SO
moderno — não precisa mexer em `/etc/hosts`:

```bash
npm run dev   # apps/web-client, porta 3001
```

Depois de ter uma empresa com slug `kellyrein` cadastrada, abra
`http://kellyrein.localhost:3001` — deve renderizar a mesma página que
`http://localhost:3001/kellyrein`.

## Colocando em produção (`*.inova.app`) — runbook

Este projeto ainda não foi implantado em nenhum provedor. Quando for:

1. **Comprar/gerenciar `inova.app`** com DNS na Cloudflare (já é o plano
   definido pro projeto).
2. **Hospedar este app** num provedor com suporte a wildcard domains — a
   Vercel suporta nativamente: adicionar `*.inova.app` como domínio do
   projeto (Project Settings → Domains).
3. **Cloudflare**: criar um registro `CNAME` (ou `A`, conforme o host peça)
   em `*` (`*.inova.app`) apontando pro destino que o provedor indicar.
4. **Env var de produção**: `NEXT_PUBLIC_ROOT_DOMAIN=inova.app` (em dev fica
   `localhost:3001`, ver `.env.local`).

Sem isso configurado, o app continua funcionando normalmente por path
(`inova.app/{slug}`) — o subdomínio é uma camada a mais, não uma dependência
pra funcionar.
