# Supabase

Este projeto usa um projeto Supabase **remoto** já provisionado — não há stack
local (`supabase start`) configurada aqui ainda.

- URL: `https://lcdzrahvhilxvkklulaa.supabase.co`
- Schema `public`: `profiles`, `companies`, `company_members`, `professionals`,
  `services`, `clients`, `appointments`, `payments`, `expenses`, `products`,
  `plans`, `subscriptions`, `device_tokens`, `audit_logs` — todas com Row Level
  Security habilitado (`ENABLE` + `FORCE`).
- Funções auxiliares em schema `private` (não exposto na Data API):
  `is_super_admin()`, `is_company_member(company_id)`,
  `is_company_manager(company_id)`, `company_role(company_id)`, `company_ids()`.
- As migrations foram aplicadas via MCP (`apply_migration`), não existem arquivos
  `.sql` versionados aqui ainda — próximo passo recomendado é rodar
  `supabase db pull` localmente (com a CLI) para trazer esse histórico para
  `supabase/migrations/` e versionar de verdade no Git.

Nunca use a chave `service_role` em nenhum dos apps cliente (Next.js ou
Flutter) — ela só deve aparecer em Edge Functions.
