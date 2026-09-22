# Checklist pré-lançamento — InovaFlow

Atualizado na auditoria de 04/09/2026. `[x]` = testado de verdade nesta auditoria (contra o banco
de produção real, ou via chamada HTTP real) e confirmado funcionando. `[ ]` = pendente, com o
motivo explicado ao lado. Nada aqui foi marcado sem execução real — ver os relatórios detalhados
publicados durante o trabalho para a evidência de cada item.

## Segurança

- [x] RLS habilitada e forçada em todas as tabelas de produto, incluindo as criadas nesta
      auditoria (`terms_acceptances`, `payment_webhook_events`) — testado tentando acesso
      cross-tenant de verdade, não só lendo a policy.
- [x] Multi-tenancy — empresa A não lê/edita/apaga/insere dado da empresa B (testado nas 4
      operações, em `companies`, `clients`, `professionals`, `services`, `company_goals`).
- [x] Webhook de pagamento autenticado por token obrigatório (sem fallback hardcoded) — testado
      via chamada HTTP real (sem token e com token errado, ambos 401).
- [x] Nenhum secret (`service_role`, `ASAAS_WEBHOOK_TOKEN`) exposto em nenhum dos 4 apps frontend
      — verificado por busca em todo o código-fonte.
- [x] Autenticação (signUp/login/confirmação de e-mail) preservada sem alteração de lógica.
- [ ] Revisão de segurança por terceiro (pentest) — fora do escopo de qualquer auditoria feita por
      IA; recomendado antes de escalar para muitos clientes pagantes.

## Contrato

- [x] Contrato disponível em `/contrato`, acessível sem login (corrigido nesta auditoria — o
      middleware bloqueava essa rota antes).
- [x] Versão centralizada em uma constante (`CURRENT_TERMS_VERSION`, hoje `"1.0"`).
- [x] Aceite obrigatório (checkbox bloqueante) antes de concluir o cadastro.
- [x] Aceite registrado em tabela própria (`terms_acceptances`), nunca sobrescrito, vinculado à
      empresa automaticamente quando o onboarding conclui.
- [x] IP capturado server-side (via header `x-forwarded-for` exposto pelo PostgREST) — testado com
      uma chamada HTTP real; **limitação conhecida e documentada**: esse header pode, em teoria,
      ser forjado por quem controla a própria chamada de rede, então não é uma garantia forense
      contra o próprio autor do aceite mentir sobre seu IP — é best-effort, correto na esmagadora
      maioria dos casos reais.
- [x] User-agent registrado.
- [x] Timestamp do servidor (`now()`), não do cliente.
- [ ] **Revisão jurídica pendente** — cláusulas 20 (limitação de responsabilidade) e 23 (foro)
      marcadas explicitamente no próprio texto como não revisadas por advogado.

## Trial

- [x] 14 dias exatos, contados do timestamp de criação da empresa (não do último login) —
      reconfirmado com empresa nova nesta auditoria.
- [x] Expiração bloqueia server-side (`get_company_access_status`), testado com registro real de
      trial vencido.
- [x] Bloqueio não exclui nenhum dado da empresa.
- [x] Pagamento/plano ativo desbloqueia — testado marcando uma assinatura de teste como `active`.

## Pagamentos

- [x] Webhook idempotente por hash do payload — reenvio do mesmo evento não duplica pagamento nem
      reprocessa (testado: 2ª chamada com o mesmo conteúdo é ignorada e logada como duplicada).
- [x] Proteção contra evento fora de ordem — assinatura em status terminal (`canceled`/`expired`)
      não é reaberta por um webhook atrasado (testado: cancelamento seguido de confirmação
      atrasada mantém `canceled`).
- [x] Log estruturado de todo evento recebido (`payment_webhook_events`), incluindo os ignorados e
      o motivo.
- [ ] **Teste em sandbox real do Asaas** — a lógica de negócio foi extensivamente testada via SQL
      simulando os payloads; a Edge Function em si só pôde ser testada até o ponto de autenticação
      (401 sem token/com token errado), porque o secret real (`ASAAS_WEBHOOK_TOKEN`) não está
      acessível fora do projeto Supabase. Recomendado testar com um evento real de sandbox antes
      do primeiro cliente pagante de verdade.

## Infraestrutura

- [ ] Backup automático / PITR — depende do plano do projeto Supabase, não verificável por esta
      auditoria. Ver `BACKUP_AND_RECOVERY.md`.
- [ ] Observabilidade de erros de aplicação (Sentry ou equivalente) — não configurado; exigiria
      uma conta/DSN reais que esta auditoria não tem como criar ou validar. `audit_logs` cobre
      ações de negócio, não exceptions de runtime.
- [ ] Migrations `.sql` versionadas no Git — hoje só existem no projeto remoto (ver
      `supabase/README.md`).

## Testes

- [x] Concorrência de agendamento — `EXCLUDE CONSTRAINT` no banco impede 2 agendamentos
      sobrepostos para o mesmo profissional, testado com inserção real sobreposta (rejeitada).
- [x] Duplo clique / idempotência do onboarding — `complete_company_onboarding` chamado 2x
      devolve a mesma empresa, sem duplicar `company_members`/`subscriptions`/`company_goals`.
- [x] Cross-device do onboarding — rascunho gravado sem sessão nenhuma (simulando o momento
      logo após o cadastro) e recuperado por uma sessão autenticada completamente separada.
- [ ] Desktop, mobile, tablet reais — ver `BROWSER_TEST_CHECKLIST.md`, nada executado ainda.

---

## Avaliação de risco de lançamento

**PRONTO PARA BETA.**

O núcleo técnico (multi-tenancy, RLS, trial, idempotência, concorrência de agenda, webhook de
pagamento) está implementado e comprovadamente testado contra o banco real — não apenas lido ou
assumido. As duas pendências que impedem "pronto para lançamento" pleno são decisões que não cabem
a uma auditoria de código: **revisão jurídica do contrato** e **confirmação/teste em ambiente de
pagamento real (sandbox do Asaas)**. Nenhuma delas é um problema de engenharia não resolvido — são,
respectivamente, uma dependência de um profissional do direito e uma dependência de acesso a
credenciais/sandbox que este trabalho não possui.
