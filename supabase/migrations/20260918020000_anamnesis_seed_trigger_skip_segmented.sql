-- Correção 2: o trigger antigo `seed_default_anamnesis_fields_trigger`
-- (AFTER INSERT ON anamnesis_forms) continuava disparando pra QUALQUER
-- form novo, inclusive os criados por `set_professional_segments` — ele
-- injetava as 5 perguntas genéricas antigas em cima (ou no lugar) da
-- cópia do template do segmento. Descoberto ao testar ao vivo em produção
-- (não apareceu no Docker porque o harness de teste não incluía esse
-- trigger). Fica só pro fluxo legado (form sem segmento, da tela antiga
-- /anamnese) — forms novos por segmento são seedados exclusivamente pela
-- lógica explícita da RPC.
create or replace function private.seed_default_anamnesis_fields()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.segment_id is not null then
    return new;
  end if;

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
