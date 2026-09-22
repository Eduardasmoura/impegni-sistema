-- Campanhas por data comemorativa (Dia das Mães, Dia do Amigo, Natal...) e
-- campanhas personalizadas. `campaign_rules` continua sendo só das campanhas
-- automáticas (aniversário/recuperação — 1 por empresa, usada também pelo
-- app mobile via upsert por (company_id, type)); esta tabela permite VÁRIAS
-- campanhas por empresa, então não cabe naquela unicidade.
-- Continua sem envio automático: guarda a intenção, a mensagem e o período.
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  occasion text not null check (occasion in (
    'dia_das_maes','dia_dos_pais','dia_do_amigo','dia_dos_namorados',
    'dia_da_mulher','dia_do_cliente','natal','black_friday','personalizada')),
  name text not null check (length(trim(name)) > 0),
  message_template text,
  starts_on date,
  ends_on date,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_period_check check (starts_on is null or ends_on is null or ends_on >= starts_on)
);
create index campaigns_company_idx on public.campaigns (company_id, created_at desc);

create trigger campaigns_set_updated_at before update on public.campaigns
  for each row execute function private.set_updated_at();
create trigger enforce_company_access before insert or update on public.campaigns
  for each row execute function private.enforce_company_access();

alter table public.campaigns enable row level security;
create policy campaigns_select_members on public.campaigns
  for select using (private.is_company_member(company_id) or private.is_super_admin());
create policy campaigns_write_managers_or_admin on public.campaigns
  for all using (coalesce(private.is_company_manager(company_id), false) or private.is_super_admin())
  with check (coalesce(private.is_company_manager(company_id), false) or private.is_super_admin());
