-- Notificações no painel: avisos do Super Admin (public.platform_announcements,
-- já existente) passam a ser entregues no painel das empresas destinatárias.
--
-- Modelo de segurança: platform_announcements CONTINUA só-super-admin (RLS
-- intacto) — o painel nunca lê a tabela direto. A entrega é feita por funções
-- SECURITY DEFINER que filtram pelo(s) vínculo(s) ativo(s) do próprio usuário
-- (company_members), então uma empresa nunca vê aviso destinado a outra.
-- "Lido" é por usuário, numa tabela nova e mínima.

create table if not exists public.platform_announcement_reads (
  announcement_id uuid not null references public.platform_announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);
create index if not exists platform_announcement_reads_user_idx on public.platform_announcement_reads (user_id);

alter table public.platform_announcement_reads enable row level security;
alter table public.platform_announcement_reads force row level security;

-- Cada usuário só enxerga as próprias marcações; escrita só pelas funções abaixo.
drop policy if exists platform_announcement_reads_select_own on public.platform_announcement_reads;
create policy platform_announcement_reads_select_own on public.platform_announcement_reads
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.platform_announcement_reads from anon;

-- O aviso está enviado e o público inclui alguma empresa em que o usuário é
-- membro ativo? (todas / empresa / plano atual / segmento / status atual da
-- assinatura — as mesmas opções que a tela Comunicação já oferece).
create or replace function private.announcement_visible_to_user(p_announcement_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from public.platform_announcements a
    join public.company_members m on m.user_id = p_user_id and m.active
    join public.companies c on c.id = m.company_id and c.status <> 'deleted'
    left join lateral (
      select s.plan_id, s.status from public.subscriptions s
      where s.company_id = c.id order by s.created_at desc limit 1
    ) s on true
    where a.id = p_announcement_id
      and a.status = 'sent'
      and (
        a.audience_type = 'all'
        or (a.audience_type = 'company' and a.audience_company_id = c.id)
        or (a.audience_type = 'plan' and a.audience_plan_id = s.plan_id)
        or (a.audience_type = 'segment' and a.audience_segment_id = c.segment_id)
        or (a.audience_type = 'status' and a.audience_status = s.status)
      )
  );
$$;
revoke all on function private.announcement_visible_to_user(uuid, uuid) from public, anon, authenticated;

-- Lista de notificações do usuário logado (mais recentes primeiro).
create or replace function public.get_my_notifications(p_limit integer default 50)
returns table (id uuid, title text, message text, sent_at timestamptz, is_read boolean)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  return query
    select a.id, a.title, a.message, a.sent_at, (r.announcement_id is not null) as is_read
    from public.platform_announcements a
    left join public.platform_announcement_reads r on r.announcement_id = a.id and r.user_id = auth.uid()
    where a.status = 'sent' and private.announcement_visible_to_user(a.id, auth.uid())
    order by a.sent_at desc nulls last
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

-- Quantidade de não lidas (badge do sino).
create or replace function public.get_my_unread_notifications_count()
returns integer
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  return (
    select count(*)::integer
    from public.platform_announcements a
    where a.status = 'sent'
      and private.announcement_visible_to_user(a.id, auth.uid())
      and not exists (select 1 from public.platform_announcement_reads r where r.announcement_id = a.id and r.user_id = auth.uid())
  );
end;
$$;

-- Marca como lida (só se o aviso for de fato destinado ao usuário).
create or replace function public.mark_notification_read(p_announcement_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not private.announcement_visible_to_user(p_announcement_id, auth.uid()) then
    raise exception 'notificação não encontrada';
  end if;
  insert into public.platform_announcement_reads (announcement_id, user_id)
  values (p_announcement_id, auth.uid())
  on conflict do nothing;
end;
$$;

-- Marca todas as visíveis como lidas.
create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.platform_announcement_reads (announcement_id, user_id)
  select a.id, auth.uid() from public.platform_announcements a
  where a.status = 'sent' and private.announcement_visible_to_user(a.id, auth.uid())
  on conflict do nothing;
end;
$$;

revoke all on function public.get_my_notifications(integer) from public, anon;
revoke all on function public.get_my_unread_notifications_count() from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.get_my_notifications(integer) to authenticated;
grant execute on function public.get_my_unread_notifications_count() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
