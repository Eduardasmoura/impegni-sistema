-- Reformulação do módulo Financeiro (Etapa 3) — Receitas e Pagamentos.
--
-- Hoje a tela de Financeiro carrega `payments` inteiro (até 500 linhas, sem
-- paginação, sem busca, sem nome de cliente/serviço/profissional — nenhum
-- join) e filtra tudo no navegador. Pra uma empresa com centenas/milhares
-- de lançamentos isso é exatamente o anti-padrão já corrigido em Clientes
-- (`list_company_clients`, migration 20260914150000) — mesma solução
-- aplicada aqui: uma RPC de leitura, paginada, com busca e filtros no
-- banco, LEFT JOIN com appointments/clients/services/professionals (todos
-- opcionais — `payments.appointment_id`/`client_id` são nullable).
--
-- Autorização: mesma checagem de sempre (`is_company_member`), reforçada
-- na própria RPC (SECURITY DEFINER) — não depende só da RLS de `payments`
-- pra isolar por empresa.
--
-- Usada pelas abas "Receitas" e "Pagamentos" do Financeiro — a mesma RPC
-- serve as duas (a diferença entre elas é só o filtro/ênfase visual
-- escolhido no frontend, não duplica lógica nenhuma).

CREATE OR REPLACE FUNCTION "public"."list_company_payments"(
  "p_company_id" "uuid",
  "p_search" "text" DEFAULT NULL::"text",
  "p_status" "text" DEFAULT NULL::"text",
  "p_method" "text" DEFAULT NULL::"text",
  "p_professional_id" "uuid" DEFAULT NULL::"uuid",
  "p_service_id" "uuid" DEFAULT NULL::"uuid",
  "p_period_start" timestamp with time zone DEFAULT NULL::timestamp with time zone,
  "p_period_end" timestamp with time zone DEFAULT NULL::timestamp with time zone,
  "p_page" integer DEFAULT 1,
  "p_page_size" integer DEFAULT 25
)
RETURNS TABLE(
  "id" "uuid",
  "amount" numeric,
  "method" "text",
  "status" "text",
  "created_at" timestamp with time zone,
  "asaas_invoice_url" "text",
  "client_id" "uuid",
  "client_name" "text",
  "service_id" "uuid",
  "service_name" "text",
  "professional_id" "uuid",
  "professional_name" "text",
  "appointment_id" "uuid",
  "appointment_status" "text",
  "appointment_scheduled_at" timestamp with time zone,
  "total_count" bigint
)
LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO ''
AS $$
declare
  offset_val integer := greatest(0, (p_page - 1) * greatest(1, p_page_size));
  safe_page_size integer := least(100, greatest(1, p_page_size));
  safe_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not private.is_company_member(p_company_id) then
    raise exception 'not authorized';
  end if;

  return query
  with base as (
    select
      pay.id, pay.amount, pay.method, pay.status, pay.created_at, pay.asaas_invoice_url,
      c.id as client_id, c.name as client_name,
      s.id as service_id, s.name as service_name,
      pr.id as professional_id, pr.name as professional_name,
      a.id as appointment_id, a.status as appointment_status, a.scheduled_at as appointment_scheduled_at
    from public.payments pay
    left join public.appointments a on a.id = pay.appointment_id
    left join public.clients c on c.id = coalesce(pay.client_id, a.client_id)
    left join public.services s on s.id = a.service_id
    left join public.professionals pr on pr.id = a.professional_id
    where pay.company_id = p_company_id
      and (safe_search is null or c.name ilike '%' || safe_search || '%' or c.phone ilike '%' || safe_search || '%' or c.email ilike '%' || safe_search || '%')
      and (p_status is null or pay.status = p_status)
      and (p_method is null or pay.method = p_method)
      and (p_professional_id is null or pr.id = p_professional_id)
      and (p_service_id is null or s.id = p_service_id)
      and (p_period_start is null or pay.created_at >= p_period_start)
      and (p_period_end is null or pay.created_at <= p_period_end)
  ),
  counted as (
    select count(*) over () as total_count, base.*
    from base
  )
  select counted.id, counted.amount, counted.method, counted.status, counted.created_at, counted.asaas_invoice_url,
         counted.client_id, counted.client_name, counted.service_id, counted.service_name,
         counted.professional_id, counted.professional_name, counted.appointment_id,
         counted.appointment_status, counted.appointment_scheduled_at, counted.total_count
  from counted
  order by counted.created_at desc
  limit safe_page_size offset offset_val;
end;
$$;

ALTER FUNCTION "public"."list_company_payments"("p_company_id" "uuid", "p_search" "text", "p_status" "text", "p_method" "text", "p_professional_id" "uuid", "p_service_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_page" integer, "p_page_size" integer) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."list_company_payments"("p_company_id" "uuid", "p_search" "text", "p_status" "text", "p_method" "text", "p_professional_id" "uuid", "p_service_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_page" integer, "p_page_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_company_payments"("p_company_id" "uuid", "p_search" "text", "p_status" "text", "p_method" "text", "p_professional_id" "uuid", "p_service_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_company_payments"("p_company_id" "uuid", "p_search" "text", "p_status" "text", "p_method" "text", "p_professional_id" "uuid", "p_service_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_page" integer, "p_page_size" integer) TO "service_role";
