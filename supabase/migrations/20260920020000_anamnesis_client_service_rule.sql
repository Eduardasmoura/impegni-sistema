-- Web-client: a ficha do atendimento vem do serviço (services.anamnesis_form_id)
-- e o cliente não escolhe quando o sistema já sabe. A regra é aplicada no
-- SERVIDOR, não só na tela: se o atendimento informado tem serviço com ficha
-- ativa vinculada, o cliente só pode enviar essa ficha.
create or replace function private.linked_active_anamnesis_form(p_company_id uuid, p_service_id uuid)
returns uuid language sql stable security definer set search_path to '' as $$
  select f.id
  from public.services s
  join public.anamnesis_forms f on f.id = s.anamnesis_form_id and f.company_id = s.company_id
  where s.id = p_service_id and s.company_id = p_company_id and f.active
$$;

drop function if exists public.submit_anamnesis_response_as_client(uuid, jsonb, uuid);

create function public.submit_anamnesis_response_as_client(
  p_company_id uuid,
  p_answers jsonb default '[]'::jsonb,
  p_form_id uuid default null,
  p_appointment_id uuid default null
) returns uuid language plpgsql security definer set search_path to '' as $function$
declare
  v_client_id uuid;
  v_service_id uuid;
  v_linked uuid;
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

  -- atendimento: precisa ser deste cliente, nesta empresa
  if p_appointment_id is not null then
    select service_id into v_service_id from public.appointments
      where id = p_appointment_id and company_id = p_company_id and client_id = v_client_id;
    if v_service_id is null then
      raise exception 'atendimento inválido';
    end if;
    v_linked := private.linked_active_anamnesis_form(p_company_id, v_service_id);
    if v_linked is not null and p_form_id is not null and p_form_id <> v_linked then
      raise exception 'a ficha deste atendimento é definida pelo serviço';
    end if;
  end if;

  v_form_id := private.resolve_anamnesis_form(p_company_id, p_form_id, v_service_id);
  return private.record_anamnesis_response(v_form_id, p_company_id, v_client_id, null, p_appointment_id, p_answers);
end;
$function$;

revoke all on function public.submit_anamnesis_response_as_client(uuid, jsonb, uuid, uuid) from public;
grant execute on function public.submit_anamnesis_response_as_client(uuid, jsonb, uuid, uuid) to authenticated, service_role;
