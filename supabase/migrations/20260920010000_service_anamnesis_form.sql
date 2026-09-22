-- Serviço → ficha de anamnese.
--
-- Não existia nenhuma relação serviço↔ficha (`services.category` é texto
-- livre, `services.type` só avulso/pacote). Cria a mínima necessária: uma
-- coluna em `services` apontando pra `anamnesis_forms`. Quem escolhe é o
-- profissional/empresa (dono do serviço); o Super Admin só define o modelo
-- por segmento (migration 20260918000000) — nenhuma tela/regra nova de admin.
--
-- Isolamento entre empresas garantido NO BANCO (não só na UI): chave
-- estrangeira composta (anamnesis_form_id, company_id) → (id, company_id).
-- Serviço da empresa A nunca consegue apontar pra ficha da empresa B,
-- independente de RLS ou de quem faz o UPDATE.
alter table public.anamnesis_forms
  add constraint anamnesis_forms_id_company_unique unique (id, company_id);

alter table public.services add column anamnesis_form_id uuid;

-- ON DELETE SET NULL (coluna): se a ficha sumir, só o vínculo é limpo —
-- company_id do serviço (NOT NULL) fica intacto (recurso do PG15+).
alter table public.services
  add constraint services_anamnesis_form_same_company_fk
  foreign key (anamnesis_form_id, company_id)
  references public.anamnesis_forms (id, company_id)
  on delete set null (anamnesis_form_id);

create index services_anamnesis_form_idx on public.services (anamnesis_form_id)
  where anamnesis_form_id is not null;

comment on column public.services.anamnesis_form_id is
  'Ficha de anamnese usada por este serviço (mesma empresa — FK composta). NULL = sem ficha vinculada: o atendimento usa a única ficha ativa da empresa ou exige seleção manual.';

-- ===================================================================
-- Resolução da ficha no servidor: explícita > vinculada ao serviço >
-- única ficha ativa > erro (nunca escolhe ao acaso).
-- ===================================================================
drop function if exists private.resolve_anamnesis_form(uuid, uuid);
create function private.resolve_anamnesis_form(p_company_id uuid, p_form_id uuid, p_service_id uuid default null)
returns uuid language plpgsql stable security definer set search_path to '' as $$
declare
  v_id uuid;
  v_service_company uuid;
  v_linked uuid;
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

  if p_service_id is not null then
    select company_id, anamnesis_form_id into v_service_company, v_linked
      from public.services where id = p_service_id;
    if v_service_company is null or v_service_company <> p_company_id then
      raise exception 'serviço inválido para esta empresa';
    end if;
    if v_linked is not null then
      select id into v_id from public.anamnesis_forms
        where id = v_linked and company_id = p_company_id and active;
      if v_id is not null then
        return v_id;
      end if;
      -- ficha vinculada foi desativada: cai na regra geral abaixo
    end if;
  end if;

  select count(*) into v_count from public.anamnesis_forms where company_id = p_company_id and active;
  if v_count = 0 then
    raise exception 'nenhum formulário de anamnese ativo para esta empresa';
  end if;
  if v_count > 1 then
    raise exception 'esta empresa tem mais de uma ficha de anamnese e o serviço não define qual — informe qual preencher';
  end if;
  select id into v_id from public.anamnesis_forms where company_id = p_company_id and active;
  return v_id;
end;
$$;

drop function if exists public.submit_anamnesis_response(uuid, uuid, uuid, jsonb, uuid);
drop function if exists public.submit_anamnesis_response_as_client(uuid, jsonb, uuid);

create function public.submit_anamnesis_response(
  p_client_id uuid,
  p_professional_id uuid default null,
  p_appointment_id uuid default null,
  p_answers jsonb default '[]'::jsonb,
  p_form_id uuid default null,
  p_service_id uuid default null
) returns uuid language plpgsql security definer set search_path to '' as $function$
declare
  v_company_id uuid;
  v_form_id uuid;
  v_service_id uuid := p_service_id;
begin
  select company_id into v_company_id from public.clients where id = p_client_id;
  if v_company_id is null then
    raise exception 'cliente não encontrado';
  end if;
  if not (coalesce(private.is_company_member(v_company_id), false) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  -- atendimento informado: tem que ser desta empresa e deste cliente; o
  -- serviço dele define a ficha quando nada mais foi informado
  if p_appointment_id is not null then
    select service_id into v_service_id from public.appointments
      where id = p_appointment_id and company_id = v_company_id and client_id = p_client_id;
    if v_service_id is null then
      raise exception 'atendimento inválido para este cliente';
    end if;
    if p_service_id is not null and p_service_id <> v_service_id then
      raise exception 'serviço informado não corresponde ao atendimento';
    end if;
  end if;

  v_form_id := private.resolve_anamnesis_form(v_company_id, p_form_id, v_service_id);
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

  v_form_id := private.resolve_anamnesis_form(p_company_id, p_form_id, null);
  return private.record_anamnesis_response(v_form_id, p_company_id, v_client_id, null, null, p_answers);
end;
$function$;

revoke all on function public.submit_anamnesis_response(uuid, uuid, uuid, jsonb, uuid, uuid) from public;
grant execute on function public.submit_anamnesis_response(uuid, uuid, uuid, jsonb, uuid, uuid) to authenticated, service_role;
revoke all on function public.submit_anamnesis_response_as_client(uuid, jsonb, uuid) from public;
grant execute on function public.submit_anamnesis_response_as_client(uuid, jsonb, uuid) to authenticated, service_role;
