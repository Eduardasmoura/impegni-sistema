-- Preenchimento de anamnese ciente de segmento.
--
-- Problema real: as duas RPCs de envio faziam
--   select id into v_form_id from anamnesis_forms where company_id = X and active
-- — sem STRICT, com 2+ fichas ativas (uma por segmento, migration
-- 20260918000000) isso escolhe uma AO ACASO. Agora o form é informado
-- explicitamente (p_form_id); sem ele só funciona quando a empresa tem
-- exatamente 1 ficha ativa (compatível com quem ainda usa 1 só).
--
-- Também: (1) valida que cada resposta pertence a uma pergunta desta ficha
-- (antes dava pra mandar field_id de outra ficha), (2) ignora perguntas
-- arquivadas, (3) congela rótulo/tipo da pergunta em cada resposta pra
-- editar/arquivar uma pergunta depois nunca reescrever o histórico.

alter table public.anamnesis_response_answers
  add column field_label_snapshot text,
  add column field_type_snapshot text;

-- histórico já existente: congela o rótulo/tipo atuais (melhor que nada;
-- daqui pra frente vale o do momento do envio)
update public.anamnesis_response_answers a
  set field_label_snapshot = f.label, field_type_snapshot = f.field_type
  from public.anamnesis_fields f
  where f.id = a.field_id and a.field_label_snapshot is null;

create or replace function private.resolve_anamnesis_form(p_company_id uuid, p_form_id uuid)
returns uuid language plpgsql stable security definer set search_path to '' as $$
declare
  v_id uuid;
  v_count integer;
begin
  if p_form_id is not null then
    select id into v_id from public.anamnesis_forms
      where id = p_form_id and company_id = p_company_id and active;
    if v_id is null then
      raise exception 'ficha de anamnese inválida ou desativada para esta empresa';
    end if;
    return v_id;
  end if;

  select count(*) into v_count from public.anamnesis_forms where company_id = p_company_id and active;
  if v_count = 0 then
    raise exception 'nenhum formulário de anamnese ativo para esta empresa';
  end if;
  if v_count > 1 then
    raise exception 'esta empresa tem mais de uma ficha de anamnese — informe qual preencher';
  end if;
  select id into v_id from public.anamnesis_forms where company_id = p_company_id and active;
  return v_id;
end;
$$;

-- grava resposta + respostas (compartilhado pelas duas RPCs públicas)
create or replace function private.record_anamnesis_response(
  p_form_id uuid, p_company_id uuid, p_client_id uuid,
  p_professional_id uuid, p_appointment_id uuid, p_answers jsonb
) returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_field record;
  v_answer jsonb;
  v_has_answer boolean;
  v_response_id uuid;
  v_target public.anamnesis_fields;
begin
  -- toda resposta precisa apontar pra uma pergunta ATIVA desta ficha
  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    if not exists (
      select 1 from public.anamnesis_fields
      where id = (v_answer ->> 'field_id')::uuid and form_id = p_form_id and archived_at is null
    ) then
      raise exception 'resposta para uma pergunta que não pertence a esta ficha';
    end if;
  end loop;

  for v_field in
    select id, label from public.anamnesis_fields
    where form_id = p_form_id and required = true and archived_at is null
  loop
    select exists (
      select 1 from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
      where (a ->> 'field_id')::uuid = v_field.id
        and a -> 'value' is not null
        and a ->> 'value' <> ''
    ) into v_has_answer;
    if not v_has_answer then
      raise exception '"%" é obrigatória', v_field.label;
    end if;
  end loop;

  insert into public.anamnesis_responses (form_id, company_id, client_id, professional_id, appointment_id, created_by)
  values (p_form_id, p_company_id, p_client_id, p_professional_id, p_appointment_id, auth.uid())
  returning id into v_response_id;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    if v_answer -> 'value' is not null and v_answer ->> 'value' <> '' then
      select * into v_target from public.anamnesis_fields where id = (v_answer ->> 'field_id')::uuid;
      insert into public.anamnesis_response_answers (response_id, field_id, value, field_label_snapshot, field_type_snapshot)
      values (v_response_id, v_target.id, v_answer -> 'value', v_target.label, v_target.field_type);
    end if;
  end loop;

  return v_response_id;
end;
$$;

-- assinatura muda (novo parâmetro) → derruba as antigas pra não gerar
-- overload ambíguo nas chamadas sem p_form_id
drop function if exists public.submit_anamnesis_response(uuid, uuid, uuid, jsonb);
drop function if exists public.submit_anamnesis_response_as_client(uuid, jsonb);

create function public.submit_anamnesis_response(
  p_client_id uuid,
  p_professional_id uuid default null,
  p_appointment_id uuid default null,
  p_answers jsonb default '[]'::jsonb,
  p_form_id uuid default null
) returns uuid language plpgsql security definer set search_path to '' as $function$
declare
  v_company_id uuid;
  v_form_id uuid;
begin
  select company_id into v_company_id from public.clients where id = p_client_id;
  if v_company_id is null then
    raise exception 'cliente não encontrado';
  end if;
  if not (coalesce(private.is_company_member(v_company_id), false) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  v_form_id := private.resolve_anamnesis_form(v_company_id, p_form_id);
  return private.record_anamnesis_response(v_form_id, v_company_id, p_client_id, p_professional_id, p_appointment_id, p_answers);
end;
$function$;

create function public.submit_anamnesis_response_as_client(
  p_company_id uuid,
  p_answers jsonb default '[]'::jsonb,
  p_form_id uuid default null
) returns uuid language plpgsql security definer set search_path to '' as $function$
declare
  v_client_id uuid;
  v_form_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_client_id from public.clients
    where company_id = p_company_id and user_id = auth.uid() limit 1;
  if v_client_id is null then
    raise exception 'você ainda não é cliente desta empresa';
  end if;

  v_form_id := private.resolve_anamnesis_form(p_company_id, p_form_id);
  return private.record_anamnesis_response(v_form_id, p_company_id, v_client_id, null, null, p_answers);
end;
$function$;

revoke all on function public.submit_anamnesis_response(uuid, uuid, uuid, jsonb, uuid) from public;
grant execute on function public.submit_anamnesis_response(uuid, uuid, uuid, jsonb, uuid) to authenticated, service_role;
revoke all on function public.submit_anamnesis_response_as_client(uuid, jsonb, uuid) from public;
grant execute on function public.submit_anamnesis_response_as_client(uuid, jsonb, uuid) to authenticated, service_role;
