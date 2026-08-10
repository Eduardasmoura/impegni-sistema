# Barber iNova

SaaS multi-tenant para barbearias/salões. Três experiências:

- **Profissional** — `apps/web-professional` (Next.js) e `mobile/barber_inova_app` (Flutter).
- **Cliente** — `apps/web-client` (Next.js, somente web).
- **Super Admin** — ainda não construído (próxima etapa).

Backend único: [Supabase](https://supabase.com) (Postgres + Auth + Storage + Realtime +
Edge Functions), schema já aplicado no projeto `lcdzrahvhilxvkklulaa` — ver
`supabase/README.md`.

## Rodando localmente

```bash
npm install
npm run dev:professional   # http://localhost:3000
npm run dev:client         # http://localhost:3001
```

Cada app já vem com `.env.local` apontando para o projeto Supabase remoto (chave
pública `anon`, segura para expor no client — nunca a `service_role`).

## Mobile (Flutter)

Veja `mobile/barber_inova_app/README.md` — é preciso rodar `flutter create .`
uma vez para gerar as pastas nativas (`android/`, `ios/`) antes do primeiro build.
