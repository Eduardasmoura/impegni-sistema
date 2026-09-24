-- Slug oficial da empresa sem separadores: "Kelly Rein" → "kellyrein"
-- (URL pública https://kellyrein.impegni.com.br). Só afeta empresas NOVAS —
-- slugs existentes (ex.: impegni-teste) continuam valendo como estão.
-- Mesma assinatura, SECURITY DEFINER e search_path de antes; CREATE OR
-- REPLACE mantém os GRANTs existentes. Colisão: kellyrein, kellyrein2, ...
-- Subdomínios reservados da plataforma (app, admin, www...) nunca viram
-- slug de empresa — seriam {slug}.impegni.com.br colidindo com o painel.
create or replace function public.generate_unique_slug(base_name text)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  base text;
  candidate text;
  suffix int := 1;
  reserved text[] := array['app','admin','www','api','mail','email','smtp','ftp','blog','ajuda','suporte','status',
                           'painel','dashboard','login','cadastro','static','cdn','assets','impegni','docs','dev','staging'];
begin
  base := lower(trim(base_name));
  base := translate(base, 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
  base := regexp_replace(base, '[^a-z0-9]+', '', 'g');
  if base = '' or base is null then
    base := 'empresa';
  end if;
  candidate := base;
  while candidate = any(reserved) or exists (select 1 from public.companies where slug = candidate) loop
    suffix := suffix + 1;
    candidate := base || suffix::text;
  end loop;
  return candidate;
end;
$function$;
