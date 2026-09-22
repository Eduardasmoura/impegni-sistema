-- Reformulação da tela de Clientes (CRM) — Parte 2/2.
--
-- Duas RPCs novas, ambas de LEITURA (STABLE), sem alterar nenhuma tabela,
-- policy de RLS ou trigger existente:
--
-- 1) public.list_company_clients — lista paginada/pesquisável de clientes,
--    pra não precisar mais carregar TODOS os clientes da empresa no
--    navegador (o que a tela antiga fazia com `select("*")` sem limite —
--    inviável a partir de algumas centenas de clientes). Busca por
--    nome/telefone/e-mail e paginação acontecem no banco (ilike + limit/
--    offset), no mesmo padrão já usado em `admin_list_users` (Super Admin).
--    Autorização: mesma checagem de sempre (`is_company_member`), reforçada
--    aqui porque a RPC roda como SECURITY DEFINER — não depende só da RLS
--    de `clients` pra isolar por empresa.
--
-- 2) public.company_has_feature — wrapper público e somente-leitura pra
--    `private.company_has_feature`, que já existe e já é a fonte de
--    verdade sobre liberação de recurso por plano (override manual OU
--    plan_features do plano atual — ver comentário da função original).
--    Hoje esse gate só existe dentro do schema `private` (não exposto via
--    PostgREST) — a tela de Clientes precisa dele no navegador pra decidir
--    se mostra a aba de Anamnese, exatamente como pedido ("a anamnese
--    respeita o plano contratado"). Mesmo padrão de wrapper já usado em
--    `public.public_company_is_bookable`, que só chama
--    `private.company_has_access`.

CREATE OR REPLACE FUNCTION "public"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text")
RETURNS boolean
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

REVOKE ALL ON FUNCTION "public"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."company_has_feature"("p_company_id" "uuid", "p_feature_key" "text") TO "service_role";


CREATE OR REPLACE FUNCTION "public"."list_company_clients"(
  "p_company_id" "uuid",
  "p_search" "text" DEFAULT NULL::"text",
  "p_filter" "text" DEFAULT 'all'::"text",
  "p_page" integer DEFAULT 1,
  "p_page_size" integer DEFAULT 25
)
RETURNS TABLE(
  "id" "uuid",
  "name" "text",
  "phone" "text",
  "email" "text",
  "notes" "text",
  "birth_date" "date",
  "user_id" "uuid",
  "active" boolean,
  "created_at" timestamp with time zone,
  "last_appointment_at" timestamp with time zone,
  "next_appointment_at" timestamp with time zone,
  "has_anamnesis" boolean,
  "total_count" bigint
)
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

REVOKE ALL ON FUNCTION "public"."list_company_clients"("p_company_id" "uuid", "p_search" "text", "p_filter" "text", "p_page" integer, "p_page_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_company_clients"("p_company_id" "uuid", "p_search" "text", "p_filter" "text", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_company_clients"("p_company_id" "uuid", "p_search" "text", "p_filter" "text", "p_page" integer, "p_page_size" integer) TO "service_role";
