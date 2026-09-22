# Snapshot do schema remoto — atualizado em 22/09/2026 (release candidate de produção)

Gerado com `supabase db dump --linked --schema public,private --keep-comments`
(estrutura completa, sem dado de cliente) e `supabase db dump --linked
--schema storage --keep-comments`, direto do projeto `lcdzrahvhilxvkklulaa`.
Reflete o estado do banco **depois** da migration `20260921000000` (a mais
recente aplicada nesta rodada).

## O que é (e o que não é)

Isto é a **fotografia do estado atual** do banco, não um histórico linha a
linha de migrations. Motivo: o projeto acumulou, em sessões de trabalho
anteriores a 10/09/2026, uma centena e meia de alterações aplicadas direto no
remoto sem gerar arquivo `.sql` local correspondente. Reconstruir esse
histórico dia a dia não é possível de forma confiável a esta altura — a
fotografia completa cobre a mesma necessidade (reproduzir o schema do zero)
sem inventar uma sequência de migrations que nunca existiu como arquivo.

Reconciliação feita em 22/09/2026 com `supabase migration list --linked`:

- **138 migrations aplicadas no remoto** ao todo.
- **18 têm arquivo `.sql` correspondente** em `supabase/migrations/` (de
  10/09/2026 em diante) — todas agora **corretamente marcadas como
  aplicadas** na tabela de controle do Supabase (`supabase migration
  repair --status applied` rodado para as 4 de 10/09/2026 que tinham o
  arquivo local mas não constavam na tabela de controle — nenhuma mudança
  de schema, só a metadata de rastreamento; as outras 14, de 14/09/2026 em
  diante, já estavam corretamente registradas).
- **120 não têm arquivo local** (tudo aplicado antes de 10/09/2026) — é
  exatamente o que este snapshot substitui como baseline reproduzível.

As migrations em `supabase/migrations/` continuam sendo o formato correto
para mudanças **daqui pra frente**. Nenhuma migration foi apagada ou
reescrita nesta rodada.

## Como reproduzir o schema do zero

1. Rodar `schema.sql` (schemas `public` e `private`) num Postgres novo.
2. Rodar `storage_policies.sql` (schema `storage`, gerenciado pela
   plataforma Supabase — por isso fica separado do dump principal, que o
   exclui por padrão).
3. **Não** reaplicar os arquivos de `supabase/migrations/` por cima — seus
   efeitos já estão inclusos neste snapshot (ele foi tirado depois de todas
   as 18). Esses arquivos continuam existindo só como registro histórico de
   *o que* mudou e *por quê* em cada um, e como ponto de partida para a
   próxima migration real.

## Arquivos

- `schema.sql` — schemas `public` e `private` completos: tabelas, colunas,
  constraints (CHECK/FK/UNIQUE), índices, RLS (`ENABLE ROW LEVEL SECURITY`
  em 52 tabelas), 132 `CREATE POLICY`, 94 funções, 71 triggers.
- `storage_policies.sql` — schema `storage`: 11 policies dos buckets
  `avatars` e `company-assets`.

## O que NÃO está aqui

- Schema `auth` (gerenciado pela Supabase — só aparece referenciado dentro
  de funções nossas, ex. `auth.uid()`, nunca sua própria estrutura).
- Dados (é schema-only, nenhuma linha de tabela).
- Segredos de qualquer tipo — os dois arquivos foram varridos (padrões de
  JWT, `service_role` como valor, PEM, senha) e não contêm nenhum. As
  ocorrências da palavra `service_role` que existem são nomes do papel do
  Postgres em `GRANT ... TO "service_role"`, não a chave em si.
- Configuração de Auth (templates de e-mail, SMTP, redirect URLs) — isso
  não é schema de banco, vive na configuração do projeto (ver
  `SMTP_SETUP.md`).
