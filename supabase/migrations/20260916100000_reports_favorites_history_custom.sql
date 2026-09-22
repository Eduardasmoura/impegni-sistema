-- Central de Relatórios — reformulação (parte com estado real):
--   * report_favorites   — relatórios marcados com estrela pelo profissional
--   * report_view_history — últimos relatórios REALMENTE abertos (upsert por
--     relatório: guarda só a visita mais recente de cada um, não um log que
--     cresce pra sempre)
--   * custom_reports     — relatórios personalizados montados no construtor
--
-- Decisão de escopo: favoritos/histórico são POR PESSOA (profile_id = quem
-- clicou), não por empresa inteira — é uma preferência individual, não um
-- dado do negócio. Relatórios personalizados são POR EMPRESA (qualquer
-- membro pode ver os que a equipe já montou, igual acontece com
-- clientes/serviços), mas só quem criou ou um gestor/admin pode
-- editar/excluir. Nenhuma tabela nova precisa de RPC própria: RLS direta
-- nas 3, mesmo padrão já usado em `clients`/`expenses`.

create table if not exists public.report_favorites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  report_key text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, report_key)
);
comment on table public.report_favorites is 'Relatórios (built-in ou custom:<id>) favoritados por um profissional — preferência pessoal, não visível a outros membros da empresa.';

create table if not exists public.report_view_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  report_key text not null,
  report_title text not null,
  viewed_at timestamptz not null default now(),
  unique (profile_id, report_key)
);
comment on table public.report_view_history is 'Registro do último acesso de cada profissional a cada relatório (upsert — não é um log crescente) pra alimentar "Acessados recentemente" com dado real.';
create index if not exists report_view_history_profile_recent_idx on public.report_view_history (profile_id, viewed_at desc);

create table if not exists public.custom_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  name text not null,
  source text not null check (source in ('agendamentos','clientes','servicos','profissionais','financeiro','estoque')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.custom_reports is 'Relatórios personalizados montados no construtor da Central de Relatórios ("Meus relatórios") — config guarda colunas/filtros/agrupamento/visualização escolhidos, executados sob demanda (nada de cache de resultado aqui).';
comment on column public.custom_reports.config is 'Shape: { columns: string[], filters: object, groupBy: string|null, visualization: "table"|"bar"|"line"|"kpi" } — validado na aplicação, não no banco (é config de UI, não dado de negócio).';

create trigger custom_reports_set_updated_at
  before update on public.custom_reports
  for each row execute function private.set_updated_at();

alter table public.report_favorites enable row level security;
alter table public.report_view_history enable row level security;
alter table public.custom_reports enable row level security;

-- Favoritos e histórico: só o próprio dono (e só dentro da própria empresa,
-- defesa em profundidade caso o profile pertença a mais de uma).
create policy report_favorites_self on public.report_favorites
  for all
  using (profile_id = (select auth.uid()) and private.is_company_member(company_id))
  with check (profile_id = (select auth.uid()) and private.is_company_member(company_id));

create policy report_view_history_self on public.report_view_history
  for all
  using (profile_id = (select auth.uid()) and private.is_company_member(company_id))
  with check (profile_id = (select auth.uid()) and private.is_company_member(company_id));

-- Relatórios personalizados: qualquer membro da empresa VÊ (mesmo espírito
-- de clientes/serviços — é um recurso da empresa, não só de quem criou);
-- só quem criou ou um gestor/admin da empresa ALTERA/APAGA; super admin
-- sempre pode (suporte).
create policy custom_reports_select_members on public.custom_reports
  for select
  using (private.is_company_member(company_id) or private.is_super_admin());

create policy custom_reports_insert_members on public.custom_reports
  for insert
  with check (private.is_company_member(company_id) and created_by = (select auth.uid()));

create policy custom_reports_update_owner_or_manager on public.custom_reports
  for update
  using (created_by = (select auth.uid()) or private.is_company_manager(company_id) or private.is_super_admin())
  with check (private.is_company_member(company_id) or private.is_super_admin());

create policy custom_reports_delete_owner_or_manager on public.custom_reports
  for delete
  using (created_by = (select auth.uid()) or private.is_company_manager(company_id) or private.is_super_admin());
