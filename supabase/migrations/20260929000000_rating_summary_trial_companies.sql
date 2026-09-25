-- Página pública da empresa: "Avaliações 0.0 · 0" mesmo com avaliação
-- publicada. A lista de avaliações segue a policy reviews_select_public_published
-- (empresa 'active' OU 'trial'), mas o resumo exigia só 'active' — em empresa
-- em período de teste a lista aparecia e o resumo zerava. Alinha o resumo à
-- mesma regra de visibilidade da policy. Assinatura, SECURITY DEFINER e
-- permissões ficam iguais (create or replace preserva os grants).
create or replace function public.get_company_rating_summary(p_company_id uuid)
returns table (average numeric, total integer)
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(round(avg(r.rating), 1), 0)::numeric, count(*)::integer
  from public.reviews r
  join public.companies c on c.id = r.company_id
  where r.company_id = p_company_id
    and r.status = 'published'
    and c.status in ('active', 'trial');
$$;
