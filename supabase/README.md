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
- **Histórico de migrations (reconciliado em 22/09/2026):** 138 migrations
  aplicadas no remoto ao todo. As 18 mais recentes (10/09/2026 em diante)
  têm arquivo `.sql` em `supabase/migrations/` e estão corretamente
  registradas na tabela de controle do Supabase. As 120 anteriores (aplicadas
  direto via MCP `apply_migration`, sem gerar arquivo local) não têm — em vez
  de tentar reconstruir esse histórico arquivo a arquivo, `supabase/schema_atual/`
  guarda uma fotografia completa e reproduzível do schema atual (ver o README
  daquela pasta para o procedimento de reprodução do zero). Toda mudança de
  schema **daqui pra frente** deve virar um arquivo novo em
  `supabase/migrations/`, nunca só um `apply_migration` avulso.

Nunca use a chave `service_role` em nenhum dos apps cliente (Next.js ou
Flutter) — ela só deve aparecer em Edge Functions.
