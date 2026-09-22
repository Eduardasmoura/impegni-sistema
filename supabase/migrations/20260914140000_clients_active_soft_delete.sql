-- Reformulação da tela de Clientes (CRM) — Parte 1/2.
--
-- Hoje "Excluir cliente" faz um DELETE real em `public.clients`. As FKs de
-- `appointments`, `anamnesis_responses`, `client_packages`, `reviews`,
-- `campaign_sends`, `waitlist_entries` e `coupon_redemptions` pra
-- `clients.id` são todas `ON DELETE CASCADE` — ou seja, excluir um cliente
-- HOJE apaga silenciosamente todo o histórico de atendimentos, respostas de
-- anamnese e avaliações dele. Isso é exatamente o risco que este trabalho
-- pediu pra evitar ("preservar integridade histórica").
--
-- Correção: reaproveita o MESMO padrão já usado em `professionals.active` e
-- `services.active` (soft-delete por flag, não DELETE) — "Excluir cliente"
-- na UI passa a fazer `active = false`, nunca mais um DELETE. Nenhuma FK
-- muda (permanecem CASCADE — não é o momento de mexer nisso, e um valor
-- default true não quebra nenhuma linha existente).
ALTER TABLE "public"."clients"
  ADD COLUMN IF NOT EXISTS "active" boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN "public"."clients"."active" IS 'Soft-delete (mesmo padrão de professionals.active/services.active). "Excluir cliente" na UI seta false — nunca faz DELETE real, pra não perder histórico via CASCADE. false = cliente inativo/arquivado, mas todo o histórico (agendamentos, anamnese, pacotes) continua intacto e consultável.';
