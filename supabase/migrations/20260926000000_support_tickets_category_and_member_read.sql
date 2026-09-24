-- Ajuda e Suporte no painel: reaproveita public.support_tickets (já usada pela
-- tela Suporte do Super Admin). Criação dos chamados é feita pela Edge Function
-- create-support-ticket (empresa derivada do usuário autenticado, nunca do
-- frontend), então NÃO há policy de INSERT para empresas.

-- Categoria escolhida pelo profissional (nula para chamados antigos/criados
-- pelo Super Admin).
alter table public.support_tickets add column if not exists category text;
alter table public.support_tickets drop constraint if exists support_tickets_category_check;
alter table public.support_tickets add constraint support_tickets_category_check check (
  category is null or category in ('problema_tecnico', 'agenda', 'financeiro', 'conta', 'duvida', 'sugestao', 'outro')
);

-- Membros ativos veem os chamados da própria empresa (histórico futuro no
-- painel). Uma empresa nunca vê chamados de outra. A policy de super admin
-- existente (support_tickets_all_admin_only) continua valendo.
drop policy if exists support_tickets_select_company_members on public.support_tickets;
create policy support_tickets_select_company_members on public.support_tickets
  for select to authenticated using (private.is_company_member(company_id));

revoke all on public.support_tickets from anon;
