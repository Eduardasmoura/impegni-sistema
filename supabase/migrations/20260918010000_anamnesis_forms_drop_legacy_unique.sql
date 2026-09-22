-- Correção: a migration anterior (20260918000000) esqueceu de remover a
-- constraint antiga UNIQUE(company_id) em anamnesis_forms — ela vinha do
-- desenho original de "1 ficha por empresa", incompatível com "1 ficha por
-- (empresa, segmento)". Sem isso, set_professional_segments falha com
-- unique_violation pra qualquer empresa que já tinha uma ficha (legado).
-- O índice `anamnesis_forms_one_active_per_company_segment` (criado na
-- mesma migration anterior) já garante a invariante certa (só 1 ficha
-- ATIVA por segmento por empresa) — este drop só remove a regra velha.
alter table public.anamnesis_forms drop constraint anamnesis_forms_company_id_unique;
