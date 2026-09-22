-- Pendência A (auditoria pré-lançamento, 14/09/2026): eventos de pagamento
-- recusado/reprovado do Asaas ficavam presos em "pending" porque o CASE de
-- private.process_asaas_webhook_event não os mapeava — caíam no "else"
-- (null), que deixa o status do payment intocado.
--
-- Eventos reais confirmados na documentação oficial do Asaas
-- (https://docs.asaas.com/docs/webhook-para-cobrancas):
--   PAYMENT_REPROVED_BY_RISK_ANALYSIS   — "Pagamento em cartão reprovado
--                                          pela análise manual de risco"
--   PAYMENT_CREDIT_CARD_CAPTURE_REFUSED — "Falha na captura do pagamento
--                                          com cartão de crédito"
--
-- Mapeados para 'canceled' — mesmo valor já usado hoje pra PAYMENT_DELETED
-- (cobrança que não vai mais ser paga). Não é um novo status, não é
-- reembolso (nenhum dinheiro chegou a entrar), só reflete que esta
-- tentativa específica de cobrança está morta.
--
-- Escopo estritamente limitado: só o CASE de v_appointment_payment_status
-- (fluxo "appointment_payment", cobrança avulsa de agendamento) foi tocado.
-- O fluxo de assinatura da empresa (v_new_status / subscription_payments)
-- foi copiado exatamente como estava — nenhuma linha alterada ali.
-- Idempotência (dedup por provider_event_id) também preservada intacta.
--
-- CREATE OR REPLACE substitui a função inteira (não dá pra fazer ALTER
-- parcial em plpgsql) — por isso o corpo abaixo é a função completa, com
-- as duas linhas novas marcadas com comentário "-- NOVO" sendo a única
-- diferença real em relação à versão hoje em produção
-- (ver supabase/schema_atual/schema.sql, função
-- private.process_asaas_webhook_event).

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
