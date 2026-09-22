-- BLOCKER 1 (cont.) — o diretório público ("Encontre seu salão") deve
-- listar empresas que estão realmente aceitando agendamento agora:
-- 'active' + trial dentro dos 14 dias. Empresa com trial vencido e sem
-- plano some do diretório (a página dela por link direto continua
-- abrindo, com aviso de indisponível). Evita listar negócio "morto".
create or replace function public.public_directory_companies()
returns setof public.companies
language sql
stable
security definer
set search_path to ''
as $function$
  select c.*
  from public.companies c
  where c.status in ('active', 'trial')
    and private.company_has_access(c.id)
  order by c.name;
$function$;

revoke all on function public.public_directory_companies() from public;
grant execute on function public.public_directory_companies() to anon, authenticated;
