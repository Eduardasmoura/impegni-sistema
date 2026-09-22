-- BLOCKER 1 (auditoria pré-produção) — página pública durante o trial.
--
-- Antes: toda rota pública de web-client filtra companies.status='active'
-- e a RLS anon de `companies` só expõe 'active'. Empresa nova nasce
-- 'trial' -> {slug}.inova.app dava 404 durante os 14 dias de teste, ou
-- seja: "agendamento online" (a proposta central) não funcionava no
-- trial. A regra de negócio definida é: durante o trial o cliente tem
-- ACESSO COMPLETO; depois do trial sem plano, a página pública continua
-- visível mas informa que os agendamentos estão indisponíveis.
--
-- Aqui: expõe empresas 'trial' para leitura pública (continuam ocultas
-- 'suspended'/'deleted') e adiciona uma função que diz se a empresa está
-- aceitando agendamento agora — a MESMA regra server-side já usada no
-- painel (private.company_has_access), sem vazar datas/status internos.

alter policy companies_select_public_active_anon on public.companies
  using (status in ('active', 'trial'));

alter policy companies_select_members_admin_or_public_active on public.companies
  using (
    status in ('active', 'trial')
    or private.is_company_member(id)
    or private.is_super_admin()
  );

-- Avaliações públicas: idem, visíveis também para empresa em trial.
alter policy reviews_select_public_published on public.reviews
  using (
    status = 'published'
    and exists (
      select 1 from public.companies co
      where co.id = reviews.company_id and co.status in ('active', 'trial')
    )
  );

-- "Esta empresa está aceitando agendamento online agora?" — true no trial
-- ativo e no plano pago; false no trial vencido / assinatura inativa /
-- empresa suspensa. Reaproveita a regra única do backend.
create or replace function public.public_company_is_bookable(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select private.company_has_access(p_company_id);
$function$;

revoke all on function public.public_company_is_bookable(uuid) from public;
grant execute on function public.public_company_is_bookable(uuid) to anon, authenticated;
