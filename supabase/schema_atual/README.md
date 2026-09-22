# Snapshot do schema remoto — 11/09/2026 (última atualização 14/09/2026, após aplicar as migrations 20260914120000 e 20260914130000)

Gerado com `supabase db dump --linked --schema-only` (só estrutura, sem
nenhum dado de cliente) direto do projeto `lcdzrahvhilxvkklulaa`.

Refeito às 17:46 (mesmo dia) imediatamente antes do primeiro commit, pra
garantir que o snapshot representa o estado mais atual possível do banco
remoto. Resultado: **idêntico byte a byte** ao dump anterior (17:28/17:30) —
nenhuma alteração de schema aconteceu no intervalo.

## O que é (e o que não é)

Isto é uma **fotografia do estado atual** do banco, não um histórico de
migrations. Motivo: o projeto acumulou (nas sessões de trabalho anteriores)
mais de 100 alterações aplicadas direto no remoto sem gerar arquivo `.sql`
local correspondente — reconstruir esse histórico exigiria rodar
`supabase migration repair` dezenas de vezes contra a tabela de controle do
próprio banco remoto, o que esta auditoria foi instruída a não fazer
("não altere o banco remoto"). Em vez disso, foi tirada uma cópia fiel do
estado atual — reconstruível, ainda que sem o passo a passo histórico.

As migrations em `supabase/migrations/` (4 arquivos, de 10/09/2026 em
diante) continuam sendo o formato correto pra mudanças **daqui pra frente**.

## Arquivos

- `schema.sql` — schemas `public` e `private` completos: tabelas, colunas,
  constraints (CHECK/FK/UNIQUE), índices, RLS (`ENABLE ROW LEVEL SECURITY`
  em 43 tabelas), 119 `CREATE POLICY`, 84 funções, 65 triggers. Confirmado
  manualmente que as 3 funções/triggers criadas na auditoria de paywall
  desta sessão (`enforce_company_segment_consistency`,
  `enforce_company_goals_exclusivity`, `enforce_company_access_on_company`)
  estão presentes.
- `storage_policies.sql` — schema `storage` (gerenciado pela plataforma,
  por isso fica separado do dump principal, que o exclui por padrão).
  Contém as 11 policies dos buckets `avatars` e `company-assets`.

## O que NÃO está aqui

- Schema `auth` (gerenciado pela Supabase — só aparece referenciado dentro
  de funções nossas, ex. `auth.uid()`, nunca sua própria estrutura).
- Dados (é `--schema-only`, nenhuma linha de tabela).
- Segredos de qualquer tipo — os dois arquivos foram varridos e não contêm
  `service_role`, chaves de API, senhas ou strings de conexão.
- Configuração de Auth (templates de e-mail, SMTP, redirect URLs) — isso
  não é schema de banco, vive na configuração do projeto (ver
  `SMTP_SETUP.md`).
