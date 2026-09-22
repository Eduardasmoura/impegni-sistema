# Backup e recuperação

Este documento não afirma que backup está habilitado — isso depende do plano/configuração do
projeto Supabase (`lcdzrahvhilxvkklulaa`), que nenhuma ferramenta usada nesta auditoria consegue
ler ou alterar (é configuração de billing/infraestrutura, não SQL). O que segue é o que precisa
ser verificado manualmente no [painel do Supabase](https://supabase.com/dashboard/project/lcdzrahvhilxvkklulaa/settings/general)
antes de considerar o backup "resolvido", mais o procedimento de recuperação para quando for preciso.

## O que verificar no painel do Supabase

Em **Database → Backups**:

- [ ] **Plano do projeto** — backups diários automáticos exigem plano Pro ou superior. No plano
      Free, não há backup automático gerenciado pela Supabase.
- [ ] **Point-in-Time Recovery (PITR)** — recurso adicional (não incluso mesmo no Pro por padrão),
      permite restaurar para qualquer segundo dentro da janela de retenção contratada. Relevante
      principalmente para o caso "alguém rodou um DELETE errado às 14h32 e percebeu às 15h10".
- [ ] **Retenção configurada** — quantos dias de backup ficam disponíveis (varia por plano).
- [ ] **Região do projeto** — confirma onde os backups são armazenados fisicamente (relevante para
      LGPD/residência de dados, a depender da política de privacidade final).

Nenhum destes itens foi testado nesta auditoria — não há como restaurar um backup real sem
autorização explícita e uma janela de manutenção, e fazer isso "só para testar" seria destrutivo.

## O que já ajuda a recuperação, independente do plano

- **Nenhuma migration nesta auditoria fez `DROP` de dado real** — todas foram aditivas (novas
  tabelas/colunas/funções) ou correções de função (`CREATE OR REPLACE` / `DROP FUNCTION` seguido de
  `CREATE FUNCTION`, nunca `DROP TABLE`).
- **`audit_logs`** já registra o antes/depois (`old`/`new` em JSON) de toda ação administrativa via
  `admin_update_company`, mudanças de plano, webhooks de pagamento processados, e outras ações
  críticas — isto **não substitui backup** (não recria uma linha apagada), mas ajuda a reconstruir
  manualmente o que mudou e quando, e a auditar um incidente.
- **Não existem migrations `.sql` versionadas neste repositório** (`supabase/README.md` já registra
  isso como pendência anterior a esta auditoria) — todo o histórico de schema vive só no projeto
  remoto. Isso significa que hoje **não é possível recriar o schema do zero a partir do Git** — se
  o projeto Supabase for perdido sem backup, o schema em si (não só os dados) também se perde.
  Recomendação: rodar `supabase db pull` (CLI) para trazer o histórico de migrations para
  `supabase/migrations/` e versionar no Git — não feito nesta auditoria por ser uma mudança de
  processo, não uma correção de bug.

## Procedimento de recuperação (quando PITR/backup estiver confirmado disponível)

1. **Nunca restaurar direto no projeto de produção sem antes criar um branch/cópia** — o Supabase
   permite criar um branch de desenvolvimento a partir de um ponto no tempo; validar ali primeiro.
2. Identificar o timestamp exato do incidente (via `audit_logs`, logs de aplicação, ou relato do
   time) — quanto mais preciso, menor a janela de dado legítimo perdido na restauração.
3. Restaurar nesse ponto no branch de teste.
4. **Validações pós-restauração, antes de promover para produção:**
   - [ ] Contagem de linhas das tabelas críticas (`companies`, `subscriptions`, `appointments`,
         `payments`) bate com o esperado para aquele momento.
   - [ ] Nenhuma empresa real ficou sem `company_members` (owner órfão).
   - [ ] `terms_acceptances` e `pending_onboarding` consistentes (sem referenciar `auth.users`
         inexistentes).
   - [ ] Login de pelo menos um usuário real de teste funciona.
   - [ ] RLS continua habilitada em todas as tabelas (`list_tables` / advisors de segurança).
5. Comunicar aos clientes afetados o que foi perdido (se algo foi), com transparência.

## Não fazer

- Não simular que um backup foi restaurado/testado quando não foi.
- Não alterar configuração de billing/plano do Supabase sem aprovação explícita do responsável
  pelo projeto — isso tem custo financeiro direto.
- Não colocar nenhuma credencial (service_role, senha de banco, token do Asaas) neste documento
  ou em qualquer arquivo versionado no Git.
