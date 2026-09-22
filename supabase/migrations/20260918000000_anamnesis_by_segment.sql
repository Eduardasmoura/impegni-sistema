-- Anamnese por segmento — Etapa 1 (implementação direta, autorizada).
-- Reaproveita 100% do motor de campos existente (anamnesis_fields/
-- anamnesis_forms/anamnesis_responses/anamnesis_response_answers); não
-- cria arquitetura paralela.

-- =========================================================================
-- 1. Segmento(s) do profissional (não existia — hoje só `companies.segment_id`)
-- =========================================================================
create table public.professional_segments (
  professional_id uuid not null references public.professionals(id) on delete cascade,
  segment_id uuid not null references public.segments(id),
  created_at timestamptz not null default now(),
  primary key (professional_id, segment_id)
);
create index professional_segments_segment_idx on public.professional_segments (segment_id);

alter table public.professional_segments enable row level security;

create policy professional_segments_select on public.professional_segments
  for select using (
    exists (select 1 from public.professionals p where p.id = professional_id
      and (private.is_company_member(p.company_id) or private.is_super_admin()))
  );
-- Sem policy de insert/update/delete direto: só via RPC `set_professional_segments`
-- (precisa disparar a sincronização de fichas — não é seguro deixar
-- escrita solta na tabela sem passar por esse fluxo).

-- =========================================================================
-- 2. Catálogo de fichas-modelo por segmento (Super Admin) — versionado
-- =========================================================================
create table public.anamnesis_templates (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.segments(id),
  version integer not null,
  title text not null default 'Anamnese',
  is_current boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (segment_id, version)
);
-- só 1 versão "atual" por segmento por vez
create unique index anamnesis_templates_one_current_per_segment
  on public.anamnesis_templates (segment_id) where is_current;

create table public.anamnesis_template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.anamnesis_templates(id) on delete cascade,
  label text not null,
  field_type text not null check (field_type in ('text','textarea','number','date','boolean','single_choice','multiple_choice')),
  options jsonb,
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint anamnesis_template_fields_options_only_for_choice
    check (field_type in ('single_choice','multiple_choice') or options is null)
);
create index anamnesis_template_fields_template_idx on public.anamnesis_template_fields (template_id, sort_order);

alter table public.anamnesis_templates enable row level security;
alter table public.anamnesis_template_fields enable row level security;

-- Catálogo administrado só pelo Super Admin — inclusive leitura (não é
-- exposto direto pra empresa/profissional; eles recebem a CÓPIA em
-- anamnesis_forms/anamnesis_fields, que já tem RLS própria).
create policy anamnesis_templates_admin_only on public.anamnesis_templates
  for all using (private.is_super_admin()) with check (private.is_super_admin());
create policy anamnesis_template_fields_admin_only on public.anamnesis_template_fields
  for all using (private.is_super_admin()) with check (private.is_super_admin());

-- =========================================================================
-- 3. anamnesis_forms passa a poder existir 1-por-(empresa, segmento), não
--    mais só 1-por-empresa. Formulários já existentes (legado, sem
--    segmento) recebem o segmento único que a empresa já tinha cadastrado
--    — nenhuma resposta é tocada.
-- =========================================================================
alter table public.anamnesis_forms
  add column segment_id uuid references public.segments(id),
  add column template_id uuid references public.anamnesis_templates(id),
  add column template_version integer;

update public.anamnesis_forms f
  set segment_id = c.segment_id
  from public.companies c
  where c.id = f.company_id and f.segment_id is null;

create unique index anamnesis_forms_one_active_per_company_segment
  on public.anamnesis_forms (company_id, segment_id) where active;

-- =========================================================================
-- 4. Corrige o bug real encontrado na auditoria: excluir uma pergunta
--    apagava em CASCADE todas as respostas históricas daquele campo,
--    contradizendo o aviso da própria tela ("respostas continuam
--    guardadas"). Daqui pra frente, um campo com resposta não pode ser
--    excluído de verdade — só arquivado (some da ficha ativa, mas o
--    rótulo/tipo originais continuam existindo pra sempre pro histórico).
-- =========================================================================
alter table public.anamnesis_fields add column archived_at timestamptz;

create or replace function private.protect_answered_anamnesis_field()
returns trigger language plpgsql set search_path to '' as $$
begin
  if exists (select 1 from public.anamnesis_response_answers where field_id = old.id) then
    raise exception 'não é possível excluir uma pergunta com respostas já registradas — arquive em vez de excluir'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;
create trigger protect_answered_anamnesis_field
  before delete on public.anamnesis_fields
  for each row execute function private.protect_answered_anamnesis_field();

-- =========================================================================
-- 5. RPC: definir os segmentos de um profissional (substitui o conjunto
--    inteiro, igual ao padrão já usado por outras telas desta base) e
--    sincronizar as fichas da empresa pros segmentos novos — nunca remove
--    fichas de segmentos tirados (histórico não pode ficar órfão).
-- =========================================================================
create or replace function public.set_professional_segments(
  p_professional_id uuid,
  p_segment_ids uuid[]
) returns setof public.segments
language plpgsql security definer set search_path to '' as $function$
declare
  v_company_id uuid;
  v_segment_id uuid;
  v_template public.anamnesis_templates;
  v_new_form public.anamnesis_forms;
begin
  select company_id into v_company_id from public.professionals where id = p_professional_id;
  if v_company_id is null then
    raise exception 'profissional não encontrado';
  end if;
  if not (private.is_company_manager(v_company_id) or private.is_super_admin()) then
    raise exception 'not authorized';
  end if;

  delete from public.professional_segments where professional_id = p_professional_id;
  if p_segment_ids is not null and array_length(p_segment_ids, 1) > 0 then
    insert into public.professional_segments (professional_id, segment_id)
    select p_professional_id, s from unnest(p_segment_ids) as s
    on conflict do nothing;
  end if;

  -- Sincroniza: pra cada segmento novo sem ficha ativa nesta empresa, cria
  -- uma copiando o template atual do segmento (ou vazia, se o Super Admin
  -- ainda não publicou nenhum template pra esse segmento — mesmo
  -- comportamento de fallback que já existia antes desta etapa).
  if p_segment_ids is not null then
    foreach v_segment_id in array p_segment_ids loop
      if not exists (
        select 1 from public.anamnesis_forms
        where company_id = v_company_id and segment_id = v_segment_id and active
      ) then
        select * into v_template from public.anamnesis_templates
          where segment_id = v_segment_id and is_current limit 1;

        insert into public.anamnesis_forms (company_id, segment_id, template_id, template_version, title)
        values (
          v_company_id, v_segment_id, v_template.id, v_template.version,
          coalesce(v_template.title, (select name from public.segments where id = v_segment_id))
        )
        returning * into v_new_form;

        if v_template.id is not null then
          perform set_config('app.seeding_anamnesis_defaults', 'true', true);
          insert into public.anamnesis_fields (form_id, label, field_type, options, required, sort_order)
          select v_new_form.id, tf.label, tf.field_type, tf.options, tf.required, tf.sort_order
          from public.anamnesis_template_fields tf
          where tf.template_id = v_template.id
          order by tf.sort_order;
          perform set_config('app.seeding_anamnesis_defaults', 'false', true);
        end if;
      end if;
    end loop;
  end if;

  insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
  values (auth.uid(), v_company_id, 'professional.set_segments', 'professionals', p_professional_id,
    jsonb_build_object('segment_ids', p_segment_ids));

  return query select s.* from public.segments s
    join public.professional_segments ps on ps.segment_id = s.id
    where ps.professional_id = p_professional_id
    order by s.name;
end;
$function$;

revoke all on function public.set_professional_segments(uuid, uuid[]) from public;
grant execute on function public.set_professional_segments(uuid, uuid[]) to authenticated;

-- =========================================================================
-- 6. RPC: Super Admin publica uma nova versão da ficha-modelo do segmento
--    (edição = versão nova, nunca sobrescreve a que já foi copiada pra
--    empresas existentes).
-- =========================================================================
create or replace function public.admin_save_anamnesis_template(
  p_segment_id uuid,
  p_title text,
  p_fields jsonb -- [{label, field_type, options, required, sort_order}]
) returns public.anamnesis_templates
language plpgsql security definer set search_path to '' as $function$
declare
  v_next_version integer;
  v_new public.anamnesis_templates;
  v_field jsonb;
begin
  if not private.is_super_admin() then
    raise exception 'only super_admin can call admin_save_anamnesis_template';
  end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from public.anamnesis_templates where segment_id = p_segment_id;

  update public.anamnesis_templates set is_current = false
    where segment_id = p_segment_id and is_current;

  insert into public.anamnesis_templates (segment_id, version, title, is_current, created_by)
  values (p_segment_id, v_next_version, coalesce(nullif(trim(p_title), ''), 'Anamnese'), true, auth.uid())
  returning * into v_new;

  for v_field in select * from jsonb_array_elements(coalesce(p_fields, '[]'::jsonb))
  loop
    insert into public.anamnesis_template_fields (template_id, label, field_type, options, required, sort_order)
    values (
      v_new.id,
      v_field ->> 'label',
      v_field ->> 'field_type',
      case when v_field -> 'options' = 'null'::jsonb then null else v_field -> 'options' end,
      coalesce((v_field ->> 'required')::boolean, false),
      coalesce((v_field ->> 'sort_order')::integer, 0)
    );
  end loop;

  insert into public.audit_logs (actor_id, company_id, action, target_table, target_id, payload)
  values (auth.uid(), null, 'anamnesis_template.publish', 'anamnesis_templates', v_new.id,
    jsonb_build_object('segment_id', p_segment_id, 'version', v_next_version, 'fields_count', jsonb_array_length(coalesce(p_fields, '[]'::jsonb))));

  return v_new;
end;
$function$;

revoke all on function public.admin_save_anamnesis_template(uuid, text, jsonb) from public;
grant execute on function public.admin_save_anamnesis_template(uuid, text, jsonb) to authenticated;
