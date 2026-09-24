-- Visitante anônimo (página pública de agendamento) só lê as colunas que a
-- página usa. Antes o GRANT era na tabela inteira e a API pública devolvia
-- CPF/CNPJ (document), e-mail, telefone interno e o ID de cliente no Asaas
-- de todas as empresas ativas. A policy de RLS (quais LINHAS) não muda.
-- Lista espelhada em apps/web-client/src/lib/public-company.ts.
revoke select on table public.companies from anon;
grant select (
  id, name, trade_name, slug, segment_id, status, logo_url, cover_url,
  color_primary, color_secondary, color_accent, business_hours,
  address, street, address_number, complement, neighborhood, city, state, zip_code,
  whatsapp, instagram, timezone, anamnesis_enabled, loyalty_program_enabled, created_at
) on table public.companies to anon;

-- Security Advisor (function_search_path_mutable): fixa o search_path do
-- gatilho que valida companies.timezone (só consulta pg_timezone_names).
alter function private.enforce_company_timezone_valid() set search_path = pg_catalog;
