-- Pendência B (auditoria pré-lançamento, 14/09/2026): quando um agendamento
-- é cancelado, o `payment` vinculado não muda — fica "pending" (ou qualquer
-- outro status) preso, sem relação nenhuma com o agendamento não existir
-- mais.
--
-- REGRA EXPLÍCITA (não reabrir): cancelar agendamento NÃO significa
-- reembolsar. Este trigger só mexe em pagamentos que estão em 'pending' —
-- ou seja, nenhum dinheiro chegou a ser cobrado/recebido pra essa tentativa
-- específica. Pagamentos já 'paid', 'refunded', 'overdue' ou já 'canceled'
-- NUNCA são tocados por este trigger — não há refund automático, não há
-- decisão de percentual, não há chamada à API do Asaas. É só bookkeeping:
-- uma cobrança que nunca foi paga, associada a um agendamento que não
-- existe mais, não deveria continuar mostrando "pending" indefinidamente.
--
-- LIMITAÇÃO CONHECIDA (não resolvida aqui, fora de escopo): isto só
-- atualiza a LINHA local em `public.payments`. O link de cobrança já criado
-- no Asaas (quando existir `asaas_payment_id`) continua tecnicamente
-- pagável na página do Asaas até ser voidado manualmente lá — este trigger
-- não chama a API do Asaas pra cancelar a cobrança remota. Se isso for
-- necessário, é uma etapa separada (integração ativa com o Asaas a partir
-- de um trigger de banco, fora do escopo desta correção).
--
-- Dispara só em UPDATE (nunca em INSERT — nenhum agendamento nasce
-- cancelado hoje) e só na transição PARA 'canceled' (WHEN evita rodar em
-- toda atualização de status, só na que importa).

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

CREATE TRIGGER "void_pending_payment_on_appointment_cancel"
  AFTER UPDATE OF "status" ON "public"."appointments"
  FOR EACH ROW
  WHEN (("new"."status" = 'canceled'::"text") AND ("old"."status" IS DISTINCT FROM 'canceled'::"text"))
  EXECUTE FUNCTION "private"."void_pending_payment_on_appointment_cancel"();
