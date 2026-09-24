-- Caução (sinal) de agendamento pago DIRETO ao estabelecimento.
--
-- O Impegni não recebe nem movimenta esse dinheiro: só guarda como a empresa
-- quer receber (Pix ou link de pagamento próprio), mostra isso ao cliente no
-- agendamento online e registra o status informado (cliente declarou que
-- pagou → estabelecimento confirma ou recusa). Nada de Asaas aqui.
--
-- Estrutura:
--   * company_deposit_settings — 1 linha por empresa, legível/editável só
--     pelos gestores dela (owner/admin). NÃO fica em companies porque
--     companies é legível por qualquer usuário logado (página pública).
--   * appointment_deposits — 1 caução por agendamento. Tabela própria (e não
--     public.payments) para não misturar com o pagamento do serviço, que
--     alimenta Financeiro/relatórios/comissões, e porque os estados do caução
--     (reported/rejected) não existem em payments.status.
--   * get_booking_deposit — o que o cliente vê (config + valor calculado no
--     servidor a partir do preço do serviço).
--   * book_appointment_with_deposit — reaproveita book_appointment inteiro
--     (preço no servidor, cupom, limite, duplo agendamento) e registra o
--     caução na mesma transação.
--   * review_appointment_deposit — membro da empresa confirma/recusa.
--   * gatilhos: cliente não consegue agendar numa empresa que exige caução
--     sem passar pelo fluxo do caução; cancelar o agendamento cancela o
--     caução ainda não confirmado (sem reembolso automático).

-- ---------------------------------------------------------------------------
-- Configuração por empresa
-- ---------------------------------------------------------------------------
create table if not exists public.company_deposit_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  enabled boolean not null default false,
  percent numeric(5,2) not null default 20,
  method text not null default 'pix',
  pix_key_type text,
  pix_key text,
  pix_receiver_name text,
  pix_qr_code_url text,
  payment_link_url text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_deposit_settings_percent_check check (percent > 0 and percent <= 100),
  constraint company_deposit_settings_method_check check (method in ('pix', 'link')),
  constraint company_deposit_settings_pix_key_type_check check (pix_key_type is null or pix_key_type in ('cpf_cnpj', 'phone', 'email', 'random')),
  constraint company_deposit_settings_pix_key_len check (pix_key is null or char_length(pix_key) <= 140),
  constraint company_deposit_settings_receiver_len check (pix_receiver_name is null or char_length(pix_receiver_name) <= 120),
  constraint company_deposit_settings_qr_url_check check (pix_qr_code_url is null or (pix_qr_code_url ~ '^https://' and char_length(pix_qr_code_url) <= 2048)),
  constraint company_deposit_settings_link_check check (payment_link_url is null or (payment_link_url ~ '^https://[^\s/?#]+\.[^\s]+$' and char_length(payment_link_url) <= 2048)),
  -- Ativo exige a forma escolhida completa.
  constraint company_deposit_settings_complete check (
    not enabled
    or (method = 'pix' and pix_key_type is not null and nullif(btrim(pix_key), '') is not null and nullif(btrim(pix_receiver_name), '') is not null)
    or (method = 'link' and payment_link_url is not null)
  )
);

alter table public.company_deposit_settings enable row level security;
alter table public.company_deposit_settings force row level security;

drop policy if exists company_deposit_settings_select_managers on public.company_deposit_settings;
create policy company_deposit_settings_select_managers on public.company_deposit_settings
  for select to authenticated using (private.is_company_manager(company_id) or private.is_super_admin());

drop policy if exists company_deposit_settings_insert_managers on public.company_deposit_settings;
create policy company_deposit_settings_insert_managers on public.company_deposit_settings
  for insert to authenticated with check (private.is_company_manager(company_id));

drop policy if exists company_deposit_settings_update_managers on public.company_deposit_settings;
create policy company_deposit_settings_update_managers on public.company_deposit_settings
  for update to authenticated
  using (private.is_company_manager(company_id))
  with check (private.is_company_manager(company_id));

revoke all on public.company_deposit_settings from anon;
grant select, insert, update on public.company_deposit_settings to authenticated;

create or replace function private.touch_company_deposit_settings()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists touch_company_deposit_settings on public.company_deposit_settings;
create trigger touch_company_deposit_settings
  before insert or update on public.company_deposit_settings
  for each row execute function private.touch_company_deposit_settings();

drop trigger if exists enforce_company_access on public.company_deposit_settings;
create trigger enforce_company_access
  before insert or update on public.company_deposit_settings
  for each row execute function private.enforce_company_access();

-- ---------------------------------------------------------------------------
-- Caução de cada agendamento
-- ---------------------------------------------------------------------------
create table if not exists public.appointment_deposits (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  amount numeric(10,2) not null,
  percent numeric(5,2) not null,
  method text not null,
  status text not null default 'pending',
  reported_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_deposits_amount_check check (amount >= 0),
  constraint appointment_deposits_method_check check (method in ('pix', 'link')),
  constraint appointment_deposits_status_check check (status in ('pending', 'reported', 'confirmed', 'rejected', 'canceled'))
);

create index if not exists appointment_deposits_company_id_idx on public.appointment_deposits (company_id);
create index if not exists appointment_deposits_client_id_idx on public.appointment_deposits (client_id);

alter table public.appointment_deposits enable row level security;
alter table public.appointment_deposits force row level security;

-- Leitura: membros da empresa, o próprio cliente e super admin. Escrita só
-- pelas funções abaixo (sem policy de insert/update/delete).
drop policy if exists appointment_deposits_select_members_client_or_admin on public.appointment_deposits;
create policy appointment_deposits_select_members_client_or_admin on public.appointment_deposits
  for select to authenticated using (
    private.is_company_member(company_id)
    or exists (select 1 from public.clients c where c.id = appointment_deposits.client_id and c.user_id = (select auth.uid()))
    or private.is_super_admin()
  );

revoke all on public.appointment_deposits from anon;
revoke insert, update, delete on public.appointment_deposits from authenticated;
grant select on public.appointment_deposits to authenticated;

drop trigger if exists set_appointment_deposits_updated_at on public.appointment_deposits;
create trigger set_appointment_deposits_updated_at
  before update on public.appointment_deposits
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- O que o cliente vê no agendamento online
-- ---------------------------------------------------------------------------
create or replace function public.get_booking_deposit(p_company_id uuid, p_service_id uuid)
returns table (
  percent numeric,
  method text,
  pix_key_type text,
  pix_key text,
  pix_receiver_name text,
  pix_qr_code_url text,
  payment_link_url text,
  service_price numeric,
  deposit_amount numeric
)
language sql
stable
security definer
set search_path to ''
as $$
  select s.percent, s.method,
         case when s.method = 'pix' then s.pix_key_type end,
         case when s.method = 'pix' then s.pix_key end,
         case when s.method = 'pix' then s.pix_receiver_name end,
         case when s.method = 'pix' then s.pix_qr_code_url end,
         case when s.method = 'link' then s.payment_link_url end,
         sv.price,
         round(sv.price * s.percent / 100, 2)
  from public.company_deposit_settings s
  join public.companies c on c.id = s.company_id and c.status in ('active', 'trial')
  join public.services sv on sv.id = p_service_id and sv.company_id = s.company_id and sv.active
  where s.company_id = p_company_id
    and s.enabled
    and auth.uid() is not null;
$$;

revoke all on function public.get_booking_deposit(uuid, uuid) from public, anon;
grant execute on function public.get_booking_deposit(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Agendamento com caução (cliente declarou que pagou)
-- ---------------------------------------------------------------------------
create or replace function public.book_appointment_with_deposit(
  p_company_id uuid,
  p_client_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_scheduled_at timestamptz,
  p_deposit_reported boolean,
  p_payment_method text default null,
  p_coupon_code text default null
)
returns table (
  appointment_id uuid,
  payment_id uuid,
  price numeric,
  duration_min integer,
  discount_amount numeric,
  final_amount numeric,
  deposit_id uuid,
  deposit_amount numeric
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_settings public.company_deposit_settings;
  v_booked record;
  v_deposit public.appointment_deposits;
begin
  select * into v_settings from public.company_deposit_settings s where s.company_id = p_company_id and s.enabled;

  if v_settings.company_id is not null and coalesce(p_deposit_reported, false) is not true then
    raise exception 'Confirme que você realizou o pagamento do caução para concluir o agendamento.'
      using errcode = 'P0001';
  end if;

  -- Libera o gatilho require_deposit_for_client_booking só dentro desta
  -- transação (set_config não é exposto pela API).
  perform set_config('impegni.deposit_flow', 'on', true);
  select * into v_booked from public.book_appointment(
    p_company_id, p_client_id, p_professional_id, p_service_id, p_scheduled_at, p_payment_method, p_coupon_code, null
  );
  perform set_config('impegni.deposit_flow', '', true);

  if v_settings.company_id is not null then
    -- Valor sobre o preço real gravado no agendamento (vem de services.price
    -- dentro de book_appointment), nunca de valor enviado pelo navegador.
    insert into public.appointment_deposits (appointment_id, company_id, client_id, amount, percent, method, status, reported_at)
    values (v_booked.appointment_id, p_company_id, p_client_id, round(v_booked.price * v_settings.percent / 100, 2),
            v_settings.percent, v_settings.method, 'reported', now())
    returning * into v_deposit;
  end if;

  return query select v_booked.appointment_id, v_booked.payment_id, v_booked.price, v_booked.duration_min,
                      v_booked.discount_amount, v_booked.final_amount, v_deposit.id, v_deposit.amount;
end;
$$;

revoke all on function public.book_appointment_with_deposit(uuid, uuid, uuid, uuid, timestamptz, boolean, text, text) from public, anon;
grant execute on function public.book_appointment_with_deposit(uuid, uuid, uuid, uuid, timestamptz, boolean, text, text) to authenticated;

-- Cliente (não membro) só cria agendamento numa empresa que exige caução
-- pelo fluxo acima — cobre book_appointment direto e insert direto.
create or replace function private.require_deposit_for_client_booking()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if private.is_company_member(new.company_id) or private.is_super_admin() then
    return new;
  end if;
  if exists (select 1 from public.company_deposit_settings s where s.company_id = new.company_id and s.enabled)
     and coalesce(current_setting('impegni.deposit_flow', true), '') <> 'on' then
    raise exception 'Este estabelecimento exige o caução para confirmar o agendamento. Atualize a página e tente novamente.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists require_deposit_for_client_booking on public.appointments;
create trigger require_deposit_for_client_booking
  before insert on public.appointments
  for each row execute function private.require_deposit_for_client_booking();

-- ---------------------------------------------------------------------------
-- Estabelecimento confirma / recusa
-- ---------------------------------------------------------------------------
create or replace function public.review_appointment_deposit(p_deposit_id uuid, p_status text)
returns public.appointment_deposits
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_deposit public.appointment_deposits;
begin
  if p_status not in ('confirmed', 'rejected') then
    raise exception 'status inválido';
  end if;

  select * into v_deposit from public.appointment_deposits where id = p_deposit_id for update;
  if v_deposit.id is null or not private.is_company_member(v_deposit.company_id) then
    raise exception 'caução não encontrado';
  end if;
  if not private.company_has_access(v_deposit.company_id) then
    raise exception 'Acesso bloqueado: período de teste encerrado ou assinatura inativa. Escolha um plano para continuar.'
      using errcode = 'P0001';
  end if;
  if v_deposit.status = 'canceled' then
    raise exception 'Este caução foi cancelado junto com o agendamento.';
  end if;

  update public.appointment_deposits
  set status = p_status, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_deposit_id
  returning * into v_deposit;

  insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
  values (auth.uid(), v_deposit.company_id, 'deposit.' || p_status, 'appointment_deposits', v_deposit.id,
          jsonb_build_object('appointment_id', v_deposit.appointment_id, 'amount', v_deposit.amount));

  return v_deposit;
end;
$$;

revoke all on function public.review_appointment_deposit(uuid, text) from public, anon;
grant execute on function public.review_appointment_deposit(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cancelamento: só registra status, nenhum reembolso/movimentação. Caução já
-- confirmado continua "confirmed" (o estabelecimento recebeu e decide o que
-- fazer); pendente/informado vira "canceled".
-- ---------------------------------------------------------------------------
create or replace function private.cancel_deposit_on_appointment_cancel()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.appointment_deposits
  set status = 'canceled'
  where appointment_id = new.id and status in ('pending', 'reported');
  return new;
end;
$$;

drop trigger if exists cancel_deposit_on_appointment_cancel on public.appointments;
create trigger cancel_deposit_on_appointment_cancel
  after update of status on public.appointments
  for each row
  when (new.status = 'canceled' and old.status is distinct from 'canceled')
  execute function private.cancel_deposit_on_appointment_cancel();
