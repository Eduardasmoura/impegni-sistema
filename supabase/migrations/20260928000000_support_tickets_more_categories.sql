-- Central de Ajuda: novas categorias no formulário "Falar com o suporte"
-- (Pagamentos, Pacotes recorrentes, Clientes). Só AMPLIA o CHECK: as
-- categorias antigas (inclusive 'duvida' e 'sugestao') continuam válidas para
-- os chamados já registrados. Nenhuma linha é alterada.
alter table public.support_tickets drop constraint if exists support_tickets_category_check;
alter table public.support_tickets add constraint support_tickets_category_check check (
  category is null or category in (
    'problema_tecnico', 'agenda', 'financeiro', 'pagamentos', 'pacotes', 'clientes', 'conta', 'outro',
    'duvida', 'sugestao'
  )
);
