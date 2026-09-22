-- BLOCKER 1 (cont.) — fechar dois furos do paywall no backend:
--
-- 1) A tabela `companies` não tinha o gatilho enforce_company_access
--    (que 21 tabelas operacionais já têm). Um dono com trial vencido
--    ainda conseguia editar a empresa (nome, whatsapp, cores, horário…)
--    direto pela API. Agora UPDATE em companies também exige acesso —
--    super admin e o INSERT do onboarding seguem livres.
--
-- 2) book_appointment ganha uma checagem de acesso explícita e amigável
--    ANTES de qualquer trabalho (o gatilho de appointments já barrava a
--    reserva, mas com mensagem genérica de "acesso bloqueado" — ruim pra
--    quem está do lado cliente tentando agendar).

create or replace function private.enforce_company_access_on_company()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- Contextos de sistema (webhook de pagamento, service_role, migrations)
  -- e super admin nunca são barrados — o bloqueio é do usuário final.
  if auth.uid() is null or private.is_super_admin() then
    return new;
  end if;
  if not private.company_has_access(new.id) then
    raise exception 'Acesso bloqueado: período de teste encerrado ou assinatura inativa. Escolha um plano para continuar.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_company_access_on_company on public.companies;
create trigger enforce_company_access_on_company
  before update on public.companies
  for each row execute function private.enforce_company_access_on_company();


-- book_appointment com guard de acesso ----------------------------------
CREATE OR REPLACE FUNCTION public.book_appointment(p_company_id uuid, p_client_id uuid, p_professional_id uuid, p_service_id uuid, p_scheduled_at timestamp with time zone, p_payment_method text DEFAULT NULL::text, p_coupon_code text DEFAULT NULL::text, p_client_package_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(appointment_id uuid, payment_id uuid, price numeric, duration_min integer, discount_amount numeric, final_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  service_row public.services;
  is_staff boolean;
  is_authorized boolean;
  new_appointment public.appointments;
  new_payment public.payments;
  coupon_row public.coupons;
  v_check record;
  v_discount numeric := 0;
  v_final numeric;
  v_method text;
begin
  is_staff := private.is_company_member(p_company_id);
  is_authorized := is_staff or exists (
    select 1 from public.clients c where c.id = p_client_id and c.user_id = auth.uid()
  );
  if not is_authorized then
    raise exception 'not authorized to book this appointment';
  end if;

  -- BLOCKER 1: empresa com trial vencido / assinatura inativa não recebe
  -- novos agendamentos (mesma regra do painel). O gatilho de appointments
  -- também barra, isto só antecipa com mensagem clara.
  if not private.company_has_access(p_company_id) then
    raise exception 'Esta empresa não está recebendo novos agendamentos online no momento.'
      using errcode = 'P0001';
  end if;

  select * into service_row from public.services where id = p_service_id;
  if service_row.id is null then
    raise exception 'service % not found', p_service_id;
  end if;

  v_final := service_row.price;
  v_method := p_payment_method;

  if p_client_package_id is not null then
    -- valida que o pacote é do mesmo cliente/empresa antes de resgatar.
    if not exists (select 1 from public.client_packages cp where cp.id = p_client_package_id and cp.client_id = p_client_id and cp.company_id = p_company_id) then
      raise exception 'pacote não encontrado para este cliente';
    end if;
    perform private.redeem_package_session(p_client_package_id, p_service_id);
    v_final := 0;
    v_method := 'package';
  elsif p_coupon_code is not null then
    select * into coupon_row from public.coupons where company_id = p_company_id and lower(code) = lower(p_coupon_code);
    if coupon_row.id is null then
      raise exception 'cupom não encontrado';
    end if;
    select * into v_check from private.compute_coupon_discount(coupon_row.id, p_client_id, p_service_id, p_professional_id, service_row.price);
    if not v_check.valid then
      raise exception '%', v_check.reason;
    end if;
    v_discount := v_check.discount_amount;
    v_final := service_row.price - v_discount;
  end if;

  insert into public.appointments (company_id, client_id, professional_id, service_id, scheduled_at, duration_min, price, origin, created_by)
  values (
    p_company_id, p_client_id, p_professional_id, p_service_id, p_scheduled_at,
    service_row.duration_min, service_row.price,
    case when is_staff then 'staff' else 'client_web' end,
    auth.uid()
  )
  returning * into new_appointment;

  insert into public.payments (company_id, appointment_id, client_id, amount, method, status)
  values (p_company_id, new_appointment.id, p_client_id, v_final, v_method, case when p_client_package_id is not null then 'paid' else 'pending' end)
  returning * into new_payment;

  if coupon_row.id is not null then
    insert into public.coupon_redemptions (coupon_id, company_id, client_id, appointment_id, discount_amount)
    values (coupon_row.id, p_company_id, p_client_id, new_appointment.id, v_discount);
  end if;

  return query select new_appointment.id, new_payment.id, new_appointment.price, new_appointment.duration_min, v_discount, v_final;
end;
$function$;
