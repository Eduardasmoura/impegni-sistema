# Configuração de e-mail (SMTP) para produção

**Status:** IMPLEMENTADO / NÃO CONFIGURADO PARA PRODUÇÃO.

Auditado em 10/09/2026 contra o projeto Supabase real (`lcdzrahvhilxvkklulaa`) e
testado ponta a ponta em navegador (Chrome) + Mailinator.

---

## O que existe hoje (e funciona)

| Fluxo | Como está | Testado |
|---|---|---|
| Cadastro profissional → e-mail de confirmação → login | Funciona | ✅ browser real (Chrome + Mailinator): cadastro → link → confirma → login |
| Esqueci a senha → e-mail → redefinir → login | Funciona | ✅ browser real: `/forgot-password` → link `recovery` → `/reset-password` → nova senha → login com a nova senha |
| Cadastro de cliente (web-client, ao agendar) → e-mail de confirmação | Funciona | ✅ chega o e-mail; interrompido só pelo rate limit (abaixo) |
| Convite de dono de empresa criada pelo Super Admin (`admin-create-company` → `auth.admin.inviteUserByEmail`) | Usa o mesmo serviço de e-mail | ⚠️ não reexecutado nesta rodada |
| Reset de senha pelo Super Admin (`admin-reset-user-password`) | Usa o mesmo serviço de e-mail | ⚠️ não reexecutado nesta rodada |

**A confirmação de e-mail está LIGADA e deve continuar ligada.** Não foi
desativada em nenhum momento.

---

## O que falta para produção (3 itens de configuração — não é código)

### 1. SMTP próprio (obrigatório antes de divulgar)

Hoje os e-mails saem de **`Supabase Auth <noreply@mail.app.supabase.io>`** — o
serviço **compartilhado e gratuito** do Supabase. Implicações:

- **Rate limit baixo:** durante os testes batemos em `429 over_email_send_rate_limit`.
  O serviço compartilhado limita ~2–4 e-mails/hora **no projeto inteiro**. A partir
  do 3º/4º cadastro numa hora, as pessoas param de receber o link de confirmação —
  cadastro trava sem erro visível pra elas.
- **Entregabilidade:** remetente genérico do Supabase cai em spam com mais
  frequência; sem SPF/DKIM do domínio de vocês.
- **Marca:** o remetente não é `@inova.app`.

**Como resolver** — Supabase Dashboard → **Authentication → Emails → SMTP Settings**
(ou via `config.toml`, ver abaixo). Provedores testados pela comunidade com o
Supabase: Resend, SendGrid, Amazon SES, Postmark, Brevo.

Precisa de: host, porta (587), usuário, senha/API key, e um **domínio remetente
verificado** (ex.: `nao-responda@inova.app`) com SPF + DKIM publicados no DNS.

Bloco equivalente em `supabase/config.toml` (para versionar; aplicar com
`supabase config push`):

```toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"          # ajuste ao provedor escolhido
port = 587
user = "resend"                    # ajuste ao provedor
pass = "env(SMTP_PASS)"            # NUNCA literal — variável de ambiente
admin_email = "nao-responda@inova.app"
sender_name = "InovaFlow"

[auth.rate_limit]
email_sent = 30                    # por hora; com SMTP próprio pode subir bem
```

> Depois de configurar, **refazer os dois testes**: cadastro→confirmação→login e
> esqueci-a-senha→redefinição→login, com um e-mail real (não Mailinator), e
> confirmar que o remetente é `@inova.app` e que o e-mail não caiu em spam.

### 2. Site URL + Redirect URLs

O código monta os links a partir de `window.location.origin`
(`/login`, `/reset-password`, `/register?returnTo=...`) — está certo. Mas o
GoTrue só respeita esses `redirectTo` se as origens de produção estiverem na
**allow-list**. Hoje os testes redirecionaram para `http://localhost:3000`.

Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://app.inova.app` (ou o domínio real do web-professional)
- **Redirect URLs (allow-list):** adicionar
  - `https://app.inova.app/**`
  - `https://*.inova.app/**` (web-client, agendamento por subdomínio)
  - manter `http://localhost:3000/**` e `http://localhost:3001/**` só se quiser continuar testando local

### 3. Templates de e-mail em português

Os e-mails hoje usam os **templates padrão do Supabase, em inglês** —
"Confirm your email address", "Reset your password". Para um produto BR isso
destoa. Dashboard → **Authentication → Emails → Templates** (ou
`[auth.email.template.*]` no `config.toml`): traduzir e colocar a marca nos 3
que o produto usa: **Confirm signup**, **Reset password**, **Invite user**.

---

## Resumo para o checklist de lançamento

- [ ] SMTP próprio configurado + domínio verificado (SPF/DKIM) — **antes de divulgar**
- [ ] Site URL e Redirect URLs de produção na allow-list
- [ ] Templates traduzidos para PT-BR (Confirm signup / Reset password / Invite user)
- [ ] Reteste real (e-mail de verdade): cadastro→confirmação→login
- [ ] Reteste real: esqueci-a-senha→redefinição→login
- [ ] Verificar convite do Super Admin (`admin-create-company`) com e-mail real
