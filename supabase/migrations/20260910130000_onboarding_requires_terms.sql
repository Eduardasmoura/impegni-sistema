-- BLOCKER 3 (auditoria pré-produção) — aceite de contrato verificado no
-- backend, não só no checkbox do frontend.
--
-- Antes: complete_company_onboarding só fazia backfill do company_id em
-- terms_acceptances (UPDATE ... WHERE company_id IS NULL). Se a chamada
-- de gravação do aceite falhasse no cadastro (rede/timeout), a empresa
-- era criada sem nenhuma evidência auditável do aceite, em silêncio.
--
-- Aqui: recusa concluir o onboarding se não existir um aceite de
-- 'terms_of_service' para o usuário. A checagem fica DEPOIS do retorno
-- idempotente (empresas já existentes não quebram) e é agnóstica de
-- versão (fecha o buraco "nenhum aceite"; re-aceite por nova versão é
-- outro mecanismo). O frontend (/onboarding) também passa a registrar o
-- aceite via stage_terms_acceptance imediatamente antes de chamar esta
-- função, então o caminho feliz nunca vê este erro.

create or replace function public.complete_company_onboarding(
  p_name text, p_slug text, p_segment_id uuid,
  p_other_segment text DEFAULT NULL::text, p_business_size text DEFAULT NULL::text,
  p_staff_size_range text DEFAULT NULL::text, p_phone text DEFAULT NULL::text,
  p_document text DEFAULT NULL::text, p_zip_code text DEFAULT NULL::text,
  p_street text DEFAULT NULL::text, p_neighborhood text DEFAULT NULL::text,
  p_address_number text DEFAULT NULL::text, p_complement text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text,
  p_goals text[] DEFAULT '{}'::text[]
)
 RETURNS companies
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
