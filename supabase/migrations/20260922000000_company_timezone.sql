-- Timezone por empresa.
--
-- Problema real (achado na auditoria de lançamento): o horário de um
-- agendamento é montado no frontend a partir de uma data/hora "de parede"
-- (ex.: 25/09 14:00) usando o fuso do DISPOSITIVO do usuário, não o da
-- empresa. Hoje isso não causa erro nenhum porque toda empresa é do Brasil
-- e todo mundo testado está em horário de Brasília — mas quebra o instante
-- para uma empresa ou cliente fora desse fuso.
--
-- Esta migration só prepara a arquitetura: adiciona a coluna com o padrão
-- correto para 100% das empresas existentes hoje, sem mudar nenhum
-- agendamento, view ou função já em produção. As RPCs de disponibilidade
-- (`get_availability_day/month`, `book_appointment`, o trigger de
-- validação de expediente) continuam fixas em 'America/Sao_Paulo' — trocar
-- isso por `companies.timezone` é um passo separado, deliberadamente fora
-- desta migration, para quando alguma empresa realmente precisar de outro
-- fuso (ver supabase/README.md).
alter table public.companies
  add column timezone text not null default 'America/Sao_Paulo';

-- Valida contra a lista de timezones IANA que o próprio Postgres conhece.
-- Não dá pra fazer isso como CHECK CONSTRAINT (Postgres não permite
-- subquery em CHECK), então é um trigger — barato (roda só em
-- INSERT/UPDATE de companies, índice de pg_timezone_names é pequeno) e
-- evita salvar um valor sem sentido tipo 'Brasil/Sao_Paulo' ou 'GMT-3' que
-- quebraria silenciosamente qualquer conversão futura.
create function private.enforce_company_timezone_valid()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'timezone inválido: %', new.timezone;
  end if;
  return new;
end;
$$;

create trigger companies_timezone_valid
  before insert or update of timezone on public.companies
  for each row execute function private.enforce_company_timezone_valid();

comment on column public.companies.timezone is
  'Fuso IANA (ex.: America/Sao_Paulo) usado para montar o instante (scheduled_at) de um agendamento a partir da data/hora de parede escolhida no frontend. Todas as empresas existentes foram migradas com America/Sao_Paulo (nenhuma mudança de comportamento). As funções de disponibilidade/expediente no banco ainda não leem esta coluna — ver comentário no topo do arquivo.';
