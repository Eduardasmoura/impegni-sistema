-- Super Admin — fechamento de pendências (Suporte + Comunicação).
-- As únicas 2 tabelas novas desta etapa: tudo o mais (Central da Empresa,
-- Analytics, Saúde do Sistema) reaproveita tabelas/RPCs já existentes.
-- Histórico de mudança fica em `audit_logs` (já existe) — não duplica
-- uma tabela de eventos paralela.

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opened_by uuid references public.profiles(id),
  subject text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','waiting_company','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index support_tickets_company_idx on public.support_tickets (company_id, status);
create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function private.set_updated_at();

alter table public.support_tickets enable row level security;
create policy support_tickets_all_admin_only on public.support_tickets
  for all using (private.is_super_admin()) with check (private.is_super_admin());

-- Comunicação: registro do que foi preparado/enviado pela Impegni pras
-- empresas. Sem infraestrutura de e-mail/SMS configurada no projeto hoje
-- (confirmado em auditoria anterior), `status` nunca sai de 'draft'
-- automaticamente — só um envio real futuro (quando existir provedor)
-- poderia mudar isso, e mesmo assim via ação explícita, nunca fingida.
create table public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id),
  title text not null,
  message text not null,
  audience_type text not null check (audience_type in ('all','plan','segment','status','company')),
  audience_plan_id uuid references public.plans(id),
  audience_segment_id uuid references public.segments(id),
  audience_status text,
  audience_company_id uuid references public.companies(id),
  status text not null default 'draft' check (status in ('draft','sent','failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index platform_announcements_created_idx on public.platform_announcements (created_at desc);

alter table public.platform_announcements enable row level security;
create policy platform_announcements_all_admin_only on public.platform_announcements
  for all using (private.is_super_admin()) with check (private.is_super_admin());
