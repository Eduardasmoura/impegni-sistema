


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "private"."add_creator_as_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.uid() is not null then
    insert into public.company_members (company_id, user_id, role_empresa)
    values (new.id, auth.uid(), 'owner');
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."add_creator_as_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."add_default_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_plan_id uuid;
begin
  if auth.uid() is null then
    return new;
  end if;

  if exists (select 1 from public.subscriptions where company_id = new.id) then
    return new;
  end if;

  select id into v_plan_id from public.plans where active = true order by price_cents asc limit 1;
  if v_plan_id is null then
    return new;
  end if;

  -- BLOCKER #2 (auditoria pré-produção): 5 -> 14 dias, único período oficial do produto.
  insert into public.subscriptions (company_id, plan_id, status, trial_started_at, trial_ends_at)
  values (new.id, v_plan_id, 'trial', now(), now() + interval '14 days');

  return new;
end;
$$;


ALTER FUNCTION "private"."add_default_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."company_has_access"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_company public.companies;
  v_sub public.subscriptions;
begin
  select * into v_company from public.companies where id = p_company_id;
  if v_company.id is null then
    return false;
  end if;

  if v_company.status in ('suspended', 'deleted') then
    return false;
  end if;

  select * into v_sub from public.subscriptions where company_id = p_company_id order by created_at desc limit 1;
  if v_sub.id is null then
    return true;
  end if;

  if v_sub.status = 'trial' and v_sub.trial_ends_at is not null and v_sub.trial_ends_at < now() then
    return false;
  end if;
  -- past_due incluído: pagamento atrasado agora bloqueia igual trial
  -- vencido, sem carência.
  if v_sub.status in ('expired', 'canceled', 'suspended', 'past_due') then
    return false;
  end if;

  return true;
end;
$$;


ALTER FUNCTION "private"."company_has_access"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "private"."company_has_access"("p_company_id" "uuid") IS 'BLOCKER #1 (auditoria pré-produção): fonte única sobre se a empresa pode ESCREVER agora. Usada pelo trigger private.enforce_company_access — não confundir com get_company_access_status (só leitura/UI).';



CREATE OR REPLACE FUNCTION "private"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_plan_id uuid;
  v_plan_enabled boolean;
  v_manual_override boolean;
begin
  if p_feature_key = 'anamnesis' then
    select anamnesis_enabled into v_manual_override from public.companies where id = p_company_id;
  end if;

  select plan_id into v_plan_id
  from public.subscriptions
  where company_id = p_company_id
  order by created_at desc
  limit 1;

  if v_plan_id is not null then
    select enabled into v_plan_enabled
    from public.plan_features
    where plan_id = v_plan_id and feature_key = p_feature_key;
  end if;

  return coalesce(v_manual_override, false) or coalesce(v_plan_enabled, false);
end;
$$;


ALTER FUNCTION "private"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "private"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") IS 'BLOCKER #4 (auditoria pré-produção): gate de recurso por plano. Acesso = override manual (companies.<feature>_enabled, hoje só anamnesis) OU plan_features do plano atual. Usado em RLS/trigger de anamnesis_*.';



CREATE OR REPLACE FUNCTION "private"."company_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select company_id from public.company_members where user_id = auth.uid();
$$;


ALTER FUNCTION "private"."company_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."company_role"("target_company_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select role_empresa from public.company_members
  where company_id = target_company_id and user_id = auth.uid() and active = true;
$$;


ALTER FUNCTION "private"."company_role"("target_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."compose_legacy_address"("p_street" "text", "p_number" "text", "p_neighborhood" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select nullif(trim(both ', ' from concat_ws(', ', concat_ws(' ', p_street, p_number), p_neighborhood)), '');
$$;


ALTER FUNCTION "private"."compose_legacy_address"("p_street" "text", "p_number" "text", "p_neighborhood" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."compute_coupon_discount"("p_coupon_id" "uuid", "p_client_id" "uuid", "p_service_id" "uuid", "p_professional_id" "uuid", "p_service_price" numeric) RETURNS TABLE("valid" boolean, "reason" "text", "discount_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  coupon_row public.coupons;
  v_usage_count integer;
  v_client_usage_count integer;
  v_discount numeric;
begin
  select * into coupon_row from public.coupons where id = p_coupon_id;
  if coupon_row.id is null then
    return query select false, 'cupom não encontrado', 0::numeric;
    return;
  end if;
  if not coupon_row.active then
    return query select false, 'cupom inativo', 0::numeric;
    return;
  end if;
  if coupon_row.starts_at is not null and now() < coupon_row.starts_at then
    return query select false, 'cupom ainda não é válido', 0::numeric;
    return;
  end if;
  if coupon_row.ends_at is not null and now() > coupon_row.ends_at then
    return query select false, 'cupom expirado', 0::numeric;
    return;
  end if;
  if coupon_row.min_value is not null and p_service_price < coupon_row.min_value then
    return query select false, 'valor do serviço abaixo do mínimo exigido pelo cupom', 0::numeric;
    return;
  end if;
  if exists (select 1 from public.coupon_services cs where cs.coupon_id = coupon_row.id)
     and not exists (select 1 from public.coupon_services cs where cs.coupon_id = coupon_row.id and cs.service_id = p_service_id) then
    return query select false, 'cupom não é válido para este serviço', 0::numeric;
    return;
  end if;
  if exists (select 1 from public.coupon_professionals cp where cp.coupon_id = coupon_row.id)
     and not exists (select 1 from public.coupon_professionals cp where cp.coupon_id = coupon_row.id and cp.professional_id = p_professional_id) then
    return query select false, 'cupom não é válido para este profissional', 0::numeric;
    return;
  end if;

  select count(*) into v_usage_count from public.coupon_redemptions where coupon_id = coupon_row.id;
  if coupon_row.usage_limit is not null and v_usage_count >= coupon_row.usage_limit then
    return query select false, 'cupom atingiu o limite de uso', 0::numeric;
    return;
  end if;

  select count(*) into v_client_usage_count from public.coupon_redemptions where coupon_id = coupon_row.id and client_id = p_client_id;
  if coupon_row.per_client_limit is not null and v_client_usage_count >= coupon_row.per_client_limit then
    return query select false, 'você já usou esse cupom o máximo de vezes permitido', 0::numeric;
    return;
  end if;

  if coupon_row.discount_percent is not null then
    v_discount := round(p_service_price * coupon_row.discount_percent / 100, 2);
  else
    v_discount := coupon_row.discount_amount;
  end if;
  v_discount := least(v_discount, p_service_price);
  if coupon_row.max_discount_amount is not null then
    v_discount := least(v_discount, coupon_row.max_discount_amount);
  end if;

  return query select true, null::text, v_discount;
end;
$$;


ALTER FUNCTION "private"."compute_coupon_discount"("p_coupon_id" "uuid", "p_client_id" "uuid", "p_service_id" "uuid", "p_professional_id" "uuid", "p_service_price" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."compute_day_availability"("p_professional_id" "uuid", "p_service_duration_min" integer, "p_day" "date") RETURNS TABLE("slot_start" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with hrs as (
    select * from private.get_professional_hours_for_day(p_professional_id, p_day)
    where has_config and active
  )
  select gs.slot_start
  from hrs h
  cross join lateral generate_series(
    ((p_day::text || ' ' || h.start_time::text)::timestamp at time zone 'America/Sao_Paulo'),
    ((p_day::text || ' ' || h.end_time::text)::timestamp at time zone 'America/Sao_Paulo') - (p_service_duration_min || ' minutes')::interval,
    interval '30 minutes'
  ) as gs(slot_start)
  where gs.slot_start > now()
    and not exists (
      select 1 from public.appointments a
      where a.professional_id = p_professional_id
        and a.status <> 'canceled'
        and tsrange(a.scheduled_at at time zone 'UTC', (a.scheduled_at + a.duration_min * interval '1 minute') at time zone 'UTC', '[)')
            && tsrange(gs.slot_start at time zone 'UTC', (gs.slot_start + p_service_duration_min * interval '1 minute') at time zone 'UTC', '[)')
    )
    and not exists (
      select 1 from public.professional_blocks b
      where b.professional_id = p_professional_id
        and tsrange(b.starts_at at time zone 'UTC', b.ends_at at time zone 'UTC', '[)')
            && tsrange(gs.slot_start at time zone 'UTC', (gs.slot_start + p_service_duration_min * interval '1 minute') at time zone 'UTC', '[)')
    )
  order by gs.slot_start;
$$;


ALTER FUNCTION "private"."compute_day_availability"("p_professional_id" "uuid", "p_service_duration_min" integer, "p_day" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_anamnesis_customization"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_company_id uuid;
begin
  if private.is_super_admin() then
    return coalesce(new, old);
  end if;

  -- Semeadura automática do template padrão (feita pelo sistema, não é
  -- edição do usuário) — ver `seed_default_anamnesis_fields()` abaixo.
  if coalesce(current_setting('app.seeding_anamnesis_defaults', true), 'false') = 'true' then
    return coalesce(new, old);
  end if;

  select f.company_id into v_company_id from public.anamnesis_forms f where f.id = coalesce(new.form_id, old.form_id);

  if not private.company_has_feature(v_company_id, 'anamnesis_customizable') then
    raise exception 'Seu plano usa a ficha de anamnese padrão — faça upgrade para o plano Intermediário para personalizar as perguntas.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "private"."enforce_anamnesis_customization"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_anamnesis_feature"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_company_id uuid;
begin
  if private.is_super_admin() then
    return new;
  end if;

  -- anamnesis_forms/anamnesis_responses têm company_id direto;
  -- anamnesis_fields e anamnesis_response_answers só têm o pai por FK.
  if tg_table_name = 'anamnesis_fields' then
    select f.company_id into v_company_id from public.anamnesis_forms f where f.id = new.form_id;
  elsif tg_table_name = 'anamnesis_response_answers' then
    select r.company_id into v_company_id from public.anamnesis_responses r where r.id = new.response_id;
  else
    v_company_id := new.company_id;
  end if;

  if not private.company_has_feature(v_company_id, 'anamnesis') then
    raise exception 'Anamnese não está disponível no plano atual desta empresa.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_anamnesis_feature"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_client_appointment_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  is_cancel boolean;
  is_reschedule boolean;
begin
  if private.is_company_member(new.company_id) then
    return new;
  end if;

  is_cancel := (
    old.client_id is not distinct from new.client_id
    and old.company_id is not distinct from new.company_id
    and old.professional_id is not distinct from new.professional_id
    and old.service_id is not distinct from new.service_id
    and old.scheduled_at is not distinct from new.scheduled_at
    and old.price is not distinct from new.price
    and new.status = 'canceled'
  );

  is_reschedule := (
    old.client_id is not distinct from new.client_id
    and old.company_id is not distinct from new.company_id
    and old.professional_id is not distinct from new.professional_id
    and old.service_id is not distinct from new.service_id
    and old.price is not distinct from new.price
    and old.status = 'scheduled'
    and new.status = 'scheduled'
    and old.scheduled_at is distinct from new.scheduled_at
  );

  if not (is_cancel or is_reschedule) then
    raise exception 'clients may only cancel or reschedule their own appointment';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_client_appointment_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_client_review_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if private.is_company_manager(new.company_id) or private.is_super_admin() then
    return new;
  end if;

  -- é o cliente dono: só deixa mudar rating/comment/updated_at.
  if new.response is distinct from old.response
     or new.responded_at is distinct from old.responded_at
     or new.status is distinct from old.status
     or new.company_id is distinct from old.company_id
     or new.client_id is distinct from old.client_id
     or new.professional_id is distinct from old.professional_id
     or new.service_id is distinct from old.service_id
     or new.appointment_id is distinct from old.appointment_id then
    raise exception 'cliente só pode alterar nota e comentário da própria avaliação';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_client_review_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_company_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_company_id uuid := coalesce(new.company_id, old.company_id);
begin
  if private.is_super_admin() then
    return new;
  end if;
  if not private.company_has_access(v_company_id) then
    raise exception 'Acesso bloqueado: período de teste encerrado ou assinatura inativa. Escolha um plano para continuar.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_company_access"() OWNER TO "postgres";


COMMENT ON FUNCTION "private"."enforce_company_access"() IS 'BLOCKER #1 (auditoria pré-produção): trigger BEFORE INSERT/UPDATE que bloqueia escrita quando private.company_has_access(company_id) = false. Funciona mesmo dentro de RPCs SECURITY DEFINER (trigger de tabela não é ignorado por SECURITY DEFINER, diferente de RLS).';



CREATE OR REPLACE FUNCTION "private"."enforce_company_access_on_company"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."enforce_company_access_on_company"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_company_access_via_anamnesis_form"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_company_id uuid;
begin
  if private.is_super_admin() then
    return coalesce(new, old);
  end if;

  select f.company_id into v_company_id from public.anamnesis_forms f where f.id = coalesce(new.form_id, old.form_id);

  if not private.company_has_access(v_company_id) then
    raise exception 'Acesso bloqueado: período de teste encerrado ou assinatura inativa. Escolha um plano para continuar.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "private"."enforce_company_access_via_anamnesis_form"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_company_goals_exclusivity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.goal_key = 'nenhuma' then
    if exists (
      select 1 from public.company_goals
      where company_id = new.company_id and goal_key <> 'nenhuma'
    ) then
      raise exception '"Nenhuma das opções acima" não pode ser combinada com outros objetivos.';
    end if;
  else
    if exists (
      select 1 from public.company_goals
      where company_id = new.company_id and goal_key = 'nenhuma'
    ) then
      raise exception '"Nenhuma das opções acima" não pode ser combinada com outros objetivos.';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_company_goals_exclusivity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_company_segment_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_segment_slug text;
begin
  select slug into v_segment_slug from public.segments where id = new.segment_id;
  if v_segment_slug is null then
    raise exception 'segmento inválido';
  end if;

  if v_segment_slug = 'outro' then
    if new.other_segment is null or trim(new.other_segment) = '' then
      raise exception 'Informe o segmento personalizado ao escolher "Outro".';
    end if;
  elsif new.other_segment is not null then
    -- Mesma correção silenciosa que as duas RPCs já fazem (nunca erro
    -- aqui) — evita other_segment órfão preso numa empresa que não é
    -- mais "Outro".
    new.other_segment := null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_company_segment_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_limit_appointments"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  perform private.enforce_plan_limit(new.company_id, 'appointments');
  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_limit_appointments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_limit_clients"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  perform private.enforce_plan_limit(new.company_id, 'clients');
  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_limit_clients"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_limit_company_members"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  perform private.enforce_plan_limit(new.company_id, 'users');
  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_limit_company_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_limit_professionals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  perform private.enforce_plan_limit(new.company_id, 'professionals');
  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_limit_professionals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_loyalty_program_feature"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if private.is_super_admin() then
    return new;
  end if;
  if new.loyalty_program_enabled = true and coalesce(old.loyalty_program_enabled, false) = false then
    if not private.company_has_feature(new.id, 'loyalty_program') then
      raise exception 'Programa de fidelidade não está disponível no plano atual desta empresa.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_loyalty_program_feature"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_plan_limit"("target_company_id" "uuid", "resource" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  active_plan_id uuid;
  max_allowed int;
  current_count int;
  resource_label text;
begin
  select plan_id into active_plan_id
  from public.subscriptions
  where company_id = target_company_id and status in ('trial', 'active', 'past_due')
  order by created_at desc
  limit 1;

  if active_plan_id is null then
    return; -- sem assinatura ativa: não é este o lugar de bloquear (RLS/onboarding cuidam disso)
  end if;

  max_allowed := case resource
    when 'users' then (select max_users from public.plans where id = active_plan_id)
    when 'professionals' then (select max_professionals from public.plans where id = active_plan_id)
    when 'clients' then (select max_clients from public.plans where id = active_plan_id)
    when 'appointments' then (select max_appointments from public.plans where id = active_plan_id)
    else (select limit_value from public.plan_features where plan_id = active_plan_id and feature_key = resource)
  end;

  if max_allowed is null then
    return; -- ilimitado (ou feature sem limite configurado)
  end if;

  current_count := case resource
    when 'users' then (select count(*) from public.company_members where company_id = target_company_id and active = true)
    when 'professionals' then (select count(*) from public.professionals where company_id = target_company_id)
    when 'clients' then (select count(*) from public.clients where company_id = target_company_id)
    when 'appointments' then (
      select count(*) from public.appointments
      where company_id = target_company_id
        and status <> 'canceled'
        and scheduled_at >= date_trunc('month', now())
        and scheduled_at < date_trunc('month', now()) + interval '1 month'
    )
    else 0
  end;

  resource_label := case resource
    when 'users' then 'usuários'
    when 'professionals' then 'profissionais'
    when 'clients' then 'clientes'
    when 'appointments' then 'agendamentos neste mês'
    else resource
  end;

  if current_count >= max_allowed then
    raise exception 'Seu plano atual permite até % %. Faça upgrade para adicionar mais.', max_allowed, resource_label
      using errcode = 'P0001';
  end if;
end;
$$;


ALTER FUNCTION "private"."enforce_plan_limit"("target_company_id" "uuid", "resource" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."expire_trials"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_count integer;
begin
  with expiradas as (
    update public.subscriptions
    set status = 'expired', updated_at = now()
    where status = 'trial'
      and trial_ends_at is not null
      and trial_ends_at < now()
    returning id, company_id
  )
  insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
  select null, company_id, 'subscription.trial_expired_auto', 'subscriptions', id, jsonb_build_object('reason', 'trial_ends_at passed, expired by scheduled job')
  from expiradas;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "private"."expire_trials"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."get_professional_hours_for_day"("p_professional_id" "uuid", "p_day" "date") RETURNS TABLE("has_config" boolean, "active" boolean, "start_time" time without time zone, "end_time" time without time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    (w.professional_id is not null or p.start_time is not null) as has_config,
    coalesce(w.active, p.start_time is not null) as active,
    coalesce(w.start_time, p.start_time) as start_time,
    coalesce(w.end_time, p.end_time) as end_time
  from public.professionals p
  left join public.professional_weekly_hours w
    on w.professional_id = p.id
   and w.weekday = extract(dow from p_day)::smallint
  where p.id = p_professional_id;
$$;


ALTER FUNCTION "private"."get_professional_hours_for_day"("p_professional_id" "uuid", "p_day" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "private"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_company_manager"("target_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(private.company_role(target_company_id) in ('owner', 'admin'), false);
$$;


ALTER FUNCTION "private"."is_company_manager"("target_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_company_member"("target_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id and user_id = auth.uid() and active = true
  );
$$;


ALTER FUNCTION "private"."is_company_member"("target_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role_platform = 'super_admin'
  );
$$;


ALTER FUNCTION "private"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_terminal_subscription_status"("p_status" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select p_status in ('canceled', 'expired');
$$;


ALTER FUNCTION "private"."is_terminal_subscription_status"("p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_appointment_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_secret text;
  v_event text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_appointment_secret';
  if v_secret is null then
    return new;
  end if;

  v_event := case
    when tg_op = 'INSERT' then 'created'
    when old.scheduled_at is distinct from new.scheduled_at then 'rescheduled'
    else 'status_changed'
  end;

  perform net.http_post(
    url := 'https://lcdzrahvhilxvkklulaa.supabase.co/functions/v1/notify-appointment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZHpyYWh2aGlseHZra2x1bGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNTUzMjQsImV4cCI6MjEwMTczMTMyNH0.zIFOny5z29Qi43UDaSoIllTRA5V22E2rIXKFCD0_Yd4',
      'X-Notify-Secret', v_secret
    ),
    body := jsonb_build_object('appointment_id', new.id, 'event', v_event)
  );
  return new;
end;
$$;


ALTER FUNCTION "private"."notify_appointment_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."process_asaas_webhook_event"("p_event_hash" "text", "p_event" "text", "p_payment" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_asaas_subscription_id text := p_payment ->> 'subscription';
  v_asaas_payment_id text := p_payment ->> 'id';
  v_subscription record;
  v_payment record;
  v_new_status text;
  v_payment_status text;
  v_appointment_payment_status text;
  v_log_id uuid;
  v_company_id uuid;
begin
  if p_event is null or (v_asaas_subscription_id is null and v_asaas_payment_id is null) then
    return jsonb_build_object('skipped', 'no event or subscription/payment id in payload');
  end if;

  if exists (select 1 from public.payment_webhook_events where provider = 'asaas' and provider_event_id = p_event_hash) then
    insert into public.payment_webhook_events (provider, provider_event_id, event_type, status, payload, processed_at)
    values ('asaas', p_event_hash || ':dup:' || gen_random_uuid()::text, p_event, 'skipped', p_payment, now());
    return jsonb_build_object('skipped', 'duplicate event', 'event_hash', p_event_hash);
  end if;

  if v_asaas_subscription_id is not null then
    select id, company_id, status into v_subscription
    from public.subscriptions where asaas_subscription_id = v_asaas_subscription_id;

    if v_subscription.id is null then
      insert into public.payment_webhook_events (provider, provider_event_id, event_type, status, payload, processed_at)
      values ('asaas', p_event_hash, p_event, 'skipped', p_payment, now());
      return jsonb_build_object('skipped', 'no local subscription for this asaas_subscription_id');
    end if;

    v_company_id := v_subscription.company_id;

    if v_asaas_payment_id is not null then
      v_payment_status := case p_event
        when 'PAYMENT_CREATED' then 'pending'
        when 'PAYMENT_UPDATED' then 'pending'
        when 'PAYMENT_CONFIRMED' then 'confirmed'
        when 'PAYMENT_RECEIVED' then 'received'
        when 'PAYMENT_OVERDUE' then 'overdue'
        when 'PAYMENT_DELETED' then 'deleted'
        when 'PAYMENT_REFUNDED' then 'refunded'
        else 'pending'
      end;

      insert into public.subscription_payments (
        company_id, subscription_id, asaas_payment_id, asaas_customer_id, value, status,
        billing_type, due_date, payment_date, last_event, raw_payload, updated_at
      ) values (
        v_company_id, v_subscription.id, v_asaas_payment_id, p_payment ->> 'customer',
        coalesce((p_payment ->> 'value')::numeric, 0), v_payment_status, p_payment ->> 'billingType',
        nullif(p_payment ->> 'dueDate', '')::date,
        case when p_payment ->> 'paymentDate' is not null then (p_payment ->> 'paymentDate')::timestamptz else null end,
        p_event, p_payment, now()
      )
      on conflict (asaas_payment_id) do update set
        status = excluded.status, billing_type = excluded.billing_type, payment_date = excluded.payment_date,
        last_event = excluded.last_event, raw_payload = excluded.raw_payload, updated_at = now();
    end if;

    v_new_status := case p_event
      when 'PAYMENT_CONFIRMED' then 'active'
      when 'PAYMENT_RECEIVED' then 'active'
      when 'PAYMENT_OVERDUE' then 'past_due'
      when 'PAYMENT_DELETED' then 'canceled'
      when 'PAYMENT_REFUNDED' then 'canceled'
      when 'SUBSCRIPTION_DELETED' then 'canceled'
      else null
    end;

    if v_new_status is not null then
      if private.is_terminal_subscription_status(v_subscription.status) and v_new_status <> v_subscription.status then
        insert into public.payment_webhook_events (provider, provider_event_id, event_type, company_id, status, payload, processed_at, error_message)
        values ('asaas', p_event_hash, p_event, v_company_id, 'skipped', p_payment, now(),
          format('ignorado: assinatura já está em status terminal (%s), evento pedia %s', v_subscription.status, v_new_status));
        return jsonb_build_object('ok', true, 'flow', 'subscription', 'skipped_terminal_status', v_subscription.status);
      end if;

      update public.subscriptions
      set status = v_new_status, canceled_at = case when v_new_status = 'canceled' then now() else canceled_at end
      where id = v_subscription.id;

      insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
      values (null, v_company_id, 'subscription.asaas_webhook', 'subscriptions', v_subscription.id,
        jsonb_build_object('event', p_event, 'old_status', v_subscription.status, 'new_status', v_new_status, 'asaas_payment_id', v_asaas_payment_id));
    end if;

    insert into public.payment_webhook_events (provider, provider_event_id, event_type, company_id, status, payload, processed_at)
    values ('asaas', p_event_hash, p_event, v_company_id, 'processed', p_payment, now());

    return jsonb_build_object('ok', true, 'flow', 'subscription', 'subscription_status', coalesce(v_new_status, v_subscription.status), 'payment_recorded', v_asaas_payment_id is not null);
  end if;

  if v_asaas_payment_id is not null then
    select id, company_id, status into v_payment from public.payments where asaas_payment_id = v_asaas_payment_id;

    if v_payment.id is null then
      insert into public.payment_webhook_events (provider, provider_event_id, event_type, status, payload, processed_at)
      values ('asaas', p_event_hash, p_event, 'skipped', p_payment, now());
      return jsonb_build_object('skipped', 'no local payment for this asaas_payment_id');
    end if;

    v_appointment_payment_status := case p_event
      when 'PAYMENT_CREATED' then 'pending'
      when 'PAYMENT_UPDATED' then 'pending'
      when 'PAYMENT_CONFIRMED' then 'paid'
      when 'PAYMENT_RECEIVED' then 'paid'
      when 'PAYMENT_OVERDUE' then 'overdue'
      when 'PAYMENT_DELETED' then 'canceled'
      when 'PAYMENT_REFUNDED' then 'refunded'
      when 'PAYMENT_REPROVED_BY_RISK_ANALYSIS' then 'canceled' -- NOVO: recusado na análise de risco
      when 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED' then 'canceled' -- NOVO: captura do cartão falhou
      else null
    end;

    if v_appointment_payment_status is not null then
      update public.payments
      set status = v_appointment_payment_status, asaas_billing_type = p_payment ->> 'billingType'
      where id = v_payment.id;

      insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
      values (null, v_payment.company_id, 'payment.asaas_webhook', 'payments', v_payment.id,
        jsonb_build_object('event', p_event, 'old_status', v_payment.status, 'new_status', v_appointment_payment_status, 'asaas_payment_id', v_asaas_payment_id));
    end if;

    insert into public.payment_webhook_events (provider, provider_event_id, event_type, company_id, status, payload, processed_at)
    values ('asaas', p_event_hash, p_event, v_payment.company_id, 'processed', p_payment, now())
    returning id into v_log_id;

    return jsonb_build_object('ok', true, 'flow', 'appointment_payment', 'payment_status', coalesce(v_appointment_payment_status, v_payment.status));
  end if;

  return jsonb_build_object('skipped', 'unhandled payload shape');
end;
$$;


ALTER FUNCTION "private"."process_asaas_webhook_event"("p_event_hash" "text", "p_event" "text", "p_payment" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."protect_closed_payout_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if old.status in ('closed', 'paid') then
    if new.total_appointments is distinct from old.total_appointments
       or new.total_revenue is distinct from old.total_revenue
       or new.total_commission is distinct from old.total_commission
       or new.period_start is distinct from old.period_start
       or new.period_end is distinct from old.period_end
       or new.professional_id is distinct from old.professional_id
       or new.company_id is distinct from old.company_id then
      raise exception 'período de repasse já fechado — os totais não podem mais ser alterados';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."protect_closed_payout_totals"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."client_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "total_sessions" integer NOT NULL,
    "used_sessions" integer DEFAULT 0 NOT NULL,
    "purchased_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "price_paid" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_packages_price_paid_check" CHECK (("price_paid" >= (0)::numeric)),
    CONSTRAINT "client_packages_total_sessions_check" CHECK (("total_sessions" > 0)),
    CONSTRAINT "client_packages_used_not_exceed" CHECK (("used_sessions" <= "total_sessions")),
    CONSTRAINT "client_packages_used_sessions_check" CHECK (("used_sessions" >= 0))
);


ALTER TABLE "public"."client_packages" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."redeem_package_session"("p_client_package_id" "uuid", "p_service_id" "uuid") RETURNS "public"."client_packages"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_package public.client_packages;
begin
  select * into v_package from public.client_packages where id = p_client_package_id for update;
  if v_package.id is null then
    raise exception 'pacote não encontrado';
  end if;
  if v_package.service_id <> p_service_id then
    raise exception 'este pacote não é válido para o serviço selecionado';
  end if;
  if v_package.expires_at is not null and v_package.expires_at < now() then
    raise exception 'pacote expirado';
  end if;
  if v_package.used_sessions >= v_package.total_sessions then
    raise exception 'pacote sem sessões restantes';
  end if;

  update public.client_packages set used_sessions = used_sessions + 1
    where id = p_client_package_id
    returning * into v_package;

  return v_package;
end;
$$;


ALTER FUNCTION "private"."redeem_package_session"("p_client_package_id" "uuid", "p_service_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."request_ip"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_headers json;
  v_xff text;
begin
  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  if v_headers is null then
    return null;
  end if;
  v_xff := v_headers ->> 'x-forwarded-for';
  if v_xff is null or trim(v_xff) = '' then
    return null;
  end if;
  return trim(split_part(v_xff, ',', 1));
end;
$$;


ALTER FUNCTION "private"."request_ip"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."seed_default_anamnesis_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if private.company_has_feature(new.company_id, 'anamnesis')
     and not private.company_has_feature(new.company_id, 'anamnesis_customizable') then
    perform set_config('app.seeding_anamnesis_defaults', 'true', true);
    insert into public.anamnesis_fields (form_id, label, field_type, options, required, sort_order) values
      (new.id, 'Possui alguma alergia conhecida?', 'single_choice', '["Sim","Não"]'::jsonb, true, 0),
      (new.id, 'Está tomando algum medicamento atualmente?', 'text', null, false, 1),
      (new.id, 'Já realizou tratamento químico recente (coloração, alisamento, etc.)?', 'single_choice', '["Sim","Não"]'::jsonb, false, 2),
      (new.id, 'Possui alguma condição de pele ou couro cabeludo?', 'text', null, false, 3),
      (new.id, 'Observações adicionais', 'textarea', null, false, 4);
    perform set_config('app.seeding_anamnesis_defaults', 'false', true);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."seed_default_anamnesis_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "private"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_appointment_tenant_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  service_row public.services;
  professional_row public.professionals;
begin
  select * into service_row from public.services where id = new.service_id;
  if service_row.id is null then
    raise exception 'service % not found', new.service_id;
  end if;
  if service_row.company_id is distinct from new.company_id then
    raise exception 'service does not belong to the target company';
  end if;

  select * into professional_row from public.professionals where id = new.professional_id;
  if professional_row.id is null then
    raise exception 'professional % not found', new.professional_id;
  end if;
  if professional_row.company_id is distinct from new.company_id then
    raise exception 'professional does not belong to the target company';
  end if;

  -- price/duration_min só são confiáveis vindos do banco, nunca do client —
  -- só recalcula na criação (INSERT); em UPDATE, staff pode legitimamente
  -- ajustar o preço manualmente (desconto etc.), então não mexemos nisso
  -- fora da criação — o objetivo aqui é só fechar o vetor de manipulação.
  if tg_op = 'INSERT' then
    new.duration_min := service_row.duration_min;
    new.price := service_row.price;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."validate_appointment_tenant_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_appointment_time_off_conflict"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.status = 'canceled' then
    return new;
  end if;

  if exists (
    select 1 from public.professional_blocks b
    where b.professional_id = new.professional_id
      and tsrange(b.starts_at at time zone 'UTC', b.ends_at at time zone 'UTC', '[)')
          && tsrange(
               new.scheduled_at at time zone 'UTC',
               (new.scheduled_at + new.duration_min * interval '1 minute') at time zone 'UTC',
               '[)'
             )
  ) then
    raise exception 'professional is unavailable during this time range (blocked)';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."validate_appointment_time_off_conflict"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_appointment_working_hours"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  hours record;
  local_start timestamp;
  local_end timestamp;
begin
  local_start := new.scheduled_at at time zone 'America/Sao_Paulo';
  local_end := (new.scheduled_at + new.duration_min * interval '1 minute') at time zone 'America/Sao_Paulo';

  select * into hours from private.get_professional_hours_for_day(new.professional_id, local_start::date);

  -- profissional sem expediente configurado (nem semanal, nem legado):
  -- nada a validar — mesmo comportamento de sempre.
  if not hours.has_config then
    return new;
  end if;

  if local_start::date <> local_end::date then
    raise exception 'appointment crosses midnight, which is not supported';
  end if;

  if not hours.active then
    raise exception 'professional is not available on this day (day off)';
  end if;

  if local_start::time < hours.start_time or local_end::time > hours.end_time then
    raise exception 'appointment is outside professional working hours (% - %)', hours.start_time, hours.end_time;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."validate_appointment_working_hours"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_block_tenant_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  professional_row public.professionals;
begin
  select * into professional_row from public.professionals where id = new.professional_id;
  if professional_row.id is null then
    raise exception 'professional % not found', new.professional_id;
  end if;
  if professional_row.company_id is distinct from new.company_id then
    raise exception 'professional does not belong to the target company';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."validate_block_tenant_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_weekly_hours_tenant_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1 from public.professionals p
    where p.id = new.professional_id and p.company_id = new.company_id
  ) then
    raise exception 'professional does not belong to the given company';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."validate_weekly_hours_tenant_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."void_pending_payment_on_appointment_cancel"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_payment public.payments;
begin
  select * into v_payment
  from public.payments
  where appointment_id = new.id and status = 'pending'
  limit 1;

  if v_payment.id is not null then
    update public.payments
    set status = 'canceled'
    where id = v_payment.id;

    insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
    values (
      auth.uid(), v_payment.company_id, 'payment.voided_on_appointment_cancel', 'payments', v_payment.id,
      jsonb_build_object('appointment_id', new.id, 'previous_status', 'pending', 'new_status', 'canceled')
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."void_pending_payment_on_appointment_cancel"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'trial'::"text" NOT NULL,
    "current_period_end" timestamp with time zone,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trial_started_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "asaas_subscription_id" "text",
    "asaas_checkout_id" "text",
    "promo_price_cents" integer,
    "promo_ends_at" timestamp with time zone,
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['trial'::"text", 'active'::"text", 'past_due'::"text", 'suspended'::"text", 'canceled'::"text", 'expired'::"text"])))
);

ALTER TABLE ONLY "public"."subscriptions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."subscriptions"."asaas_subscription_id" IS 'ID da assinatura recorrente no Asaas — o Asaas gera a cobrança de cada ciclo sozinho; asaas-webhook atualiza o status aqui a partir dos eventos de pagamento.';



COMMENT ON COLUMN "public"."subscriptions"."asaas_checkout_id" IS 'Id da checkout session do Asaas (POST /checkouts) enquanto o pagamento não é confirmado. asaas_subscription_id só é preenchido depois que o webhook confirma o pagamento — a Asaas Checkout API cria a assinatura recorrente de verdade só nesse momento.';



COMMENT ON COLUMN "public"."subscriptions"."promo_price_cents" IS 'Preço promocional travado pra esta assinatura (centavos). NULL = não está em promoção (nunca esteve, ou os 6 meses já passaram e o valor já foi revertido pelo job expire-subscription-promos).';



COMMENT ON COLUMN "public"."subscriptions"."promo_ends_at" IS 'Quando a janela promocional desta assinatura fecha (6 meses do 1º pagamento confirmado). Setado uma única vez, nunca reiniciado por troca de plano.';



CREATE OR REPLACE FUNCTION "public"."admin_change_plan"("company_id" "uuid", "new_plan_id" "uuid") RETURNS "public"."subscriptions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  existing public.subscriptions;
  result public.subscriptions;
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_change_plan';
  end if;

  select * into existing
  from public.subscriptions
  where subscriptions.company_id = admin_change_plan.company_id
  order by created_at desc
  limit 1;

  if existing.id is not null then
    update public.subscriptions
    set plan_id = new_plan_id, status = 'active'
    where id = existing.id
    returning * into result;
  else
    insert into public.subscriptions (company_id, plan_id, status, trial_started_at, trial_ends_at)
    values (company_id, new_plan_id, 'trial', now(), now() + interval '14 days')
    returning * into result;
  end if;

  insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
  values (auth.uid(), company_id, 'subscription.change_plan', 'subscriptions', result.id, jsonb_build_object('old', to_jsonb(existing), 'new', to_jsonb(result)));

  return result;
end;
$$;


ALTER FUNCTION "public"."admin_change_plan"("company_id" "uuid", "new_plan_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_companies_by_plan"() RETURNS TABLE("plan_id" "uuid", "plan_name" "text", "company_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_companies_by_plan';
  end if;

  return query
  select pl.id, pl.name, count(s.id)::integer
  from public.plans pl
  left join public.subscriptions s on s.plan_id = pl.id and s.status in ('active', 'trial', 'past_due')
  group by pl.id, pl.name
  order by pl.price_cents;
end;
$$;


ALTER FUNCTION "public"."admin_companies_by_plan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_dashboard_summary"("p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("total_companies" integer, "active_companies" integer, "trial_companies" integer, "trial_expired_companies" integer, "suspended_companies" integer, "deleted_companies" integer, "active_subscriptions" integer, "trial_subscriptions" integer, "past_due_subscriptions" integer, "canceled_subscriptions" integer, "expired_subscriptions" integer, "payments_confirmed" integer, "payments_pending" integer, "payments_overdue" integer, "revenue_period" numeric, "mrr" numeric, "new_companies_period" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  range_from timestamptz := coalesce(p_from, now() - interval '30 days');
  range_to timestamptz := coalesce(p_to, now());
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_dashboard_summary';
  end if;

  return query
  select
    (select count(*)::integer from public.companies),
    (select count(*)::integer from public.companies where status = 'active'),
    (select count(*)::integer from public.companies where status = 'trial'),
    (select count(*)::integer from public.subscriptions where status = 'trial' and trial_ends_at < now()),
    (select count(*)::integer from public.companies where status = 'suspended'),
    (select count(*)::integer from public.companies where status = 'deleted'),
    (select count(*)::integer from public.subscriptions where status = 'active'),
    (select count(*)::integer from public.subscriptions where status = 'trial'),
    (select count(*)::integer from public.subscriptions where status = 'past_due'),
    (select count(*)::integer from public.subscriptions where status = 'canceled'),
    (select count(*)::integer from public.subscriptions where status = 'expired'),
    (select count(*)::integer from public.subscription_payments where status in ('confirmed', 'received') and coalesce(payment_date, due_date::timestamptz) between range_from and range_to),
    (select count(*)::integer from public.subscription_payments where status = 'pending'),
    (select count(*)::integer from public.subscription_payments where status = 'overdue'),
    (select coalesce(sum(value), 0) from public.subscription_payments where status in ('confirmed', 'received') and coalesce(payment_date, due_date::timestamptz) between range_from and range_to),
    (select coalesce(sum(case when pl.billing_interval = 'yearly' then pl.price_cents / 12.0 else pl.price_cents end), 0) / 100.0
       from public.subscriptions s join public.plans pl on pl.id = s.plan_id where s.status = 'active'),
    (select count(*)::integer from public.companies where created_at between range_from and range_to);
end;
$$;


ALTER FUNCTION "public"."admin_dashboard_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."impersonation_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "reason" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."impersonation_sessions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_end_impersonation"("session_id" "uuid") RETURNS "public"."impersonation_sessions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  result public.impersonation_sessions;
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_end_impersonation';
  end if;

  update public.impersonation_sessions
  set ended_at = now()
  where id = session_id and ended_at is null
  returning * into result;

  if result.id is null then
    raise exception 'session not found or already ended';
  end if;

  insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
  values (auth.uid(), result.company_id, 'impersonate.end', 'impersonation_sessions', result.id, jsonb_build_object('target_user_id', result.target_user_id));

  return result;
end;
$$;


ALTER FUNCTION "public"."admin_end_impersonation"("session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_companies_owners"("p_company_ids" "uuid"[]) RETURNS TABLE("company_id" "uuid", "full_name" "text", "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_list_companies_owners';
  end if;

  return query
  select distinct on (cm.company_id)
    cm.company_id, p.full_name, u.email::text
  from public.company_members cm
  join auth.users u on u.id = cm.user_id
  left join public.profiles p on p.id = cm.user_id
  where cm.company_id = any(p_company_ids) and cm.role_empresa = 'owner' and cm.active = true
  order by cm.company_id, cm.created_at asc;
end;
$$;


ALTER FUNCTION "public"."admin_list_companies_owners"("p_company_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_company_users"("target_company_id" "uuid") RETURNS TABLE("member_id" "uuid", "user_id" "uuid", "email" "text", "full_name" "text", "phone" "text", "avatar_url" "text", "role_empresa" "text", "active" boolean, "member_created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_list_company_users';
  end if;

  return query
  select
    cm.id, cm.user_id, u.email::text, p.full_name, p.phone,
    p.avatar_url, cm.role_empresa, cm.active, cm.created_at
  from public.company_members cm
  join auth.users u on u.id = cm.user_id
  left join public.profiles p on p.id = cm.user_id
  where cm.company_id = target_company_id
  order by cm.created_at asc;
end;
$$;


ALTER FUNCTION "public"."admin_list_company_users"("target_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_users"("p_search" "text" DEFAULT NULL::"text", "p_company_id" "uuid" DEFAULT NULL::"uuid", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 20) RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "role_platform" "text", "last_sign_in_at" timestamp with time zone, "created_at" timestamp with time zone, "banned" boolean, "memberships" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  offset_val integer := greatest(0, (p_page - 1) * p_page_size);
  safe_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_list_users';
  end if;

  return query
  with base as (
    select
      u.id,
      u.email::text as email,
      p.full_name,
      p.role_platform,
      u.last_sign_in_at,
      u.created_at,
      (u.banned_until is not null and u.banned_until > now()) as banned
    from auth.users u
    left join public.profiles p on p.id = u.id
    where (safe_search is null or u.email ilike '%' || safe_search || '%' or p.full_name ilike '%' || safe_search || '%')
      and (p_company_id is null or exists (
        select 1 from public.company_members cm where cm.user_id = u.id and cm.company_id = p_company_id
      ))
  ),
  mem as (
    select
      cm.user_id,
      jsonb_agg(jsonb_build_object('company_id', c.id, 'company_name', c.name, 'role_empresa', cm.role_empresa, 'active', cm.active, 'member_id', cm.id) order by c.name) as memberships
    from public.company_members cm
    join public.companies c on c.id = cm.company_id
    group by cm.user_id
  ),
  counted as (
    select count(*) over () as total_count, base.*
    from base
  )
  select counted.id, counted.email, counted.full_name, counted.role_platform, counted.last_sign_in_at, counted.created_at, counted.banned,
         coalesce(mem.memberships, '[]'::jsonb), counted.total_count
  from counted
  left join mem on mem.user_id = counted.id
  order by counted.created_at desc
  limit p_page_size offset offset_val;
end;
$$;


ALTER FUNCTION "public"."admin_list_users"("p_search" "text", "p_company_id" "uuid", "p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_empresa" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);

ALTER TABLE ONLY "public"."company_members" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_members" IS 'Which auth users can manage which company (professional side), and at what role.';



CREATE OR REPLACE FUNCTION "public"."admin_set_member_active"("member_id" "uuid", "new_active" boolean) RETURNS "public"."company_members"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  before_row public.company_members;
  result public.company_members;
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_set_member_active';
  end if;

  select * into before_row from public.company_members where id = member_id;
  if before_row.id is null then
    raise exception 'member % not found', member_id;
  end if;

  update public.company_members set active = new_active where id = member_id returning * into result;

  insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
  values (
    auth.uid(), result.company_id,
    case when new_active then 'user.enable_access' else 'user.disable_access' end,
    'company_members', result.id,
    jsonb_build_object('old_active', before_row.active, 'new_active', result.active, 'user_id', result.user_id)
  );

  return result;
end;
$$;


ALTER FUNCTION "public"."admin_set_member_active"("member_id" "uuid", "new_active" boolean) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "whatsapp" "text",
    "address" "text",
    "instagram" "text",
    "logo_url" "text",
    "cover_url" "text",
    "color_primary" "text",
    "color_secondary" "text",
    "color_accent" "text",
    "loyalty_program_enabled" boolean DEFAULT false NOT NULL,
    "whatsapp_reminder_enabled" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'trial'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "anamnesis_enabled" boolean DEFAULT false NOT NULL,
    "business_hours" "text",
    "segment_id" "uuid" NOT NULL,
    "trade_name" "text",
    "document" "text",
    "email" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "asaas_customer_id" "text",
    "business_size" "text",
    "staff_size_range" "text",
    "other_segment" "text",
    "street" "text",
    "neighborhood" "text",
    "address_number" "text",
    "complement" "text",
    CONSTRAINT "companies_business_size_check" CHECK ((("business_size" IS NULL) OR ("business_size" = ANY (ARRAY['unico'::"text", 'rede'::"text", 'franquia'::"text"])))),
    CONSTRAINT "companies_staff_size_range_check" CHECK ((("staff_size_range" IS NULL) OR ("staff_size_range" = ANY (ARRAY['1'::"text", '2'::"text", '3_5'::"text", '6_10'::"text", '11_20'::"text", '21_30'::"text", 'over_30'::"text"])))),
    CONSTRAINT "companies_status_check" CHECK (("status" = ANY (ARRAY['trial'::"text", 'active'::"text", 'suspended'::"text", 'deleted'::"text"])))
);

ALTER TABLE ONLY "public"."companies" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" OWNER TO "postgres";


COMMENT ON TABLE "public"."companies" IS 'Tenant root: one row per business (barbershop/salon).';



COMMENT ON COLUMN "public"."companies"."anamnesis_enabled" IS 'Liberado só pelo super_admin via admin_update_company() — a empresa não pode alterar isto sozinha.';



COMMENT ON COLUMN "public"."companies"."asaas_customer_id" IS 'ID do cliente correspondente no Asaas (cobrança da assinatura do SaaS) — criado pela Edge Function admin-create-company.';



COMMENT ON COLUMN "public"."companies"."business_size" IS 'Porte informado no cadastro do trial: unico | rede | franquia.';



COMMENT ON COLUMN "public"."companies"."staff_size_range" IS 'Faixa de nº de profissionais informada no cadastro do trial (valores padronizados, não texto de exibição).';



COMMENT ON COLUMN "public"."companies"."other_segment" IS 'Preenchido só quando segment_id aponta pro segmento "Outro" (slug=outro).';



COMMENT ON COLUMN "public"."companies"."street" IS 'Rua/logradouro — parte estruturada do endereço, ao lado de `address` (mantido como resumo legível pra quem já lê esse campo).';



CREATE OR REPLACE FUNCTION "public"."admin_update_company"("company_id" "uuid", "new_status" "text" DEFAULT NULL::"text", "new_anamnesis_enabled" boolean DEFAULT NULL::boolean, "new_name" "text" DEFAULT NULL::"text", "new_segment_id" "uuid" DEFAULT NULL::"uuid", "new_trade_name" "text" DEFAULT NULL::"text", "new_document" "text" DEFAULT NULL::"text", "new_email" "text" DEFAULT NULL::"text", "new_phone" "text" DEFAULT NULL::"text", "new_whatsapp" "text" DEFAULT NULL::"text", "new_address" "text" DEFAULT NULL::"text", "new_city" "text" DEFAULT NULL::"text", "new_state" "text" DEFAULT NULL::"text", "new_zip_code" "text" DEFAULT NULL::"text", "new_street" "text" DEFAULT NULL::"text", "new_neighborhood" "text" DEFAULT NULL::"text", "new_address_number" "text" DEFAULT NULL::"text", "new_complement" "text" DEFAULT NULL::"text", "new_other_segment" "text" DEFAULT NULL::"text") RETURNS "public"."companies"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  before_row public.companies;
  updated public.companies;
  v_structured_touched boolean;
  v_street text;
  v_neighborhood text;
  v_address_number text;
  v_complement text;
  v_address text;
  v_final_segment_id uuid;
  v_segment_slug text;
  v_other_segment text;
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_update_company';
  end if;

  if new_status is not null and new_status not in ('trial', 'active', 'suspended', 'deleted') then
    raise exception 'invalid status %', new_status;
  end if;

  select * into before_row from public.companies where id = company_id;
  if before_row.id is null then
    raise exception 'company % not found', company_id;
  end if;

  v_structured_touched := (new_street is not null or new_neighborhood is not null or new_address_number is not null or new_complement is not null);

  v_street := coalesce(new_street, before_row.street);
  v_neighborhood := coalesce(new_neighborhood, before_row.neighborhood);
  v_address_number := coalesce(new_address_number, before_row.address_number);
  v_complement := coalesce(new_complement, before_row.complement);

  v_address := case
    when v_structured_touched then private.compose_legacy_address(v_street, v_address_number, v_neighborhood)
    else coalesce(new_address, before_row.address)
  end;

  -- Mesma regra de complete_company_onboarding: segmento "Outro" exige
  -- other_segment; qualquer outro segmento força other_segment a NULL —
  -- vale tanto quando o admin está trocando o segmento agora quanto
  -- quando só está corrigindo o texto de uma empresa que já era "Outro".
  v_final_segment_id := coalesce(new_segment_id, before_row.segment_id);
  select slug into v_segment_slug from public.segments where id = v_final_segment_id;
  if v_segment_slug is null then
    raise exception 'segmento inválido';
  end if;

  if v_segment_slug = 'outro' then
    v_other_segment := nullif(trim(coalesce(new_other_segment, before_row.other_segment)), '');
    if v_other_segment is null then
      raise exception 'Informe o segmento personalizado ao escolher "Outro".';
    end if;
  else
    v_other_segment := null;
  end if;

  update public.companies
  set
    status = coalesce(new_status, status),
    anamnesis_enabled = coalesce(new_anamnesis_enabled, anamnesis_enabled),
    name = coalesce(new_name, name),
    segment_id = v_final_segment_id,
    other_segment = v_other_segment,
    trade_name = coalesce(new_trade_name, trade_name),
    document = coalesce(new_document, document),
    email = coalesce(new_email, email),
    phone = coalesce(new_phone, phone),
    whatsapp = coalesce(new_whatsapp, whatsapp),
    address = v_address,
    city = coalesce(new_city, city),
    state = coalesce(new_state, state),
    zip_code = coalesce(new_zip_code, zip_code),
    street = v_street,
    neighborhood = v_neighborhood,
    address_number = v_address_number,
    complement = v_complement
  where id = company_id
  returning * into updated;

  insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
  values (auth.uid(), company_id, 'company.update', 'companies', company_id, jsonb_build_object('old', to_jsonb(before_row), 'new', to_jsonb(updated)));

  return updated;
end;
$$;


ALTER FUNCTION "public"."admin_update_company"("company_id" "uuid", "new_status" "text", "new_anamnesis_enabled" boolean, "new_name" "text", "new_segment_id" "uuid", "new_trade_name" "text", "new_document" "text", "new_email" "text", "new_phone" "text", "new_whatsapp" "text", "new_address" "text", "new_city" "text", "new_state" "text", "new_zip_code" "text", "new_street" "text", "new_neighborhood" "text", "new_address_number" "text", "new_complement" "text", "new_other_segment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."book_appointment"("p_company_id" "uuid", "p_client_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_scheduled_at" timestamp with time zone, "p_payment_method" "text" DEFAULT NULL::"text", "p_coupon_code" "text" DEFAULT NULL::"text", "p_client_package_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("appointment_id" "uuid", "payment_id" "uuid", "price" numeric, "duration_min" integer, "discount_amount" numeric, "final_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."book_appointment"("p_company_id" "uuid", "p_client_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_scheduled_at" timestamp with time zone, "p_payment_method" "text", "p_coupon_code" "text", "p_client_package_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_professional_payout"("p_company_id" "uuid", "p_professional_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS TABLE("total_appointments" integer, "total_revenue" numeric, "total_commission" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_authorized boolean;
begin
  v_authorized := coalesce(private.is_company_manager(p_company_id), false) or private.is_super_admin()
    or exists (select 1 from public.professionals p where p.id = p_professional_id and p.user_id = auth.uid());
  if not v_authorized then
    raise exception 'not authorized';
  end if;

  return query
    select
      count(*)::integer as total_appointments,
      coalesce(sum(coalesce(pay.amount, a.price)), 0)::numeric as total_revenue,
      coalesce(sum(
        case
          when pc.commission_type = 'percentage' then round(coalesce(pay.amount, a.price) * pc.commission_value / 100, 2)
          when pc.commission_type = 'fixed' then pc.commission_value
          else 0
        end
      ), 0)::numeric as total_commission
    from public.appointments a
    left join public.payments pay on pay.appointment_id = a.id
    left join lateral (
      select commission_type, commission_value
      from public.professional_commissions pc
      where pc.professional_id = a.professional_id
        and pc.effective_from <= a.scheduled_at
        and (pc.effective_to is null or pc.effective_to > a.scheduled_at)
      order by pc.effective_from desc
      limit 1
    ) pc on true
    where a.company_id = p_company_id
      and a.professional_id = p_professional_id
      and a.status = 'completed'
      and a.scheduled_at >= p_period_start::timestamptz
      and a.scheduled_at < (p_period_end + 1)::timestamptz;
end;
$$;


ALTER FUNCTION "public"."calculate_professional_payout"("p_company_id" "uuid", "p_professional_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payout_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "total_appointments" integer DEFAULT 0 NOT NULL,
    "total_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_commission" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid_at" timestamp with time zone,
    "payment_method" "text",
    "paid_amount" numeric(12,2),
    "notes" "text",
    "closed_at" timestamp with time zone,
    "closed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payout_periods_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'paid'::"text"]))),
    CONSTRAINT "payout_periods_valid_period" CHECK (("period_end" >= "period_start"))
);


ALTER TABLE "public"."payout_periods" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_payout_period"("p_company_id" "uuid", "p_professional_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS "public"."payout_periods"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_calc record;
  v_row public.payout_periods;
begin
  if not (private.is_company_manager(p_company_id) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  select * into v_calc from public.calculate_professional_payout(p_company_id, p_professional_id, p_period_start, p_period_end);

  insert into public.payout_periods (company_id, professional_id, period_start, period_end, status, total_appointments, total_revenue, total_commission, closed_at, closed_by)
  values (p_company_id, p_professional_id, p_period_start, p_period_end, 'closed', v_calc.total_appointments, v_calc.total_revenue, v_calc.total_commission, now(), auth.uid())
  on conflict (company_id, professional_id, period_start, period_end)
  do update set status = 'closed', total_appointments = excluded.total_appointments, total_revenue = excluded.total_revenue, total_commission = excluded.total_commission, closed_at = now(), closed_by = auth.uid()
  where public.payout_periods.status = 'open'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'este período já foi fechado — não é possível recalculá-lo automaticamente';
  end if;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."close_payout_period"("p_company_id" "uuid", "p_professional_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not (private.is_company_member(p_company_id) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;
  return private.company_has_feature(p_company_id, p_feature_key);
end;
$$;


ALTER FUNCTION "public"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_company_onboarding"("p_name" "text", "p_slug" "text", "p_segment_id" "uuid", "p_other_segment" "text" DEFAULT NULL::"text", "p_business_size" "text" DEFAULT NULL::"text", "p_staff_size_range" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_document" "text" DEFAULT NULL::"text", "p_zip_code" "text" DEFAULT NULL::"text", "p_street" "text" DEFAULT NULL::"text", "p_neighborhood" "text" DEFAULT NULL::"text", "p_address_number" "text" DEFAULT NULL::"text", "p_complement" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_state" "text" DEFAULT NULL::"text", "p_goals" "text"[] DEFAULT '{}'::"text"[]) RETURNS "public"."companies"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_existing_company_id uuid;
  v_company public.companies;
  v_goal text;
  v_segment_slug text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select company_id into v_existing_company_id
  from public.company_members
  where user_id = v_uid and active = true
  order by created_at asc
  limit 1;

  if v_existing_company_id is not null then
    select * into v_company from public.companies where id = v_existing_company_id;
    return v_company;
  end if;

  -- BLOCKER 3: aceite do contrato é pré-requisito, verificado aqui e não
  -- só no frontend.
  if not exists (
    select 1 from public.terms_acceptances
    where user_id = v_uid and document_type = 'terms_of_service'
  ) then
    raise exception 'É necessário aceitar o Contrato de Prestação de Serviços e os Termos de Uso para concluir o cadastro.'
      using errcode = 'P0001';
  end if;

  select slug into v_segment_slug from public.segments where id = p_segment_id;
  if v_segment_slug is null then
    raise exception 'segmento inválido';
  end if;

  if v_segment_slug = 'outro' then
    p_other_segment := nullif(trim(p_other_segment), '');
    if p_other_segment is null then
      raise exception 'Informe o segmento personalizado ao escolher "Outro".';
    end if;
  else
    p_other_segment := null;
  end if;

  insert into public.companies (
    name, slug, segment_id, other_segment, business_size, staff_size_range,
    phone, document, zip_code, street, neighborhood, address_number, complement,
    city, state, address
  ) values (
    p_name, p_slug, p_segment_id, p_other_segment, p_business_size, p_staff_size_range,
    p_phone, p_document, p_zip_code, p_street, p_neighborhood, p_address_number, p_complement,
    p_city, p_state, private.compose_legacy_address(p_street, p_address_number, p_neighborhood)
  )
  returning * into v_company;

  foreach v_goal in array coalesce(p_goals, '{}')
  loop
    insert into public.company_goals (company_id, goal_key) values (v_company.id, v_goal)
    on conflict do nothing;
  end loop;

  update public.terms_acceptances
  set company_id = v_company.id
  where user_id = v_uid and company_id is null;

  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is not null then
    delete from public.pending_onboarding where email = v_email;
  end if;

  return v_company;
end;
$$;


ALTER FUNCTION "public"."complete_company_onboarding"("p_name" "text", "p_slug" "text", "p_segment_id" "uuid", "p_other_segment" "text", "p_business_size" "text", "p_staff_size_range" "text", "p_phone" "text", "p_document" "text", "p_zip_code" "text", "p_street" "text", "p_neighborhood" "text", "p_address_number" "text", "p_complement" "text", "p_city" "text", "p_state" "text", "p_goals" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_unique_slug"("base_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  base text;
  candidate text;
  suffix int := 1;
begin
  base := lower(trim(base_name));
  base := translate(
    base,
    'áàâãäéèêëíìîïóòôõöúùûüçñ',
    'aaaaaeeeeiiiiooooouuuucn'
  );
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '(^-+|-+$)', '', 'g');
  if base = '' or base is null then
    base := 'empresa';
  end if;

  candidate := base;
  while exists (select 1 from public.companies where slug = candidate) loop
    suffix := suffix + 1;
    candidate := base || suffix::text;
  end loop;

  return candidate;
end;
$_$;


ALTER FUNCTION "public"."generate_unique_slug"("base_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_availability_day"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_day" "date") RETURNS TABLE("slot_time" time without time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  service_row public.services;
  professional_row public.professionals;
begin
  -- escopo de tenant: serviço e profissional têm que pertencer à MESMA
  -- empresa informada — impede um tenant enxergar agenda de outro mesmo
  -- passando ids válidos de empresas diferentes.
  select * into service_row from public.services where id = p_service_id and company_id = p_company_id and active = true;
  if service_row.id is null then
    raise exception 'service not found for this company';
  end if;

  select * into professional_row from public.professionals where id = p_professional_id and company_id = p_company_id and active = true;
  if professional_row.id is null then
    raise exception 'professional not found for this company';
  end if;

  return query
    select (c.slot_start at time zone 'America/Sao_Paulo')::time as slot_time
    from private.compute_day_availability(p_professional_id, service_row.duration_min, p_day) c
    order by c.slot_start;
end;
$$;


ALTER FUNCTION "public"."get_availability_day"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_day" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_availability_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_month" "date") RETURNS TABLE("day" "date", "available_count" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  service_row public.services;
  professional_row public.professionals;
  first_day date := date_trunc('month', p_month)::date;
  last_day date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  d date;
begin
  select * into service_row from public.services where id = p_service_id and company_id = p_company_id and active = true;
  if service_row.id is null then
    raise exception 'service not found for this company';
  end if;

  select * into professional_row from public.professionals where id = p_professional_id and company_id = p_company_id and active = true;
  if professional_row.id is null then
    raise exception 'professional not found for this company';
  end if;

  d := first_day;
  while d <= last_day loop
    return query
      select d, count(*)::integer
      from private.compute_day_availability(p_professional_id, service_row.duration_min, d);
    d := d + 1;
  end loop;
end;
$$;


ALTER FUNCTION "public"."get_availability_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_birthday_candidates"("p_company_id" "uuid", "p_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "birth_date" "date")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not (coalesce(private.is_company_manager(p_company_id), false) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  return query
    select c.id, c.name, c.phone, c.birth_date
    from public.clients c
    where c.company_id = p_company_id
      and c.birth_date is not null
      and extract(month from c.birth_date) = extract(month from p_date)
      and extract(day from c.birth_date) = extract(day from p_date);
end;
$$;


ALTER FUNCTION "public"."get_birthday_candidates"("p_company_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_birthday_candidates_range"("p_company_id" "uuid", "p_start_date" "date" DEFAULT CURRENT_DATE, "p_days" integer DEFAULT 30) RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "birth_date" "date", "next_birthday" "date", "days_until" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not (coalesce(private.is_company_manager(p_company_id), false) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  return query
    select c.id, c.name, c.phone, c.birth_date, v.next_birthday, (v.next_birthday - p_start_date)::integer
    from public.clients c,
    lateral (
      select case
        when v0.this_year_birthday >= p_start_date then v0.this_year_birthday
        else v1.next_year_birthday
      end as next_birthday
      from (
        select least(
          extract(day from c.birth_date)::int,
          extract(day from (date_trunc('month', make_date(extract(year from p_start_date)::int, extract(month from c.birth_date)::int, 1)) + interval '1 month - 1 day'))::int
        ) as day_this_year
      ) d0,
      lateral (select make_date(extract(year from p_start_date)::int, extract(month from c.birth_date)::int, d0.day_this_year) as this_year_birthday) v0,
      lateral (
        select least(
          extract(day from c.birth_date)::int,
          extract(day from (date_trunc('month', make_date(extract(year from p_start_date)::int + 1, extract(month from c.birth_date)::int, 1)) + interval '1 month - 1 day'))::int
        ) as day_next_year
      ) d1,
      lateral (select make_date(extract(year from p_start_date)::int + 1, extract(month from c.birth_date)::int, d1.day_next_year) as next_year_birthday) v1
    ) v
    where c.company_id = p_company_id
      and c.birth_date is not null
      and v.next_birthday <= p_start_date + (p_days || ' days')::interval
    order by v.next_birthday;
end;
$$;


ALTER FUNCTION "public"."get_birthday_candidates_range"("p_company_id" "uuid", "p_start_date" "date", "p_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_birthday_candidates_range"("p_company_id" "uuid", "p_start_date" "date", "p_days" integer) IS 'Aniversariantes num intervalo (mês atual / próximos N dias) — calcula a próxima ocorrência do aniversário no servidor, tratando virada de ano (ex.: hoje é dezembro, aniversário é em janeiro). Complementa get_birthday_candidates (Fase 4), que só resolve um dia exato.';



CREATE OR REPLACE FUNCTION "public"."get_block_conflicts"("p_company_id" "uuid", "p_professional_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) RETURNS TABLE("appointment_id" "uuid", "scheduled_at" timestamp with time zone, "duration_min" integer, "status" "text", "client_name" "text", "service_name" "text", "service_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not (private.is_company_member(p_company_id) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  return query
  select a.id, a.scheduled_at, a.duration_min, a.status, c.name, s.name, s.id
  from public.appointments a
  join public.clients c on c.id = a.client_id
  join public.services s on s.id = a.service_id
  where a.company_id = p_company_id
    and a.professional_id = p_professional_id
    and a.status <> 'canceled'
    and a.scheduled_at < p_ends_at
    and (a.scheduled_at + (a.duration_min * interval '1 minute')) > p_starts_at
  order by a.scheduled_at;
end;
$$;


ALTER FUNCTION "public"."get_block_conflicts"("p_company_id" "uuid", "p_professional_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_access_status"("p_company_id" "uuid") RETURNS TABLE("allowed" boolean, "reason" "text", "company_status" "text", "subscription_status" "text", "trial_ends_at" timestamp with time zone, "current_period_end" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_caller uuid := auth.uid();
  v_company public.companies;
  v_sub public.subscriptions;
  v_impersonating boolean;
begin
  if not (private.is_company_member(p_company_id) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  select * into v_company from public.companies where id = p_company_id;
  if v_company.id is null then
    return query select false, 'company_not_found'::text, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  if private.is_super_admin() and not exists (
    select 1 from public.company_members where company_id = p_company_id and user_id = v_caller
  ) then
    return query select true, 'super_admin'::text, v_company.status, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  select exists (
    select 1 from public.impersonation_sessions
    where company_id = p_company_id and target_user_id = v_caller and ended_at is null
  ) into v_impersonating;
  if v_impersonating then
    return query select true, 'impersonation_active'::text, v_company.status, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_company.status = 'suspended' then
    return query select false, 'company_suspended'::text, v_company.status, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  if v_company.status = 'deleted' then
    return query select false, 'company_deleted'::text, v_company.status, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  select * into v_sub from public.subscriptions where company_id = p_company_id order by created_at desc limit 1;
  if v_sub.id is null then
    return query select true, 'no_subscription'::text, v_company.status, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_sub.status = 'trial' and v_sub.trial_ends_at is not null and v_sub.trial_ends_at < now() then
    return query select false, 'trial_expired'::text, v_company.status, v_sub.status, v_sub.trial_ends_at, v_sub.current_period_end;
    return;
  end if;
  if v_sub.status = 'expired' then
    return query select false, 'trial_expired'::text, v_company.status, v_sub.status, v_sub.trial_ends_at, v_sub.current_period_end;
    return;
  end if;
  if v_sub.status = 'canceled' then
    return query select false, 'subscription_canceled'::text, v_company.status, v_sub.status, v_sub.trial_ends_at, v_sub.current_period_end;
    return;
  end if;
  if v_sub.status = 'suspended' then
    return query select false, 'subscription_suspended'::text, v_company.status, v_sub.status, v_sub.trial_ends_at, v_sub.current_period_end;
    return;
  end if;
  -- NOVO: pagamento atrasado agora bloqueia, com motivo próprio
  -- ('payment_overdue') pra tela mostrar mensagem específica em vez de
  -- cair no genérico.
  if v_sub.status = 'past_due' then
    return query select false, 'payment_overdue'::text, v_company.status, v_sub.status, v_sub.trial_ends_at, v_sub.current_period_end;
    return;
  end if;

  return query select true, coalesce(v_sub.status, 'active')::text, v_company.status, v_sub.status, v_sub.trial_ends_at, v_sub.current_period_end;
end;
$$;


ALTER FUNCTION "public"."get_company_access_status"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_plan_limits"("p_company_id" "uuid") RETURNS TABLE("max_users" integer, "max_professionals" integer, "max_clients" integer, "max_appointments" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_company_member(p_company_id) and not private.is_super_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select p.max_users, p.max_professionals, p.max_clients, p.max_appointments
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.company_id = p_company_id
    order by s.created_at desc
    limit 1;
end;
$$;


ALTER FUNCTION "public"."get_company_plan_limits"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_rating_summary"("p_company_id" "uuid") RETURNS TABLE("average" numeric, "total" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(round(avg(r.rating), 1), 0)::numeric, count(*)::integer
  from public.reviews r
  join public.companies c on c.id = r.company_id
  where r.company_id = p_company_id
    and r.status = 'published'
    and c.status = 'active';
$$;


ALTER FUNCTION "public"."get_company_rating_summary"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inactive_client_candidates"("p_company_id" "uuid", "p_days_inactive" integer DEFAULT 60) RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "last_appointment_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not (coalesce(private.is_company_manager(p_company_id), false) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  return query
    select c.id, c.name, c.phone, max(a.scheduled_at)
    from public.clients c
    join public.appointments a on a.client_id = c.id and a.status = 'completed'
    where c.company_id = p_company_id
    group by c.id, c.name, c.phone
    having max(a.scheduled_at) < now() - (p_days_inactive || ' days')::interval;
end;
$$;


ALTER FUNCTION "public"."get_inactive_client_candidates"("p_company_id" "uuid", "p_days_inactive" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_inactive_membership"() RETURNS TABLE("company_name" "text", "role_empresa" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
    select c.name, cm.role_empresa
    from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.user_id = auth.uid() and cm.active = false
    order by cm.created_at desc
    limit 1;
end;
$$;


ALTER FUNCTION "public"."get_my_inactive_membership"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_inactive_membership"() IS 'Auditoria ETAPA 2: permite ao usuário logado saber se foi desativado de alguma empresa (pra mostrar mensagem clara em vez de mandar pro onboarding como se nunca tivesse tido empresa). Só revela a PRÓPRIA membership, nunca de terceiros.';



CREATE OR REPLACE FUNCTION "public"."get_new_client_candidates"("p_company_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "first_appointment_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not (coalesce(private.is_company_manager(p_company_id), false) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  return query
    select c.id, c.name, c.phone, min(a.scheduled_at)
    from public.clients c
    join public.appointments a on a.client_id = c.id and a.status = 'completed'
    where c.company_id = p_company_id
    group by c.id, c.name, c.phone
    having min(a.scheduled_at) >= now() - (p_days || ' days')::interval;
end;
$$;


ALTER FUNCTION "public"."get_new_client_candidates"("p_company_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_onboarding"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_email text;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return null;
  end if;
  select payload into v_payload from public.pending_onboarding where email = v_email;
  return v_payload;
end;
$$;


ALTER FUNCTION "public"."get_pending_onboarding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_professional_occupancy_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_month" "date") RETURNS TABLE("day" "date", "capacity_min" integer, "occupied_min" integer, "appointment_count" integer, "occupancy_pct" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare professional_row public.professionals;
  first_day date := date_trunc('month', p_month)::date;
  last_day date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
begin
  if not (private.is_company_member(p_company_id) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;
  select * into professional_row from public.professionals where id = p_professional_id and company_id = p_company_id;
  if professional_row.id is null then raise exception 'professional not found for this company'; end if;

  return query
  with dias as (select gs::date as day from generate_series(first_day, last_day, interval '1 day') gs),
  capacidade as (
    select dd.day,
      case when not h.has_config or not h.active then 0
      else greatest(0,
        (extract(epoch from (h.end_time - h.start_time)) / 60)::integer
        - coalesce((
            select sum((extract(epoch from (
              least(b.ends_at, (dd.day + h.end_time) at time zone 'America/Sao_Paulo')
              - greatest(b.starts_at, (dd.day + h.start_time) at time zone 'America/Sao_Paulo')
            )) / 60)::integer)::integer
            from public.professional_blocks b
            where b.professional_id = p_professional_id
              and b.starts_at < (dd.day + h.end_time) at time zone 'America/Sao_Paulo'
              and b.ends_at   > (dd.day + h.start_time) at time zone 'America/Sao_Paulo'
          ), 0))
      end as capacity_min
    from dias dd
    cross join lateral private.get_professional_hours_for_day(p_professional_id, dd.day) h
  ),
  ocupacao as (
    select (a.scheduled_at at time zone 'America/Sao_Paulo')::date as ap_day,
      count(*)::integer as appointment_count, sum(a.duration_min)::integer as occupied_min
    from public.appointments a
    where a.professional_id = p_professional_id and a.company_id = p_company_id
      and a.status <> 'canceled'
      and a.scheduled_at >= (first_day::timestamp at time zone 'America/Sao_Paulo')
      and a.scheduled_at <  ((last_day + 1)::timestamp at time zone 'America/Sao_Paulo')
    group by 1
  )
  select c.day, c.capacity_min, coalesce(o.occupied_min,0)::integer, coalesce(o.appointment_count,0)::integer,
    case when c.capacity_min > 0 then round(coalesce(o.occupied_min,0)::numeric / c.capacity_min * 100, 1) else 0 end
  from capacidade c left join ocupacao o on o.ap_day = c.day order by c.day;
end;
$$;


ALTER FUNCTION "public"."get_professional_occupancy_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recovery_candidates"("p_company_id" "uuid", "p_days_since_last" integer DEFAULT 90) RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "last_appointment_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not (coalesce(private.is_company_manager(p_company_id), false) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  return query select * from public.get_inactive_client_candidates(p_company_id, p_days_since_last);
end;
$$;


ALTER FUNCTION "public"."get_recovery_candidates"("p_company_id" "uuid", "p_days_since_last" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recurring_client_candidates"("p_company_id" "uuid", "p_min_appointments" integer DEFAULT 3, "p_period_days" integer DEFAULT 90) RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "appointments_count" integer, "last_appointment_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not (coalesce(private.is_company_manager(p_company_id), false) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  return query
    select c.id, c.name, c.phone, count(a.id)::integer, max(a.scheduled_at)
    from public.clients c
    join public.appointments a on a.client_id = c.id and a.status = 'completed'
    where c.company_id = p_company_id
      and a.scheduled_at >= now() - (p_period_days || ' days')::interval
    group by c.id, c.name, c.phone
    having count(a.id) >= p_min_appointments;
end;
$$;


ALTER FUNCTION "public"."get_recurring_client_candidates"("p_company_id" "uuid", "p_min_appointments" integer, "p_period_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_company_clients"("p_company_id" "uuid", "p_search" "text" DEFAULT NULL::"text", "p_filter" "text" DEFAULT 'all'::"text", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 25) RETURNS TABLE("id" "uuid", "name" "text", "phone" "text", "email" "text", "notes" "text", "birth_date" "date", "user_id" "uuid", "active" boolean, "created_at" timestamp with time zone, "last_appointment_at" timestamp with time zone, "next_appointment_at" timestamp with time zone, "has_anamnesis" boolean, "total_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  offset_val integer := greatest(0, (p_page - 1) * greatest(1, p_page_size));
  safe_page_size integer := least(100, greatest(1, p_page_size));
  safe_search text := nullif(trim(coalesce(p_search, '')), '');
  safe_filter text := coalesce(nullif(trim(p_filter), ''), 'all');
begin
  if not private.is_company_member(p_company_id) then
    raise exception 'not authorized';
  end if;

  return query
  with base as (
    select
      c.id, c.name, c.phone, c.email, c.notes, c.birth_date, c.user_id, c.active, c.created_at,
      (select max(a.scheduled_at) from public.appointments a
        where a.client_id = c.id and a.status = 'completed') as last_appointment_at,
      (select min(a.scheduled_at) from public.appointments a
        where a.client_id = c.id and a.status = 'scheduled' and a.scheduled_at > now()) as next_appointment_at,
      exists (select 1 from public.anamnesis_responses r where r.client_id = c.id) as has_anamnesis
    from public.clients c
    where c.company_id = p_company_id
      and (
        safe_search is null
        or c.name ilike '%' || safe_search || '%'
        or c.phone ilike '%' || safe_search || '%'
        or c.email ilike '%' || safe_search || '%'
      )
  ),
  filtered as (
    -- Qualificado com "base." de propósito: RETURNS TABLE cria variáveis
    -- plpgsql com o MESMO nome das colunas de saída (next_appointment_at,
    -- has_anamnesis, active) — sem o prefixo, o Postgres não sabe se é a
    -- variável da função ou a coluna do CTE ("ambiguous", pego no teste
    -- local antes de ir pra produção).
    select * from base
    where case safe_filter
      when 'upcoming' then base.next_appointment_at is not null
      when 'no_upcoming' then base.next_appointment_at is null
      when 'anamnesis_filled' then base.has_anamnesis
      when 'anamnesis_empty' then not base.has_anamnesis
      when 'inactive' then not base.active
      else base.active  -- 'all' (default): só ativos, igual ao comportamento de sempre; inativos só aparecem pedindo o filtro 'inactive'
    end
  ),
  counted as (
    select count(*) over () as total_count, filtered.*
    from filtered
  )
  select counted.id, counted.name, counted.phone, counted.email, counted.notes, counted.birth_date,
         counted.user_id, counted.active, counted.created_at, counted.last_appointment_at,
         counted.next_appointment_at, counted.has_anamnesis, counted.total_count
  from counted
  order by counted.name
  limit safe_page_size offset offset_val;
end;
$$;


ALTER FUNCTION "public"."list_company_clients"("p_company_id" "uuid", "p_search" "text", "p_filter" "text", "p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_payout_paid"("p_payout_period_id" "uuid", "p_paid_at" timestamp with time zone, "p_payment_method" "text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "public"."payout_periods"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_company_id uuid;
  v_row public.payout_periods;
begin
  select company_id into v_company_id from public.payout_periods where id = p_payout_period_id;
  if v_company_id is null then
    raise exception 'período de repasse não encontrado';
  end if;
  if not (private.is_company_manager(v_company_id) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  update public.payout_periods
    set status = 'paid', paid_at = p_paid_at, payment_method = p_payment_method, notes = p_notes, paid_amount = total_commission
    where id = p_payout_period_id and status = 'closed'
    returning * into v_row;

  if v_row.id is null then
    raise exception 'só é possível marcar como pago um período já fechado';
  end if;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."mark_payout_paid"("p_payout_period_id" "uuid", "p_paid_at" timestamp with time zone, "p_payment_method" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_coupon"("p_company_id" "uuid", "p_code" "text", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_service_id" "uuid" DEFAULT NULL::"uuid", "p_professional_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("valid" boolean, "reason" "text", "discount_amount" numeric, "final_amount" numeric, "price" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  coupon_row public.coupons;
  service_row public.services;
  v_check record;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  select * into service_row from public.services where id = p_service_id and company_id = p_company_id;
  if service_row.id is null then
    raise exception 'service % not found', p_service_id;
  end if;

  select * into coupon_row from public.coupons where company_id = p_company_id and lower(code) = lower(p_code);
  if coupon_row.id is null then
    return query select false, 'cupom não encontrado', 0::numeric, service_row.price, service_row.price;
    return;
  end if;

  select * into v_check from private.compute_coupon_discount(coupon_row.id, p_client_id, p_service_id, p_professional_id, service_row.price);
  return query select v_check.valid, v_check.reason, coalesce(v_check.discount_amount, 0), service_row.price - coalesce(v_check.discount_amount, 0), service_row.price;
end;
$$;


ALTER FUNCTION "public"."preview_coupon"("p_company_id" "uuid", "p_code" "text", "p_client_id" "uuid", "p_service_id" "uuid", "p_professional_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_asaas_webhook_event"("p_event_hash" "text", "p_event" "text", "p_payment" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.process_asaas_webhook_event(p_event_hash, p_event, p_payment);
$$;


ALTER FUNCTION "public"."process_asaas_webhook_event"("p_event_hash" "text", "p_event" "text", "p_payment" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_company_is_bookable"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.company_has_access(p_company_id);
$$;


ALTER FUNCTION "public"."public_company_is_bookable"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_directory_companies"() RETURNS SETOF "public"."companies"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select c.*
  from public.companies c
  where c.status in ('active', 'trial')
    and private.company_has_access(c.id)
  order by c.name;
$$;


ALTER FUNCTION "public"."public_directory_companies"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "duration_min" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "payment_method" "text",
    "origin" "text" DEFAULT 'staff'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "appointments_duration_min_check" CHECK (("duration_min" > 0)),
    CONSTRAINT "appointments_origin_check" CHECK (("origin" = ANY (ARRAY['staff'::"text", 'client_web'::"text", 'mobile'::"text"]))),
    CONSTRAINT "appointments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['pix'::"text", 'card'::"text", 'cash'::"text"]))),
    CONSTRAINT "appointments_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text", 'completed'::"text", 'canceled'::"text", 'no_show'::"text"])))
);

ALTER TABLE ONLY "public"."appointments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reschedule_appointment"("p_appointment_id" "uuid", "p_new_scheduled_at" timestamp with time zone) RETURNS "public"."appointments"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_appointment public.appointments;
  v_is_authorized boolean;
  v_result public.appointments;
begin
  select * into v_appointment from public.appointments where id = p_appointment_id;
  if v_appointment.id is null then
    raise exception 'agendamento não encontrado';
  end if;

  v_is_authorized := private.is_company_member(v_appointment.company_id) or exists (
    select 1 from public.clients c where c.id = v_appointment.client_id and c.user_id = auth.uid()
  );
  if not v_is_authorized then
    raise exception 'not authorized';
  end if;

  if v_appointment.status <> 'scheduled' then
    raise exception 'só é possível reagendar um atendimento que ainda está agendado';
  end if;

  update public.appointments set scheduled_at = p_new_scheduled_at
    where id = p_appointment_id returning * into v_result;

  insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
  values (
    auth.uid(), v_result.company_id, 'appointment.rescheduled', 'appointments', v_result.id,
    jsonb_build_object(
      'previous_scheduled_at', v_appointment.scheduled_at,
      'new_scheduled_at', v_result.scheduled_at,
      'client_id', v_result.client_id,
      'professional_id', v_result.professional_id
    )
  );

  return v_result;
end;
$$;


ALTER FUNCTION "public"."reschedule_appointment"("p_appointment_id" "uuid", "p_new_scheduled_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_commissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "commission_type" "text" NOT NULL,
    "commission_value" numeric(10,2) NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "effective_to" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "professional_commissions_commission_type_check" CHECK (("commission_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "professional_commissions_commission_value_check" CHECK (("commission_value" >= (0)::numeric)),
    CONSTRAINT "professional_commissions_percentage_range" CHECK ((("commission_type" <> 'percentage'::"text") OR (("commission_value" >= (0)::numeric) AND ("commission_value" <= (100)::numeric)))),
    CONSTRAINT "professional_commissions_valid_period" CHECK ((("effective_to" IS NULL) OR ("effective_to" > "effective_from")))
);


ALTER TABLE "public"."professional_commissions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_professional_commission"("p_professional_id" "uuid", "p_commission_type" "text", "p_commission_value" numeric) RETURNS "public"."professional_commissions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_company_id uuid;
  v_new public.professional_commissions;
begin
  select company_id into v_company_id from public.professionals where id = p_professional_id;
  if v_company_id is null then
    raise exception 'profissional não encontrado';
  end if;
  if not (private.is_company_manager(v_company_id) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  update public.professional_commissions
    set effective_to = now()
    where professional_id = p_professional_id and effective_to is null;

  insert into public.professional_commissions (professional_id, company_id, commission_type, commission_value, created_by)
  values (p_professional_id, v_company_id, p_commission_type, p_commission_value, auth.uid())
  returning * into v_new;

  return v_new;
end;
$$;


ALTER FUNCTION "public"."set_professional_commission"("p_professional_id" "uuid", "p_commission_type" "text", "p_commission_value" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."stage_pending_onboarding"("p_email" "text", "p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' then
    raise exception 'e-mail inválido';
  end if;
  if p_payload ? 'password' or p_payload ? 'confirmPassword' or p_payload ? 'senha' then
    raise exception 'payload não pode conter senha';
  end if;
  if not exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'nenhum cadastro em andamento para este e-mail';
  end if;

  insert into public.pending_onboarding (email, payload, updated_at)
  values (v_email, p_payload, now())
  on conflict (email) do update set payload = excluded.payload, updated_at = now();
end;
$$;


ALTER FUNCTION "public"."stage_pending_onboarding"("p_email" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."stage_terms_acceptance"("p_email" "text", "p_document_type" "text", "p_document_version" "text", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_email text := lower(trim(p_email));
  v_user_id uuid;
begin
  if v_email is null or v_email = '' then
    raise exception 'e-mail inválido';
  end if;
  if p_document_version is null or trim(p_document_version) = '' then
    raise exception 'versão do documento é obrigatória';
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email;
  if v_user_id is null then
    raise exception 'nenhum cadastro em andamento para este e-mail';
  end if;

  insert into public.terms_acceptances (user_id, document_type, document_version, user_agent, ip_address)
  values (v_user_id, p_document_type, trim(p_document_version), p_user_agent, private.request_ip())
  on conflict (user_id, document_type, document_version) do nothing;
end;
$$;


ALTER FUNCTION "public"."stage_terms_acceptance"("p_email" "text", "p_document_type" "text", "p_document_version" "text", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_anamnesis_response"("p_client_id" "uuid", "p_professional_id" "uuid" DEFAULT NULL::"uuid", "p_appointment_id" "uuid" DEFAULT NULL::"uuid", "p_answers" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_company_id uuid;
  v_form_id uuid;
  v_response_id uuid;
  v_field record;
  v_answer jsonb;
  v_has_answer boolean;
begin
  select company_id into v_company_id from public.clients where id = p_client_id;
  if v_company_id is null then
    raise exception 'cliente não encontrado';
  end if;
  if not (coalesce(private.is_company_member(v_company_id), false) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  select id into v_form_id from public.anamnesis_forms where company_id = v_company_id and active = true;
  if v_form_id is null then
    raise exception 'nenhum formulário de anamnese ativo para esta empresa';
  end if;

  -- valida que toda pergunta obrigatória tem resposta antes de gravar
  -- qualquer coisa — mesma checagem que hoje só existe no frontend.
  for v_field in select id, label from public.anamnesis_fields where form_id = v_form_id and required = true loop
    select exists (
      select 1 from jsonb_array_elements(p_answers) a
      where (a->>'field_id')::uuid = v_field.id
        and a->'value' is not null
        and a->>'value' <> ''
    ) into v_has_answer;
    if not v_has_answer then
      raise exception '"%" é obrigatória', v_field.label;
    end if;
  end loop;

  insert into public.anamnesis_responses (form_id, company_id, client_id, professional_id, appointment_id, created_by)
  values (v_form_id, v_company_id, p_client_id, p_professional_id, p_appointment_id, auth.uid())
  returning id into v_response_id;

  for v_answer in select * from jsonb_array_elements(p_answers) loop
    if v_answer->'value' is not null and v_answer->>'value' <> '' then
      insert into public.anamnesis_response_answers (response_id, field_id, value)
      values (v_response_id, (v_answer->>'field_id')::uuid, v_answer->'value');
    end if;
  end loop;

  return v_response_id;
end;
$$;


ALTER FUNCTION "public"."submit_anamnesis_response"("p_client_id" "uuid", "p_professional_id" "uuid", "p_appointment_id" "uuid", "p_answers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_anamnesis_response_as_client"("p_company_id" "uuid", "p_answers" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_client_id uuid;
  v_form_id uuid;
  v_response_id uuid;
  v_field record;
  v_answer jsonb;
  v_has_answer boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_client_id
  from public.clients
  where company_id = p_company_id and user_id = auth.uid()
  limit 1;
  if v_client_id is null then
    raise exception 'você ainda não é cliente desta empresa';
  end if;

  select id into v_form_id
  from public.anamnesis_forms
  where company_id = p_company_id and active = true;
  if v_form_id is null then
    raise exception 'nenhum formulário de anamnese ativo para esta empresa';
  end if;

  -- toda pergunta obrigatória precisa de resposta antes de gravar qualquer coisa
  for v_field in
    select id, label from public.anamnesis_fields where form_id = v_form_id and required = true
  loop
    select exists (
      select 1 from jsonb_array_elements(p_answers) a
      where (a->>'field_id')::uuid = v_field.id
        and a->'value' is not null
        and a->>'value' <> ''
    ) into v_has_answer;
    if not v_has_answer then
      raise exception '"%" é obrigatória', v_field.label;
    end if;
  end loop;

  insert into public.anamnesis_responses (form_id, company_id, client_id, professional_id, appointment_id, created_by)
  values (v_form_id, p_company_id, v_client_id, null, null, auth.uid())
  returning id into v_response_id;

  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    if v_answer->'value' is not null and v_answer->>'value' <> '' then
      insert into public.anamnesis_response_answers (response_id, field_id, value)
      values (v_response_id, (v_answer->>'field_id')::uuid, v_answer->'value');
    end if;
  end loop;

  return v_response_id;
end;
$$;


ALTER FUNCTION "public"."submit_anamnesis_response_as_client"("p_company_id" "uuid", "p_answers" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anamnesis_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "options" "jsonb",
    "required" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "anamnesis_fields_field_type_check" CHECK (("field_type" = ANY (ARRAY['text'::"text", 'textarea'::"text", 'number'::"text", 'date'::"text", 'boolean'::"text", 'single_choice'::"text", 'multiple_choice'::"text"]))),
    CONSTRAINT "anamnesis_fields_options_only_for_choice" CHECK ((("field_type" = ANY (ARRAY['single_choice'::"text", 'multiple_choice'::"text"])) OR ("options" IS NULL)))
);


ALTER TABLE "public"."anamnesis_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anamnesis_forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'Anamnese'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."anamnesis_forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anamnesis_response_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "response_id" "uuid" NOT NULL,
    "field_id" "uuid" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."anamnesis_response_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anamnesis_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "professional_id" "uuid",
    "appointment_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."anamnesis_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "event" "text" NOT NULL,
    "channel" "text" DEFAULT 'push_professional'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "appointment_notifications_event_check" CHECK (("event" = ANY (ARRAY['created'::"text", 'status_changed'::"text", 'rescheduled'::"text"])))
);


ALTER TABLE "public"."appointment_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "target_table" "text",
    "target_id" "uuid",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid",
    "ip_address" "text",
    "user_agent" "text"
);

ALTER TABLE ONLY "public"."audit_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "days_threshold" integer,
    "message_template" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "campaign_rules_type_check" CHECK (("type" = ANY (ARRAY['birthday'::"text", 'inactive_client'::"text", 'recovery'::"text"])))
);


ALTER TABLE "public"."campaign_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_sends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_rule_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "channel" "text" DEFAULT 'whatsapp'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "scheduled_for" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "campaign_sends_channel_check" CHECK (("channel" = ANY (ARRAY['whatsapp'::"text", 'sms'::"text", 'email'::"text"]))),
    CONSTRAINT "campaign_sends_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."campaign_sends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "birth_date" "date",
    "cpf_cnpj" "text",
    "asaas_customer_id" "text",
    "active" boolean DEFAULT true NOT NULL
);

ALTER TABLE ONLY "public"."clients" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."cpf_cnpj" IS 'CPF/CNPJ do cliente, coletado sob demanda no momento do pagamento online (exigido pelo Asaas pra criar o customer). Não é obrigatório pra cadastro normal de cliente.';



COMMENT ON COLUMN "public"."clients"."active" IS 'Soft-delete (mesmo padrão de professionals.active/services.active). "Excluir cliente" na UI seta false — nunca faz DELETE real, pra não perder histórico via CASCADE. false = cliente inativo/arquivado, mas todo o histórico (agendamentos, anamnese, pacotes) continua intacto e consultável.';



CREATE TABLE IF NOT EXISTS "public"."company_goals" (
    "company_id" "uuid" NOT NULL,
    "goal_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_goals_goal_key_check" CHECK (("goal_key" = ANY (ARRAY['divulgar_servicos'::"text", 'organizar_agenda'::"text", 'agendamento_online'::"text", 'autonomia_clientes'::"text", 'gestao_fiscal'::"text", 'pagamentos_equipe'::"text", 'financeiro'::"text", 'agenda_equipe'::"text", 'fidelizar_clientes'::"text", 'nenhuma'::"text"])))
);

ALTER TABLE ONLY "public"."company_goals" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_goals" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_goals" IS 'Objetivos selecionados no cadastro do trial (seleção múltipla) — uma linha por objetivo marcado.';



CREATE TABLE IF NOT EXISTS "public"."coupon_professionals" (
    "coupon_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL
);


ALTER TABLE "public"."coupon_professionals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "discount_amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coupon_redemptions_discount_amount_check" CHECK (("discount_amount" >= (0)::numeric))
);


ALTER TABLE "public"."coupon_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_services" (
    "coupon_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL
);


ALTER TABLE "public"."coupon_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "discount_percent" numeric(5,2),
    "discount_amount" numeric(10,2),
    "min_value" numeric(10,2),
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "usage_limit" integer,
    "per_client_limit" integer,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "max_discount_amount" numeric(10,2),
    CONSTRAINT "coupons_discount_amount_check" CHECK ((("discount_amount" IS NULL) OR ("discount_amount" > (0)::numeric))),
    CONSTRAINT "coupons_discount_percent_check" CHECK ((("discount_percent" IS NULL) OR (("discount_percent" > (0)::numeric) AND ("discount_percent" <= (100)::numeric)))),
    CONSTRAINT "coupons_exactly_one_discount" CHECK (((("discount_percent" IS NOT NULL) AND ("discount_amount" IS NULL)) OR (("discount_percent" IS NULL) AND ("discount_amount" IS NOT NULL)))),
    CONSTRAINT "coupons_max_discount_amount_check" CHECK ((("max_discount_amount" IS NULL) OR ("max_discount_amount" > (0)::numeric))),
    CONSTRAINT "coupons_min_value_check" CHECK ((("min_value" IS NULL) OR ("min_value" >= (0)::numeric))),
    CONSTRAINT "coupons_per_client_limit_check" CHECK ((("per_client_limit" IS NULL) OR ("per_client_limit" > 0))),
    CONSTRAINT "coupons_usage_limit_check" CHECK ((("usage_limit" IS NULL) OR ("usage_limit" > 0))),
    CONSTRAINT "coupons_valid_period" CHECK ((("ends_at" IS NULL) OR ("starts_at" IS NULL) OR ("ends_at" > "starts_at")))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid",
    "fcm_token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "device_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text"])))
);

ALTER TABLE ONLY "public"."device_tokens" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "category" "text",
    "expense_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "recurring" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "expenses_amount_check" CHECK (("amount" >= (0)::numeric))
);

ALTER TABLE ONLY "public"."expenses" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "professional_id" "uuid",
    "metric" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "target_value" numeric(12,2) NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "goals_metric_check" CHECK (("metric" = ANY (ARRAY['revenue'::"text", 'appointments'::"text"]))),
    CONSTRAINT "goals_target_value_check" CHECK (("target_value" > (0)::numeric)),
    CONSTRAINT "goals_valid_period" CHECK (("period_end" >= "period_start"))
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" DEFAULT 'asaas'::"text" NOT NULL,
    "provider_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "company_id" "uuid",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "payload" "jsonb",
    "error_message" "text",
    CONSTRAINT "payment_webhook_events_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'processed'::"text", 'skipped'::"text", 'error'::"text"])))
);

ALTER TABLE ONLY "public"."payment_webhook_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_webhook_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_webhook_events" IS 'Log + dedup de todo webhook de pagamento recebido. provider_event_id = hash do payload bruto (Asaas não manda ID de entrega estável neste formato).';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "client_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "method" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "asaas_payment_id" "text",
    "asaas_invoice_url" "text",
    "asaas_billing_type" "text",
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payments_method_check" CHECK (("method" = ANY (ARRAY['pix'::"text", 'card'::"text", 'cash'::"text", 'package'::"text", 'online'::"text"]))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'refunded'::"text", 'overdue'::"text", 'canceled'::"text"])))
);

ALTER TABLE ONLY "public"."payments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payments"."asaas_payment_id" IS 'id da cobrança no Asaas (POST /payments) — presente só quando o pagamento foi feito online. Distinto de subscription_payments.asaas_payment_id, que é sobre a assinatura da empresa, não sobre um agendamento.';



CREATE TABLE IF NOT EXISTS "public"."pending_onboarding" (
    "email" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."pending_onboarding" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_onboarding" OWNER TO "postgres";


COMMENT ON TABLE "public"."pending_onboarding" IS 'Rascunho do cadastro de trial entre o signUp e a confirmação de e-mail. NUNCA contém senha (bloqueado em stage_pending_onboarding). Só acessível via stage_pending_onboarding/get_pending_onboarding — sem policy própria de propósito.';



CREATE TABLE IF NOT EXISTS "public"."plan_features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "feature_key" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "limit_value" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."plan_features" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price_cents" integer NOT NULL,
    "billing_interval" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "max_users" integer,
    "max_professionals" integer,
    "max_clients" integer,
    "max_appointments" integer,
    "promo_price_cents" integer,
    "promo_active" boolean DEFAULT false NOT NULL,
    CONSTRAINT "plans_billing_interval_check" CHECK (("billing_interval" = ANY (ARRAY['monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "plans_price_cents_check" CHECK (("price_cents" >= 0))
);

ALTER TABLE ONLY "public"."plans" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" OWNER TO "postgres";


COMMENT ON COLUMN "public"."plans"."promo_price_cents" IS 'Preço promocional atual do plano (centavos). NULL = sem promoção cadastrada.';



COMMENT ON COLUMN "public"."plans"."promo_active" IS 'Liga/desliga a promoção pra NOVOS clientes sem precisar editar código. Quem já está numa promoção mantém o preço travado em subscriptions.promo_price_cents até promo_ends_at, mesmo que isto vire false depois.';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "price" numeric(10,2) NOT NULL,
    "cost_price" numeric(10,2),
    "stock_qty" integer DEFAULT 0 NOT NULL,
    "min_stock_qty" integer DEFAULT 0 NOT NULL,
    "unit" "text" DEFAULT 'un'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_cost_price_check" CHECK (("cost_price" >= (0)::numeric)),
    CONSTRAINT "products_min_stock_qty_check" CHECK (("min_stock_qty" >= 0)),
    CONSTRAINT "products_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "products_stock_qty_check" CHECK (("stock_qty" >= 0))
);

ALTER TABLE ONLY "public"."products" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "reason" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'block'::"text" NOT NULL,
    CONSTRAINT "professional_blocks_type_check" CHECK (("type" = ANY (ARRAY['block'::"text", 'day_off'::"text", 'vacation'::"text"]))),
    CONSTRAINT "professional_blocks_valid_range" CHECK (("ends_at" > "starts_at"))
);

ALTER TABLE ONLY "public"."professional_blocks" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."professional_blocks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."professional_blocks"."type" IS 'Diferenciação de UI: block = bloqueio pontual (ex.: almoço), day_off = folga, vacation = férias. Mesma lógica de disponibilidade pros 3 (starts_at/ends_at).';



CREATE TABLE IF NOT EXISTS "public"."professional_weekly_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "weekday" smallint NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "professional_weekly_hours_valid_range" CHECK ((("active" = false) OR (("start_time" IS NOT NULL) AND ("end_time" IS NOT NULL) AND ("end_time" > "start_time")))),
    CONSTRAINT "professional_weekly_hours_weekday_check" CHECK ((("weekday" >= 0) AND ("weekday" <= 6)))
);

ALTER TABLE ONLY "public"."professional_weekly_hours" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."professional_weekly_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professionals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "role_title" "text",
    "active" boolean DEFAULT true NOT NULL,
    "photo_url" "text",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."professionals" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."professionals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role_platform" "text" DEFAULT 'client'::"text" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_platform_check" CHECK (("role_platform" = ANY (ARRAY['super_admin'::"text", 'professional'::"text", 'client'::"text"])))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Platform-wide profile, one row per auth.users. role_platform only gates super_admin; professional/client access is derived from company_members and clients, not from this column.';



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "comment" "text",
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "response" "text",
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "reviews_status_check" CHECK (("status" = ANY (ARRAY['published'::"text", 'hidden'::"text"])))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."roles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."roles" IS 'Catálogo de papéis (company_members.role_empresa). is_system=true marca papéis que a própria plataforma depende (owner/admin) — não deletar via UI.';



CREATE TABLE IF NOT EXISTS "public"."segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "theme_key" "text" DEFAULT 'soft_purple'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "segments_theme_key_check" CHECK (("theme_key" = ANY (ARRAY['dark_blue'::"text", 'soft_purple'::"text"])))
);

ALTER TABLE ONLY "public"."segments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "duration_min" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "photo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'avulso'::"text" NOT NULL,
    "description" "text",
    CONSTRAINT "services_duration_min_check" CHECK (("duration_min" > 0)),
    CONSTRAINT "services_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "services_type_check" CHECK (("type" = ANY (ARRAY['avulso'::"text", 'pacote'::"text"])))
);

ALTER TABLE ONLY "public"."services" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" OWNER TO "postgres";


COMMENT ON COLUMN "public"."services"."type" IS 'avulso = serviço individual; pacote = combo de vários atendimentos.';



CREATE TABLE IF NOT EXISTS "public"."subscription_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "asaas_payment_id" "text" NOT NULL,
    "asaas_customer_id" "text",
    "value" numeric NOT NULL,
    "status" "text" NOT NULL,
    "billing_type" "text",
    "due_date" "date",
    "payment_date" timestamp with time zone,
    "last_event" "text" NOT NULL,
    "raw_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'received'::"text", 'overdue'::"text", 'refunded'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."subscription_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."terms_acceptances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid",
    "document_type" "text" NOT NULL,
    "document_version" "text" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_agent" "text",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "terms_acceptances_document_type_check" CHECK (("document_type" = 'terms_of_service'::"text"))
);

ALTER TABLE ONLY "public"."terms_acceptances" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."terms_acceptances" OWNER TO "postgres";


COMMENT ON TABLE "public"."terms_acceptances" IS 'Aceite auditável do contrato/termos — 1 linha por versão aceita, nunca sobrescrita. company_id fica NULL até complete_company_onboarding vincular (o aceite acontece antes de a empresa existir). ip_address não é preenchido ainda — requer decisão de política de privacidade + captura server-side confiável, registrado como pendência.';



CREATE TABLE IF NOT EXISTS "public"."waitlist_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "professional_id" "uuid",
    "preferred_date" "date",
    "preferred_period" "text",
    "notes" "text",
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "waitlist_entries_preferred_period_check" CHECK (("preferred_period" = ANY (ARRAY['morning'::"text", 'afternoon'::"text", 'evening'::"text", 'any'::"text"]))),
    CONSTRAINT "waitlist_entries_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'notified'::"text", 'booked'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."waitlist_entries" OWNER TO "postgres";


ALTER TABLE ONLY "public"."anamnesis_fields"
    ADD CONSTRAINT "anamnesis_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anamnesis_forms"
    ADD CONSTRAINT "anamnesis_forms_company_id_unique" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."anamnesis_forms"
    ADD CONSTRAINT "anamnesis_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anamnesis_response_answers"
    ADD CONSTRAINT "anamnesis_response_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anamnesis_responses"
    ADD CONSTRAINT "anamnesis_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_notifications"
    ADD CONSTRAINT "appointment_notifications_appointment_id_event_channel_key" UNIQUE ("appointment_id", "event", "channel");



ALTER TABLE ONLY "public"."appointment_notifications"
    ADD CONSTRAINT "appointment_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_no_overlap" EXCLUDE USING "gist" ("professional_id" WITH =, "tsrange"(("scheduled_at" AT TIME ZONE 'UTC'::"text"), (("scheduled_at" AT TIME ZONE 'UTC'::"text") + (("duration_min")::double precision * '00:01:00'::interval)), '[)'::"text") WITH &&) WHERE (("status" <> 'canceled'::"text"));



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_rules"
    ADD CONSTRAINT "campaign_rules_company_id_type_key" UNIQUE ("company_id", "type");



ALTER TABLE ONLY "public"."campaign_rules"
    ADD CONSTRAINT "campaign_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_sends"
    ADD CONSTRAINT "campaign_sends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_packages"
    ADD CONSTRAINT "client_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_company_id_user_id_key" UNIQUE ("company_id", "user_id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."company_goals"
    ADD CONSTRAINT "company_goals_pkey" PRIMARY KEY ("company_id", "goal_key");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_company_id_user_id_key" UNIQUE ("company_id", "user_id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_professionals"
    ADD CONSTRAINT "coupon_professionals_pkey" PRIMARY KEY ("coupon_id", "professional_id");



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_coupon_id_appointment_id_key" UNIQUE ("coupon_id", "appointment_id");



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_services"
    ADD CONSTRAINT "coupon_services_pkey" PRIMARY KEY ("coupon_id", "service_id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_user_id_fcm_token_key" UNIQUE ("user_id", "fcm_token");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_company_id_key" UNIQUE ("user_id", "company_id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impersonation_sessions"
    ADD CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_webhook_events"
    ADD CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_webhook_events"
    ADD CONSTRAINT "payment_webhook_events_provider_provider_event_id_key" UNIQUE ("provider", "provider_event_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_periods"
    ADD CONSTRAINT "payout_periods_company_id_professional_id_period_start_peri_key" UNIQUE ("company_id", "professional_id", "period_start", "period_end");



ALTER TABLE ONLY "public"."payout_periods"
    ADD CONSTRAINT "payout_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_onboarding"
    ADD CONSTRAINT "pending_onboarding_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."plan_features"
    ADD CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_features"
    ADD CONSTRAINT "plan_features_plan_id_feature_key_key" UNIQUE ("plan_id", "feature_key");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_blocks"
    ADD CONSTRAINT "professional_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_commissions"
    ADD CONSTRAINT "professional_commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_weekly_hours"
    ADD CONSTRAINT "professional_weekly_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_weekly_hours"
    ADD CONSTRAINT "professional_weekly_hours_professional_id_weekday_key" UNIQUE ("professional_id", "weekday");



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_appointment_id_key" UNIQUE ("appointment_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_asaas_payment_id_key" UNIQUE ("asaas_payment_id");



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."terms_acceptances"
    ADD CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."terms_acceptances"
    ADD CONSTRAINT "terms_acceptances_user_id_document_type_document_version_key" UNIQUE ("user_id", "document_type", "document_version");



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id");



CREATE INDEX "anamnesis_fields_form_id_idx" ON "public"."anamnesis_fields" USING "btree" ("form_id");



CREATE INDEX "anamnesis_forms_company_id_idx" ON "public"."anamnesis_forms" USING "btree" ("company_id");



CREATE INDEX "anamnesis_response_answers_field_id_idx" ON "public"."anamnesis_response_answers" USING "btree" ("field_id");



CREATE INDEX "anamnesis_response_answers_response_id_idx" ON "public"."anamnesis_response_answers" USING "btree" ("response_id");



CREATE INDEX "anamnesis_responses_appointment_id_idx" ON "public"."anamnesis_responses" USING "btree" ("appointment_id");



CREATE INDEX "anamnesis_responses_client_id_idx" ON "public"."anamnesis_responses" USING "btree" ("client_id");



CREATE INDEX "anamnesis_responses_company_id_idx" ON "public"."anamnesis_responses" USING "btree" ("company_id");



CREATE INDEX "anamnesis_responses_created_by_idx" ON "public"."anamnesis_responses" USING "btree" ("created_by");



CREATE INDEX "anamnesis_responses_form_id_idx" ON "public"."anamnesis_responses" USING "btree" ("form_id");



CREATE INDEX "anamnesis_responses_professional_id_idx" ON "public"."anamnesis_responses" USING "btree" ("professional_id");



CREATE INDEX "appointment_notifications_appointment_id_idx" ON "public"."appointment_notifications" USING "btree" ("appointment_id");



CREATE INDEX "appointment_notifications_company_id_idx" ON "public"."appointment_notifications" USING "btree" ("company_id");



CREATE INDEX "appointments_client_id_idx" ON "public"."appointments" USING "btree" ("client_id");



CREATE INDEX "appointments_company_scheduled_idx" ON "public"."appointments" USING "btree" ("company_id", "scheduled_at");



CREATE INDEX "appointments_created_by_idx" ON "public"."appointments" USING "btree" ("created_by");



CREATE INDEX "appointments_professional_scheduled_idx" ON "public"."appointments" USING "btree" ("professional_id", "scheduled_at");



CREATE INDEX "appointments_service_id_idx" ON "public"."appointments" USING "btree" ("service_id");



CREATE INDEX "audit_logs_actor_id_idx" ON "public"."audit_logs" USING "btree" ("actor_id");



CREATE INDEX "audit_logs_company_id_idx" ON "public"."audit_logs" USING "btree" ("company_id");



CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "campaign_rules_company_id_idx" ON "public"."campaign_rules" USING "btree" ("company_id");



CREATE INDEX "campaign_sends_client_id_idx" ON "public"."campaign_sends" USING "btree" ("client_id");



CREATE INDEX "campaign_sends_company_id_idx" ON "public"."campaign_sends" USING "btree" ("company_id");



CREATE INDEX "campaign_sends_rule_id_idx" ON "public"."campaign_sends" USING "btree" ("campaign_rule_id");



CREATE INDEX "campaign_sends_status_idx" ON "public"."campaign_sends" USING "btree" ("status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "client_packages_client_id_idx" ON "public"."client_packages" USING "btree" ("client_id");



CREATE INDEX "client_packages_company_id_idx" ON "public"."client_packages" USING "btree" ("company_id");



CREATE INDEX "clients_company_id_idx" ON "public"."clients" USING "btree" ("company_id");



CREATE INDEX "clients_user_id_idx" ON "public"."clients" USING "btree" ("user_id");



CREATE INDEX "companies_segment_id_idx" ON "public"."companies" USING "btree" ("segment_id");



CREATE INDEX "company_members_company_id_idx" ON "public"."company_members" USING "btree" ("company_id");



CREATE INDEX "company_members_role_empresa_idx" ON "public"."company_members" USING "btree" ("role_empresa");



CREATE INDEX "company_members_user_id_idx" ON "public"."company_members" USING "btree" ("user_id");



CREATE INDEX "coupon_professionals_professional_id_idx" ON "public"."coupon_professionals" USING "btree" ("professional_id");



CREATE INDEX "coupon_redemptions_appointment_id_idx" ON "public"."coupon_redemptions" USING "btree" ("appointment_id");



CREATE INDEX "coupon_redemptions_client_id_idx" ON "public"."coupon_redemptions" USING "btree" ("client_id");



CREATE INDEX "coupon_redemptions_company_id_idx" ON "public"."coupon_redemptions" USING "btree" ("company_id");



CREATE INDEX "coupon_redemptions_coupon_id_idx" ON "public"."coupon_redemptions" USING "btree" ("coupon_id");



CREATE INDEX "coupon_services_service_id_idx" ON "public"."coupon_services" USING "btree" ("service_id");



CREATE UNIQUE INDEX "coupons_company_code_unique" ON "public"."coupons" USING "btree" ("company_id", "lower"("code"));



CREATE INDEX "coupons_company_id_idx" ON "public"."coupons" USING "btree" ("company_id");



CREATE INDEX "device_tokens_company_id_idx" ON "public"."device_tokens" USING "btree" ("company_id");



CREATE INDEX "device_tokens_user_id_idx" ON "public"."device_tokens" USING "btree" ("user_id");



CREATE INDEX "expenses_company_id_idx" ON "public"."expenses" USING "btree" ("company_id");



CREATE INDEX "favorites_company_id_idx" ON "public"."favorites" USING "btree" ("company_id");



CREATE INDEX "favorites_user_id_idx" ON "public"."favorites" USING "btree" ("user_id");



CREATE INDEX "goals_company_id_idx" ON "public"."goals" USING "btree" ("company_id");



CREATE INDEX "goals_created_by_idx" ON "public"."goals" USING "btree" ("created_by");



CREATE INDEX "goals_professional_id_idx" ON "public"."goals" USING "btree" ("professional_id");



CREATE INDEX "idx_payment_webhook_events_company_id" ON "public"."payment_webhook_events" USING "btree" ("company_id");



CREATE INDEX "idx_terms_acceptances_company_id" ON "public"."terms_acceptances" USING "btree" ("company_id");



CREATE INDEX "impersonation_sessions_admin_id_idx" ON "public"."impersonation_sessions" USING "btree" ("admin_id");



CREATE INDEX "impersonation_sessions_company_id_idx" ON "public"."impersonation_sessions" USING "btree" ("company_id");



CREATE INDEX "payments_appointment_id_idx" ON "public"."payments" USING "btree" ("appointment_id");



CREATE UNIQUE INDEX "payments_asaas_payment_id_key" ON "public"."payments" USING "btree" ("asaas_payment_id") WHERE ("asaas_payment_id" IS NOT NULL);



CREATE INDEX "payments_client_id_idx" ON "public"."payments" USING "btree" ("client_id");



CREATE INDEX "payments_company_id_idx" ON "public"."payments" USING "btree" ("company_id");



CREATE INDEX "payout_periods_closed_by_idx" ON "public"."payout_periods" USING "btree" ("closed_by");



CREATE INDEX "payout_periods_company_id_idx" ON "public"."payout_periods" USING "btree" ("company_id");



CREATE INDEX "payout_periods_professional_id_idx" ON "public"."payout_periods" USING "btree" ("professional_id");



CREATE INDEX "products_company_id_idx" ON "public"."products" USING "btree" ("company_id");



CREATE INDEX "professional_blocks_company_id_idx" ON "public"."professional_blocks" USING "btree" ("company_id");



CREATE INDEX "professional_blocks_created_by_idx" ON "public"."professional_blocks" USING "btree" ("created_by");



CREATE INDEX "professional_blocks_professional_id_idx" ON "public"."professional_blocks" USING "btree" ("professional_id");



CREATE INDEX "professional_blocks_professional_time_idx" ON "public"."professional_blocks" USING "btree" ("professional_id", "starts_at", "ends_at");



CREATE INDEX "professional_commissions_company_id_idx" ON "public"."professional_commissions" USING "btree" ("company_id");



CREATE INDEX "professional_commissions_created_by_idx" ON "public"."professional_commissions" USING "btree" ("created_by");



CREATE UNIQUE INDEX "professional_commissions_one_open_idx" ON "public"."professional_commissions" USING "btree" ("professional_id") WHERE ("effective_to" IS NULL);



CREATE INDEX "professional_commissions_professional_id_idx" ON "public"."professional_commissions" USING "btree" ("professional_id");



CREATE INDEX "professional_weekly_hours_company_idx" ON "public"."professional_weekly_hours" USING "btree" ("company_id");



CREATE INDEX "professional_weekly_hours_professional_idx" ON "public"."professional_weekly_hours" USING "btree" ("professional_id");



CREATE INDEX "professionals_company_id_idx" ON "public"."professionals" USING "btree" ("company_id");



CREATE INDEX "professionals_user_id_idx" ON "public"."professionals" USING "btree" ("user_id");



CREATE INDEX "reviews_client_id_idx" ON "public"."reviews" USING "btree" ("client_id");



CREATE INDEX "reviews_company_id_idx" ON "public"."reviews" USING "btree" ("company_id");



CREATE INDEX "reviews_professional_id_idx" ON "public"."reviews" USING "btree" ("professional_id");



CREATE INDEX "reviews_service_id_idx" ON "public"."reviews" USING "btree" ("service_id");



CREATE INDEX "services_company_id_idx" ON "public"."services" USING "btree" ("company_id");



CREATE INDEX "subscription_payments_company_id_idx" ON "public"."subscription_payments" USING "btree" ("company_id");



CREATE INDEX "subscription_payments_status_idx" ON "public"."subscription_payments" USING "btree" ("status");



CREATE INDEX "subscription_payments_subscription_id_idx" ON "public"."subscription_payments" USING "btree" ("subscription_id");



CREATE INDEX "subscriptions_company_id_idx" ON "public"."subscriptions" USING "btree" ("company_id");



CREATE INDEX "subscriptions_plan_id_idx" ON "public"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "waitlist_entries_client_id_idx" ON "public"."waitlist_entries" USING "btree" ("client_id");



CREATE INDEX "waitlist_entries_company_id_idx" ON "public"."waitlist_entries" USING "btree" ("company_id");



CREATE INDEX "waitlist_entries_status_idx" ON "public"."waitlist_entries" USING "btree" ("status") WHERE ("status" = 'waiting'::"text");



CREATE OR REPLACE TRIGGER "anamnesis_fields_set_updated_at" BEFORE UPDATE ON "public"."anamnesis_fields" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "anamnesis_forms_set_updated_at" BEFORE UPDATE ON "public"."anamnesis_forms" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "campaign_rules_set_updated_at" BEFORE UPDATE ON "public"."campaign_rules" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "coupons_set_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_anamnesis_customization_trigger" BEFORE INSERT OR DELETE OR UPDATE ON "public"."anamnesis_fields" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_anamnesis_customization"();



CREATE OR REPLACE TRIGGER "enforce_anamnesis_feature" BEFORE INSERT OR UPDATE ON "public"."anamnesis_fields" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_anamnesis_feature"();



CREATE OR REPLACE TRIGGER "enforce_anamnesis_feature" BEFORE INSERT OR UPDATE ON "public"."anamnesis_forms" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_anamnesis_feature"();



CREATE OR REPLACE TRIGGER "enforce_anamnesis_feature" BEFORE INSERT OR UPDATE ON "public"."anamnesis_response_answers" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_anamnesis_feature"();



CREATE OR REPLACE TRIGGER "enforce_anamnesis_feature" BEFORE INSERT OR UPDATE ON "public"."anamnesis_responses" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_anamnesis_feature"();



CREATE OR REPLACE TRIGGER "enforce_client_appointment_update" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_client_appointment_update"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."anamnesis_forms" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."anamnesis_responses" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."campaign_rules" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."client_packages" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."company_members" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."coupon_professionals" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."coupon_services" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."payout_periods" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."professional_blocks" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."professional_commissions" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."professional_weekly_hours" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."professionals" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access" BEFORE INSERT OR UPDATE ON "public"."waitlist_entries" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access"();



CREATE OR REPLACE TRIGGER "enforce_company_access_on_company" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access_on_company"();



CREATE OR REPLACE TRIGGER "enforce_company_access_via_anamnesis_form" BEFORE INSERT OR DELETE OR UPDATE ON "public"."anamnesis_fields" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_access_via_anamnesis_form"();



CREATE OR REPLACE TRIGGER "enforce_company_goals_exclusivity_trigger" BEFORE INSERT ON "public"."company_goals" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_goals_exclusivity"();



CREATE OR REPLACE TRIGGER "enforce_company_segment_consistency_trigger" BEFORE INSERT OR UPDATE OF "segment_id", "other_segment" ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_company_segment_consistency"();



CREATE OR REPLACE TRIGGER "enforce_limit_appointments" BEFORE INSERT ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_limit_appointments"();



CREATE OR REPLACE TRIGGER "enforce_limit_clients" BEFORE INSERT ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_limit_clients"();



CREATE OR REPLACE TRIGGER "enforce_limit_company_members" BEFORE INSERT ON "public"."company_members" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_limit_company_members"();



CREATE OR REPLACE TRIGGER "enforce_limit_professionals" BEFORE INSERT ON "public"."professionals" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_limit_professionals"();



CREATE OR REPLACE TRIGGER "enforce_loyalty_program_feature" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_loyalty_program_feature"();



CREATE OR REPLACE TRIGGER "goals_set_updated_at" BEFORE UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "notify_appointment_change" AFTER INSERT OR UPDATE OF "status", "scheduled_at" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."notify_appointment_change"();



CREATE OR REPLACE TRIGGER "on_company_created" AFTER INSERT ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "private"."add_creator_as_owner"();



CREATE OR REPLACE TRIGGER "on_company_created_default_subscription" AFTER INSERT ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "private"."add_default_subscription"();



CREATE OR REPLACE TRIGGER "payout_periods_protect_closed" BEFORE UPDATE ON "public"."payout_periods" FOR EACH ROW EXECUTE FUNCTION "private"."protect_closed_payout_totals"();



CREATE OR REPLACE TRIGGER "payout_periods_set_updated_at" BEFORE UPDATE ON "public"."payout_periods" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reviews_enforce_client_update" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_client_review_update"();



CREATE OR REPLACE TRIGGER "reviews_set_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "seed_default_anamnesis_fields_trigger" AFTER INSERT ON "public"."anamnesis_forms" FOR EACH ROW EXECUTE FUNCTION "private"."seed_default_anamnesis_fields"();



CREATE OR REPLACE TRIGGER "set_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_professional_weekly_hours_updated_at" BEFORE UPDATE ON "public"."professional_weekly_hours" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_professionals_updated_at" BEFORE UPDATE ON "public"."professionals" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "validate_appointment_tenant_scope" BEFORE INSERT OR UPDATE OF "company_id", "professional_id", "service_id" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."validate_appointment_tenant_scope"();



CREATE OR REPLACE TRIGGER "validate_appointment_time_off_conflict" BEFORE INSERT OR UPDATE OF "scheduled_at", "duration_min", "professional_id", "status" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."validate_appointment_time_off_conflict"();



CREATE OR REPLACE TRIGGER "validate_appointment_working_hours" BEFORE INSERT OR UPDATE OF "scheduled_at", "duration_min", "professional_id" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."validate_appointment_working_hours"();



CREATE OR REPLACE TRIGGER "validate_block_tenant_scope" BEFORE INSERT OR UPDATE OF "company_id", "professional_id" ON "public"."professional_blocks" FOR EACH ROW EXECUTE FUNCTION "private"."validate_block_tenant_scope"();



CREATE OR REPLACE TRIGGER "validate_weekly_hours_tenant_scope" BEFORE INSERT OR UPDATE OF "company_id", "professional_id" ON "public"."professional_weekly_hours" FOR EACH ROW EXECUTE FUNCTION "private"."validate_weekly_hours_tenant_scope"();



CREATE OR REPLACE TRIGGER "void_pending_payment_on_appointment_cancel" AFTER UPDATE OF "status" ON "public"."appointments" FOR EACH ROW WHEN ((("new"."status" = 'canceled'::"text") AND ("old"."status" IS DISTINCT FROM 'canceled'::"text"))) EXECUTE FUNCTION "private"."void_pending_payment_on_appointment_cancel"();



CREATE OR REPLACE TRIGGER "waitlist_entries_set_updated_at" BEFORE UPDATE ON "public"."waitlist_entries" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



ALTER TABLE ONLY "public"."anamnesis_fields"
    ADD CONSTRAINT "anamnesis_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."anamnesis_forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_forms"
    ADD CONSTRAINT "anamnesis_forms_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_response_answers"
    ADD CONSTRAINT "anamnesis_response_answers_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."anamnesis_fields"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_response_answers"
    ADD CONSTRAINT "anamnesis_response_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "public"."anamnesis_responses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_responses"
    ADD CONSTRAINT "anamnesis_responses_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."anamnesis_responses"
    ADD CONSTRAINT "anamnesis_responses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_responses"
    ADD CONSTRAINT "anamnesis_responses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_responses"
    ADD CONSTRAINT "anamnesis_responses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."anamnesis_responses"
    ADD CONSTRAINT "anamnesis_responses_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."anamnesis_forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anamnesis_responses"
    ADD CONSTRAINT "anamnesis_responses_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointment_notifications"
    ADD CONSTRAINT "appointment_notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_notifications"
    ADD CONSTRAINT "appointment_notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_rules"
    ADD CONSTRAINT "campaign_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_sends"
    ADD CONSTRAINT "campaign_sends_campaign_rule_id_fkey" FOREIGN KEY ("campaign_rule_id") REFERENCES "public"."campaign_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_sends"
    ADD CONSTRAINT "campaign_sends_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_sends"
    ADD CONSTRAINT "campaign_sends_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_packages"
    ADD CONSTRAINT "client_packages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_packages"
    ADD CONSTRAINT "client_packages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_packages"
    ADD CONSTRAINT "client_packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id");



ALTER TABLE ONLY "public"."company_goals"
    ADD CONSTRAINT "company_goals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_role_empresa_fkey" FOREIGN KEY ("role_empresa") REFERENCES "public"."roles"("key");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_professionals"
    ADD CONSTRAINT "coupon_professionals_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_professionals"
    ADD CONSTRAINT "coupon_professionals_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_services"
    ADD CONSTRAINT "coupon_services_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_services"
    ADD CONSTRAINT "coupon_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impersonation_sessions"
    ADD CONSTRAINT "impersonation_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."impersonation_sessions"
    ADD CONSTRAINT "impersonation_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impersonation_sessions"
    ADD CONSTRAINT "impersonation_sessions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_webhook_events"
    ADD CONSTRAINT "payment_webhook_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_periods"
    ADD CONSTRAINT "payout_periods_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payout_periods"
    ADD CONSTRAINT "payout_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_periods"
    ADD CONSTRAINT "payout_periods_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_features"
    ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_blocks"
    ADD CONSTRAINT "professional_blocks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_blocks"
    ADD CONSTRAINT "professional_blocks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."professional_blocks"
    ADD CONSTRAINT "professional_blocks_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_commissions"
    ADD CONSTRAINT "professional_commissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_commissions"
    ADD CONSTRAINT "professional_commissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."professional_commissions"
    ADD CONSTRAINT "professional_commissions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_weekly_hours"
    ADD CONSTRAINT "professional_weekly_hours_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_weekly_hours"
    ADD CONSTRAINT "professional_weekly_hours_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."professional_weekly_hours"
    ADD CONSTRAINT "professional_weekly_hours_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."terms_acceptances"
    ADD CONSTRAINT "terms_acceptances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."terms_acceptances"
    ADD CONSTRAINT "terms_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



CREATE POLICY "anamnesis_answers_delete_managers_or_admin" ON "public"."anamnesis_response_answers" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."anamnesis_responses" "r"
  WHERE (("r"."id" = "anamnesis_response_answers"."response_id") AND ("private"."is_company_manager"("r"."company_id") OR "private"."is_super_admin"())))));



CREATE POLICY "anamnesis_answers_insert_members" ON "public"."anamnesis_response_answers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."anamnesis_responses" "r"
  WHERE (("r"."id" = "anamnesis_response_answers"."response_id") AND ("private"."is_company_member"("r"."company_id") OR "private"."is_super_admin"())))));



CREATE POLICY "anamnesis_answers_select_members" ON "public"."anamnesis_response_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."anamnesis_responses" "r"
  WHERE (("r"."id" = "anamnesis_response_answers"."response_id") AND (("private"."is_company_member"("r"."company_id") AND "private"."company_has_feature"("r"."company_id", 'anamnesis'::"text")) OR "private"."is_super_admin"())))));



CREATE POLICY "anamnesis_answers_select_own_client" ON "public"."anamnesis_response_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."anamnesis_responses" "r"
     JOIN "public"."clients" "c" ON (("c"."id" = "r"."client_id")))
  WHERE (("r"."id" = "anamnesis_response_answers"."response_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."anamnesis_fields" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anamnesis_fields_select_members" ON "public"."anamnesis_fields" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."anamnesis_forms" "f"
  WHERE (("f"."id" = "anamnesis_fields"."form_id") AND (("private"."is_company_member"("f"."company_id") AND "private"."company_has_feature"("f"."company_id", 'anamnesis'::"text")) OR "private"."is_super_admin"())))));



CREATE POLICY "anamnesis_fields_select_own_client" ON "public"."anamnesis_fields" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."anamnesis_forms" "f"
     JOIN "public"."clients" "c" ON (("c"."company_id" = "f"."company_id")))
  WHERE (("f"."id" = "anamnesis_fields"."form_id") AND "f"."active" AND "private"."company_has_feature"("f"."company_id", 'anamnesis'::"text") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "anamnesis_fields_write_managers_or_admin" ON "public"."anamnesis_fields" USING ((EXISTS ( SELECT 1
   FROM "public"."anamnesis_forms" "f"
  WHERE (("f"."id" = "anamnesis_fields"."form_id") AND ("private"."is_company_manager"("f"."company_id") OR "private"."is_super_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."anamnesis_forms" "f"
  WHERE (("f"."id" = "anamnesis_fields"."form_id") AND ("private"."is_company_manager"("f"."company_id") OR "private"."is_super_admin"())))));



ALTER TABLE "public"."anamnesis_forms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anamnesis_forms_delete_managers_or_admin" ON "public"."anamnesis_forms" FOR DELETE USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "anamnesis_forms_select_members" ON "public"."anamnesis_forms" FOR SELECT USING ((("private"."is_company_member"("company_id") AND "private"."company_has_feature"("company_id", 'anamnesis'::"text")) OR "private"."is_super_admin"()));



CREATE POLICY "anamnesis_forms_select_own_client" ON "public"."anamnesis_forms" FOR SELECT USING (("active" AND "private"."company_has_feature"("company_id", 'anamnesis'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."company_id" = "anamnesis_forms"."company_id") AND ("c"."user_id" = "auth"."uid"()))))));



CREATE POLICY "anamnesis_forms_update_managers_or_admin" ON "public"."anamnesis_forms" FOR UPDATE USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"())) WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "anamnesis_forms_write_managers_or_admin" ON "public"."anamnesis_forms" FOR INSERT WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



ALTER TABLE "public"."anamnesis_response_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anamnesis_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anamnesis_responses_delete_managers_or_admin" ON "public"."anamnesis_responses" FOR DELETE USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "anamnesis_responses_insert_members" ON "public"."anamnesis_responses" FOR INSERT WITH CHECK (("private"."is_company_member"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "anamnesis_responses_select_members" ON "public"."anamnesis_responses" FOR SELECT USING ((("private"."is_company_member"("company_id") AND "private"."company_has_feature"("company_id", 'anamnesis'::"text")) OR "private"."is_super_admin"()));



CREATE POLICY "anamnesis_responses_select_own_client" ON "public"."anamnesis_responses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "anamnesis_responses"."client_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."appointment_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointment_notifications_select_members" ON "public"."appointment_notifications" FOR SELECT USING ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"()));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointments_delete_managers_or_admin" ON "public"."appointments" FOR DELETE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "appointments_insert_members_or_self" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_company_member"("company_id") OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "appointments"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "appointments_select_members_client_or_admin" ON "public"."appointments" FOR SELECT TO "authenticated" USING (("private"."is_company_member"("company_id") OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "appointments"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "private"."is_super_admin"()));



CREATE POLICY "appointments_update_members_or_owning_client" ON "public"."appointments" FOR UPDATE TO "authenticated" USING (("private"."is_company_member"("company_id") OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "appointments"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK (("private"."is_company_member"("company_id") OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "appointments"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_select_admin_only" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("private"."is_super_admin"());



ALTER TABLE "public"."campaign_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaign_rules_select_members" ON "public"."campaign_rules" FOR SELECT USING (("private"."is_company_member"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "campaign_rules_write_managers_or_admin" ON "public"."campaign_rules" USING ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"())) WITH CHECK ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"()));



ALTER TABLE "public"."campaign_sends" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaign_sends_select_managers_or_admin" ON "public"."campaign_sends" FOR SELECT USING ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"()));



ALTER TABLE "public"."client_packages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_packages_select_own_or_members" ON "public"."client_packages" FOR SELECT USING (("private"."is_company_member"("company_id") OR "private"."is_super_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_packages"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "client_packages_update_managers_or_admin" ON "public"."client_packages" FOR UPDATE USING ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"())) WITH CHECK ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"()));



CREATE POLICY "client_packages_write_managers_or_admin" ON "public"."client_packages" FOR INSERT WITH CHECK ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"()));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete_managers_or_admin" ON "public"."clients" FOR DELETE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "clients_insert_members_or_self" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_company_member"("company_id") OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "clients_select_members_self_or_admin" ON "public"."clients" FOR SELECT TO "authenticated" USING (("private"."is_company_member"("company_id") OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_super_admin"()));



CREATE POLICY "clients_update_members_or_self" ON "public"."clients" FOR UPDATE TO "authenticated" USING (("private"."is_company_member"("company_id") OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("private"."is_company_member"("company_id") OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "companies_delete_admin_only" ON "public"."companies" FOR DELETE TO "authenticated" USING ("private"."is_super_admin"());



CREATE POLICY "companies_insert_self_service" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "companies_select_members_admin_or_public_active" ON "public"."companies" FOR SELECT TO "authenticated" USING ((("status" = ANY (ARRAY['active'::"text", 'trial'::"text"])) OR "private"."is_company_member"("id") OR "private"."is_super_admin"()));



CREATE POLICY "companies_select_public_active_anon" ON "public"."companies" FOR SELECT TO "anon" USING (("status" = ANY (ARRAY['active'::"text", 'trial'::"text"])));



CREATE POLICY "companies_update_managers_or_admin" ON "public"."companies" FOR UPDATE TO "authenticated" USING (("private"."is_company_manager"("id") OR "private"."is_super_admin"())) WITH CHECK (("private"."is_company_manager"("id") OR "private"."is_super_admin"()));



ALTER TABLE "public"."company_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_goals_delete_managers_or_admin" ON "public"."company_goals" FOR DELETE USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "company_goals_insert_managers_or_admin" ON "public"."company_goals" FOR INSERT WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "company_goals_select_members_or_admin" ON "public"."company_goals" FOR SELECT USING (("private"."is_company_member"("company_id") OR "private"."is_super_admin"()));



ALTER TABLE "public"."company_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_members_delete_managers_or_admin" ON "public"."company_members" FOR DELETE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "company_members_insert_managers_or_admin" ON "public"."company_members" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "company_members_select_members_or_admin" ON "public"."company_members" FOR SELECT TO "authenticated" USING (("private"."is_company_member"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "company_members_update_managers_or_admin" ON "public"."company_members" FOR UPDATE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"())) WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



ALTER TABLE "public"."coupon_professionals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coupon_professionals_all_managers_or_admin" ON "public"."coupon_professionals" USING ((EXISTS ( SELECT 1
   FROM "public"."coupons" "c"
  WHERE (("c"."id" = "coupon_professionals"."coupon_id") AND ("private"."is_company_manager"("c"."company_id") OR "private"."is_super_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."coupons" "c"
  WHERE (("c"."id" = "coupon_professionals"."coupon_id") AND ("private"."is_company_manager"("c"."company_id") OR "private"."is_super_admin"())))));



ALTER TABLE "public"."coupon_redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coupon_redemptions_select_managers_owner_or_admin" ON "public"."coupon_redemptions" FOR SELECT USING (("private"."is_company_manager"("company_id") OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "coupon_redemptions"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "private"."is_super_admin"()));



ALTER TABLE "public"."coupon_services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coupon_services_all_managers_or_admin" ON "public"."coupon_services" USING ((EXISTS ( SELECT 1
   FROM "public"."coupons" "c"
  WHERE (("c"."id" = "coupon_services"."coupon_id") AND ("private"."is_company_manager"("c"."company_id") OR "private"."is_super_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."coupons" "c"
  WHERE (("c"."id" = "coupon_services"."coupon_id") AND ("private"."is_company_manager"("c"."company_id") OR "private"."is_super_admin"())))));



ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coupons_all_managers_or_admin" ON "public"."coupons" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"())) WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



ALTER TABLE "public"."device_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_tokens_owner_only" ON "public"."device_tokens" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_all_managers_or_admin" ON "public"."expenses" TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"())) WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "favorites_delete_own" ON "public"."favorites" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "favorites_insert_own" ON "public"."favorites" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "favorites_select_own" ON "public"."favorites" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_super_admin"()));



ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "goals_all_managers_or_admin" ON "public"."goals" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"())) WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "goals_select_own_professional" ON "public"."goals" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."professionals" "p"
  WHERE (("p"."id" = "goals"."professional_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."impersonation_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "impersonation_sessions_select_admin_only" ON "public"."impersonation_sessions" FOR SELECT TO "authenticated" USING ("private"."is_super_admin"());



ALTER TABLE "public"."payment_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_delete_managers_or_admin" ON "public"."payments" FOR DELETE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "payments_insert_managers_or_admin" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "payments_select_managers_client_or_admin" ON "public"."payments" FOR SELECT TO "authenticated" USING (("private"."is_company_manager"("company_id") OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "payments"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "private"."is_super_admin"()));



CREATE POLICY "payments_update_managers_or_admin" ON "public"."payments" FOR UPDATE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"())) WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



ALTER TABLE "public"."payout_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payout_periods_all_managers_or_admin" ON "public"."payout_periods" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"())) WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "payout_periods_select_own_professional" ON "public"."payout_periods" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."professionals" "p"
  WHERE (("p"."id" = "payout_periods"."professional_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."pending_onboarding" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_features" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plan_features_delete_admin_only" ON "public"."plan_features" FOR DELETE TO "authenticated" USING ("private"."is_super_admin"());



CREATE POLICY "plan_features_select_public_active" ON "public"."plan_features" FOR SELECT TO "authenticated", "anon" USING (((EXISTS ( SELECT 1
   FROM "public"."plans" "p"
  WHERE (("p"."id" = "plan_features"."plan_id") AND ("p"."active" = true)))) OR "private"."is_super_admin"()));



CREATE POLICY "plan_features_update_admin_only" ON "public"."plan_features" FOR UPDATE TO "authenticated" USING ("private"."is_super_admin"()) WITH CHECK ("private"."is_super_admin"());



CREATE POLICY "plan_features_write_admin_only" ON "public"."plan_features" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_super_admin"());



ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plans_delete_admin_only" ON "public"."plans" FOR DELETE TO "authenticated" USING ("private"."is_super_admin"());



CREATE POLICY "plans_insert_admin_only" ON "public"."plans" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_super_admin"());



CREATE POLICY "plans_select_active_public" ON "public"."plans" FOR SELECT TO "authenticated", "anon" USING ((("active" = true) OR "private"."is_super_admin"()));



CREATE POLICY "plans_update_admin_only" ON "public"."plans" FOR UPDATE TO "authenticated" USING ("private"."is_super_admin"()) WITH CHECK ("private"."is_super_admin"());



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete_managers_or_admin" ON "public"."products" FOR DELETE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "products_insert_members" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_company_member"("company_id"));



CREATE POLICY "products_select_members_or_admin" ON "public"."products" FOR SELECT TO "authenticated" USING (("private"."is_company_member"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "products_update_members" ON "public"."products" FOR UPDATE TO "authenticated" USING ("private"."is_company_member"("company_id")) WITH CHECK ("private"."is_company_member"("company_id"));



ALTER TABLE "public"."professional_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professional_blocks_delete_managers_or_admin" ON "public"."professional_blocks" FOR DELETE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "professional_blocks_insert_members" ON "public"."professional_blocks" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_company_member"("company_id"));



CREATE POLICY "professional_blocks_select_members_or_admin" ON "public"."professional_blocks" FOR SELECT TO "authenticated" USING (("private"."is_company_member"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "professional_blocks_update_members" ON "public"."professional_blocks" FOR UPDATE TO "authenticated" USING ("private"."is_company_member"("company_id")) WITH CHECK ("private"."is_company_member"("company_id"));



ALTER TABLE "public"."professional_commissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professional_commissions_all_managers_or_admin" ON "public"."professional_commissions" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"())) WITH CHECK (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "professional_commissions_select_own" ON "public"."professional_commissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."professionals" "p"
  WHERE (("p"."id" = "professional_commissions"."professional_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."professional_weekly_hours" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professional_weekly_hours_delete_managers_or_admin" ON "public"."professional_weekly_hours" FOR DELETE USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "professional_weekly_hours_insert_members" ON "public"."professional_weekly_hours" FOR INSERT WITH CHECK ("private"."is_company_member"("company_id"));



CREATE POLICY "professional_weekly_hours_select_members_or_admin" ON "public"."professional_weekly_hours" FOR SELECT USING (("private"."is_company_member"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "professional_weekly_hours_update_members" ON "public"."professional_weekly_hours" FOR UPDATE USING ("private"."is_company_member"("company_id")) WITH CHECK ("private"."is_company_member"("company_id"));



ALTER TABLE "public"."professionals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professionals_delete_managers_or_admin" ON "public"."professionals" FOR DELETE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "professionals_insert_members" ON "public"."professionals" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_company_member"("company_id"));



CREATE POLICY "professionals_select_members_admin_or_public_active" ON "public"."professionals" FOR SELECT TO "authenticated" USING ((("active" = true) OR "private"."is_company_member"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "professionals_select_public_active_anon" ON "public"."professionals" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "professionals_update_members" ON "public"."professionals" FOR UPDATE TO "authenticated" USING ("private"."is_company_member"("company_id")) WITH CHECK ("private"."is_company_member"("company_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own_or_super_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_super_admin"()));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_delete_managers_or_admin" ON "public"."reviews" FOR DELETE USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "reviews_insert_own_completed_appointment" ON "public"."reviews" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."appointments" "a"
     JOIN "public"."clients" "c" ON (("c"."id" = "a"."client_id")))
  WHERE (("a"."id" = "reviews"."appointment_id") AND ("a"."status" = 'completed'::"text") AND ("a"."company_id" = "reviews"."company_id") AND ("a"."client_id" = "reviews"."client_id") AND ("a"."professional_id" = "reviews"."professional_id") AND ("a"."service_id" = "reviews"."service_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "reviews_select_members_owner_or_admin" ON "public"."reviews" FOR SELECT USING (("private"."is_company_member"("company_id") OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "reviews"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "private"."is_super_admin"()));



CREATE POLICY "reviews_select_public_published" ON "public"."reviews" FOR SELECT USING ((("status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."companies" "co"
  WHERE (("co"."id" = "reviews"."company_id") AND ("co"."status" = ANY (ARRAY['active'::"text", 'trial'::"text"])))))));



CREATE POLICY "reviews_update_owner_or_manager" ON "public"."reviews" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "reviews"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "private"."is_company_manager"("company_id") OR "private"."is_super_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "reviews"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_delete_admin_only" ON "public"."roles" FOR DELETE TO "authenticated" USING ("private"."is_super_admin"());



CREATE POLICY "roles_insert_admin_only" ON "public"."roles" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_super_admin"());



CREATE POLICY "roles_select_authenticated" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "roles_update_admin_only" ON "public"."roles" FOR UPDATE TO "authenticated" USING ("private"."is_super_admin"()) WITH CHECK ("private"."is_super_admin"());



ALTER TABLE "public"."segments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "segments_delete_admin_only" ON "public"."segments" FOR DELETE TO "authenticated" USING ("private"."is_super_admin"());



CREATE POLICY "segments_insert_admin_only" ON "public"."segments" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_super_admin"());



CREATE POLICY "segments_select_public_active" ON "public"."segments" FOR SELECT TO "authenticated", "anon" USING ((("active" = true) OR "private"."is_super_admin"()));



CREATE POLICY "segments_update_admin_only" ON "public"."segments" FOR UPDATE TO "authenticated" USING ("private"."is_super_admin"()) WITH CHECK ("private"."is_super_admin"());



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "services_delete_managers_or_admin" ON "public"."services" FOR DELETE TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "services_insert_members" ON "public"."services" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_company_member"("company_id"));



CREATE POLICY "services_select_members_admin_or_public_active" ON "public"."services" FOR SELECT TO "authenticated" USING ((("active" = true) OR "private"."is_company_member"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "services_select_public_active_anon" ON "public"."services" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "services_update_members" ON "public"."services" FOR UPDATE TO "authenticated" USING ("private"."is_company_member"("company_id")) WITH CHECK ("private"."is_company_member"("company_id"));



ALTER TABLE "public"."subscription_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_payments_select_admin_only" ON "public"."subscription_payments" FOR SELECT TO "authenticated" USING ("private"."is_super_admin"());



CREATE POLICY "subscription_payments_select_managers_or_admin" ON "public"."subscription_payments" FOR SELECT TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_delete_admin_only" ON "public"."subscriptions" FOR DELETE TO "authenticated" USING ("private"."is_super_admin"());



CREATE POLICY "subscriptions_insert_admin_only" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_super_admin"());



CREATE POLICY "subscriptions_select_managers_or_admin" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("private"."is_company_manager"("company_id") OR "private"."is_super_admin"()));



CREATE POLICY "subscriptions_update_admin_only" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING ("private"."is_super_admin"()) WITH CHECK ("private"."is_super_admin"());



ALTER TABLE "public"."terms_acceptances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "terms_acceptances_select_own_or_admin" ON "public"."terms_acceptances" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_super_admin"()));



ALTER TABLE "public"."waitlist_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "waitlist_insert_own_or_managers" ON "public"."waitlist_entries" FOR INSERT WITH CHECK ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "waitlist_entries"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "waitlist_select_own_or_managers" ON "public"."waitlist_entries" FOR SELECT USING ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "waitlist_entries"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "waitlist_update_own_or_managers" ON "public"."waitlist_entries" FOR UPDATE USING ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "waitlist_entries"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((COALESCE("private"."is_company_manager"("company_id"), false) OR "private"."is_super_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "waitlist_entries"."client_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."appointments";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






GRANT USAGE ON SCHEMA "private" TO "anon";
GRANT USAGE ON SCHEMA "private" TO "authenticated";































































































































































































































































































































































































































































































































































































































































































































































REVOKE ALL ON FUNCTION "private"."expire_trials"() FROM PUBLIC;



GRANT ALL ON FUNCTION "private"."get_professional_hours_for_day"("p_professional_id" "uuid", "p_day" "date") TO "authenticated";



GRANT ALL ON TABLE "public"."client_packages" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."client_packages" TO "authenticated";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_change_plan"("company_id" "uuid", "new_plan_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_change_plan"("company_id" "uuid", "new_plan_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."admin_change_plan"("company_id" "uuid", "new_plan_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_companies_by_plan"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_companies_by_plan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_companies_by_plan"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_dashboard_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_dashboard_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_dashboard_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



GRANT ALL ON TABLE "public"."impersonation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."impersonation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."impersonation_sessions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_end_impersonation"("session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_end_impersonation"("session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_end_impersonation"("session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_companies_owners"("p_company_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_companies_owners"("p_company_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_companies_owners"("p_company_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_company_users"("target_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_company_users"("target_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_company_users"("target_company_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_users"("p_search" "text", "p_company_id" "uuid", "p_page" integer, "p_page_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_users"("p_search" "text", "p_company_id" "uuid", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_users"("p_search" "text", "p_company_id" "uuid", "p_page" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON TABLE "public"."company_members" TO "anon";
GRANT ALL ON TABLE "public"."company_members" TO "authenticated";
GRANT ALL ON TABLE "public"."company_members" TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_set_member_active"("member_id" "uuid", "new_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_member_active"("member_id" "uuid", "new_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_member_active"("member_id" "uuid", "new_active" boolean) TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT UPDATE("name") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("phone") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("whatsapp") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("address") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("instagram") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("logo_url") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("cover_url") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("color_primary") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("color_secondary") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("color_accent") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("loyalty_program_enabled") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("whatsapp_reminder_enabled") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("business_hours") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("segment_id") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("trade_name") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("document") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("email") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("city") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("state") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("zip_code") ON TABLE "public"."companies" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_update_company"("company_id" "uuid", "new_status" "text", "new_anamnesis_enabled" boolean, "new_name" "text", "new_segment_id" "uuid", "new_trade_name" "text", "new_document" "text", "new_email" "text", "new_phone" "text", "new_whatsapp" "text", "new_address" "text", "new_city" "text", "new_state" "text", "new_zip_code" "text", "new_street" "text", "new_neighborhood" "text", "new_address_number" "text", "new_complement" "text", "new_other_segment" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_update_company"("company_id" "uuid", "new_status" "text", "new_anamnesis_enabled" boolean, "new_name" "text", "new_segment_id" "uuid", "new_trade_name" "text", "new_document" "text", "new_email" "text", "new_phone" "text", "new_whatsapp" "text", "new_address" "text", "new_city" "text", "new_state" "text", "new_zip_code" "text", "new_street" "text", "new_neighborhood" "text", "new_address_number" "text", "new_complement" "text", "new_other_segment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_company"("company_id" "uuid", "new_status" "text", "new_anamnesis_enabled" boolean, "new_name" "text", "new_segment_id" "uuid", "new_trade_name" "text", "new_document" "text", "new_email" "text", "new_phone" "text", "new_whatsapp" "text", "new_address" "text", "new_city" "text", "new_state" "text", "new_zip_code" "text", "new_street" "text", "new_neighborhood" "text", "new_address_number" "text", "new_complement" "text", "new_other_segment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."book_appointment"("p_company_id" "uuid", "p_client_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_scheduled_at" timestamp with time zone, "p_payment_method" "text", "p_coupon_code" "text", "p_client_package_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."book_appointment"("p_company_id" "uuid", "p_client_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_scheduled_at" timestamp with time zone, "p_payment_method" "text", "p_coupon_code" "text", "p_client_package_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."calculate_professional_payout"("p_company_id" "uuid", "p_professional_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."calculate_professional_payout"("p_company_id" "uuid", "p_professional_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";



GRANT ALL ON TABLE "public"."payout_periods" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."payout_periods" TO "authenticated";



GRANT ALL ON FUNCTION "public"."close_payout_period"("p_company_id" "uuid", "p_professional_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."close_payout_period"("p_company_id" "uuid", "p_professional_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_company_onboarding"("p_name" "text", "p_slug" "text", "p_segment_id" "uuid", "p_other_segment" "text", "p_business_size" "text", "p_staff_size_range" "text", "p_phone" "text", "p_document" "text", "p_zip_code" "text", "p_street" "text", "p_neighborhood" "text", "p_address_number" "text", "p_complement" "text", "p_city" "text", "p_state" "text", "p_goals" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_company_onboarding"("p_name" "text", "p_slug" "text", "p_segment_id" "uuid", "p_other_segment" "text", "p_business_size" "text", "p_staff_size_range" "text", "p_phone" "text", "p_document" "text", "p_zip_code" "text", "p_street" "text", "p_neighborhood" "text", "p_address_number" "text", "p_complement" "text", "p_city" "text", "p_state" "text", "p_goals" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_company_onboarding"("p_name" "text", "p_slug" "text", "p_segment_id" "uuid", "p_other_segment" "text", "p_business_size" "text", "p_staff_size_range" "text", "p_phone" "text", "p_document" "text", "p_zip_code" "text", "p_street" "text", "p_neighborhood" "text", "p_address_number" "text", "p_complement" "text", "p_city" "text", "p_state" "text", "p_goals" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_unique_slug"("base_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_unique_slug"("base_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_unique_slug"("base_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_availability_day"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_day" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_availability_day"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_day" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_availability_day"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_day" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_availability_day"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_day" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_availability_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_month" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_availability_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_availability_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_availability_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_service_id" "uuid", "p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_birthday_candidates"("p_company_id" "uuid", "p_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_birthday_candidates"("p_company_id" "uuid", "p_date" "date") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_birthday_candidates_range"("p_company_id" "uuid", "p_start_date" "date", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_birthday_candidates_range"("p_company_id" "uuid", "p_start_date" "date", "p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_block_conflicts"("p_company_id" "uuid", "p_professional_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_block_conflicts"("p_company_id" "uuid", "p_professional_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_block_conflicts"("p_company_id" "uuid", "p_professional_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_company_access_status"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_company_access_status"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_access_status"("p_company_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_company_plan_limits"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_company_plan_limits"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_plan_limits"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_company_rating_summary"("p_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_company_rating_summary"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_company_rating_summary"("p_company_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_inactive_client_candidates"("p_company_id" "uuid", "p_days_inactive" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_inactive_client_candidates"("p_company_id" "uuid", "p_days_inactive" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_my_inactive_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_inactive_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_new_client_candidates"("p_company_id" "uuid", "p_days" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_new_client_candidates"("p_company_id" "uuid", "p_days" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_pending_onboarding"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_pending_onboarding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_onboarding"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_professional_occupancy_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_month" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_professional_occupancy_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_professional_occupancy_month"("p_company_id" "uuid", "p_professional_id" "uuid", "p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recovery_candidates"("p_company_id" "uuid", "p_days_since_last" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_recovery_candidates"("p_company_id" "uuid", "p_days_since_last" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_recurring_client_candidates"("p_company_id" "uuid", "p_min_appointments" integer, "p_period_days" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_recurring_client_candidates"("p_company_id" "uuid", "p_min_appointments" integer, "p_period_days" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_company_clients"("p_company_id" "uuid", "p_search" "text", "p_filter" "text", "p_page" integer, "p_page_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_company_clients"("p_company_id" "uuid", "p_search" "text", "p_filter" "text", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_company_clients"("p_company_id" "uuid", "p_search" "text", "p_filter" "text", "p_page" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_payout_paid"("p_payout_period_id" "uuid", "p_paid_at" timestamp with time zone, "p_payment_method" "text", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."mark_payout_paid"("p_payout_period_id" "uuid", "p_paid_at" timestamp with time zone, "p_payment_method" "text", "p_notes" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."preview_coupon"("p_company_id" "uuid", "p_code" "text", "p_client_id" "uuid", "p_service_id" "uuid", "p_professional_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."preview_coupon"("p_company_id" "uuid", "p_code" "text", "p_client_id" "uuid", "p_service_id" "uuid", "p_professional_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."process_asaas_webhook_event"("p_event_hash" "text", "p_event" "text", "p_payment" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_asaas_webhook_event"("p_event_hash" "text", "p_event" "text", "p_payment" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."public_company_is_bookable"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."public_company_is_bookable"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."public_company_is_bookable"("p_company_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."public_company_is_bookable"("p_company_id" "uuid") TO "anon";



REVOKE ALL ON FUNCTION "public"."public_directory_companies"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."public_directory_companies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."public_directory_companies"() TO "service_role";
GRANT ALL ON FUNCTION "public"."public_directory_companies"() TO "anon";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



REVOKE ALL ON FUNCTION "public"."reschedule_appointment"("p_appointment_id" "uuid", "p_new_scheduled_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reschedule_appointment"("p_appointment_id" "uuid", "p_new_scheduled_at" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."reschedule_appointment"("p_appointment_id" "uuid", "p_new_scheduled_at" timestamp with time zone) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."professional_commissions" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."professional_commissions" TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_professional_commission"("p_professional_id" "uuid", "p_commission_type" "text", "p_commission_value" numeric) TO "service_role";
GRANT ALL ON FUNCTION "public"."set_professional_commission"("p_professional_id" "uuid", "p_commission_type" "text", "p_commission_value" numeric) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."stage_pending_onboarding"("p_email" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stage_pending_onboarding"("p_email" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."stage_pending_onboarding"("p_email" "text", "p_payload" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."stage_pending_onboarding"("p_email" "text", "p_payload" "jsonb") TO "anon";



REVOKE ALL ON FUNCTION "public"."stage_terms_acceptance"("p_email" "text", "p_document_type" "text", "p_document_version" "text", "p_user_agent" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stage_terms_acceptance"("p_email" "text", "p_document_type" "text", "p_document_version" "text", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."stage_terms_acceptance"("p_email" "text", "p_document_type" "text", "p_document_version" "text", "p_user_agent" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."stage_terms_acceptance"("p_email" "text", "p_document_type" "text", "p_document_version" "text", "p_user_agent" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."submit_anamnesis_response"("p_client_id" "uuid", "p_professional_id" "uuid", "p_appointment_id" "uuid", "p_answers" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."submit_anamnesis_response"("p_client_id" "uuid", "p_professional_id" "uuid", "p_appointment_id" "uuid", "p_answers" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."submit_anamnesis_response_as_client"("p_company_id" "uuid", "p_answers" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_anamnesis_response_as_client"("p_company_id" "uuid", "p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_anamnesis_response_as_client"("p_company_id" "uuid", "p_answers" "jsonb") TO "service_role";
























GRANT ALL ON TABLE "public"."anamnesis_fields" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."anamnesis_fields" TO "authenticated";



GRANT ALL ON TABLE "public"."anamnesis_forms" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."anamnesis_forms" TO "authenticated";



GRANT ALL ON TABLE "public"."anamnesis_response_answers" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."anamnesis_response_answers" TO "authenticated";



GRANT ALL ON TABLE "public"."anamnesis_responses" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."anamnesis_responses" TO "authenticated";



GRANT ALL ON TABLE "public"."appointment_notifications" TO "service_role";
GRANT SELECT ON TABLE "public"."appointment_notifications" TO "authenticated";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_rules" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."campaign_rules" TO "authenticated";



GRANT ALL ON TABLE "public"."campaign_sends" TO "service_role";
GRANT SELECT ON TABLE "public"."campaign_sends" TO "authenticated";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."company_goals" TO "anon";
GRANT ALL ON TABLE "public"."company_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."company_goals" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_professionals" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."coupon_professionals" TO "authenticated";



GRANT ALL ON TABLE "public"."coupon_redemptions" TO "service_role";
GRANT SELECT ON TABLE "public"."coupon_redemptions" TO "authenticated";



GRANT ALL ON TABLE "public"."coupon_services" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."coupon_services" TO "authenticated";



GRANT ALL ON TABLE "public"."coupons" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."coupons" TO "authenticated";



GRANT ALL ON TABLE "public"."device_tokens" TO "anon";
GRANT ALL ON TABLE "public"."device_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."device_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."favorites" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."favorites" TO "authenticated";



GRANT ALL ON TABLE "public"."goals" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."goals" TO "authenticated";



GRANT ALL ON TABLE "public"."payment_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."payment_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."pending_onboarding" TO "anon";
GRANT ALL ON TABLE "public"."pending_onboarding" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_onboarding" TO "service_role";



GRANT ALL ON TABLE "public"."plan_features" TO "anon";
GRANT ALL ON TABLE "public"."plan_features" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_features" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."professional_blocks" TO "anon";
GRANT ALL ON TABLE "public"."professional_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."professional_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."professional_weekly_hours" TO "anon";
GRANT ALL ON TABLE "public"."professional_weekly_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."professional_weekly_hours" TO "service_role";



GRANT ALL ON TABLE "public"."professionals" TO "anon";
GRANT ALL ON TABLE "public"."professionals" TO "authenticated";
GRANT ALL ON TABLE "public"."professionals" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("phone") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."reviews" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reviews" TO "authenticated";
GRANT SELECT ON TABLE "public"."reviews" TO "anon";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."segments" TO "anon";
GRANT ALL ON TABLE "public"."segments" TO "authenticated";
GRANT ALL ON TABLE "public"."segments" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_payments" TO "anon";
GRANT ALL ON TABLE "public"."subscription_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_payments" TO "service_role";



GRANT ALL ON TABLE "public"."terms_acceptances" TO "anon";
GRANT ALL ON TABLE "public"."terms_acceptances" TO "authenticated";
GRANT ALL ON TABLE "public"."terms_acceptances" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist_entries" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."waitlist_entries" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































