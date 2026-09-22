# Impegni — Super Admin

Painel restrito à equipe da plataforma (não das empresas clientes). Primeira
versão: gestão de empresas (status, e liberar/bloquear a Ficha de Anamnese —
recurso premium ainda não construído, só a flag).

## Promovendo o primeiro Super Admin

Não existe cadastro público aqui — crie a conta normalmente pelo
`web-client` ou `web-professional` (ou pelo dashboard do Supabase), pegue o
`id` do usuário em `auth.users`, e rode:

```sql
update public.profiles set role_platform = 'super_admin' where id = '<uuid-do-usuário>';
```

Depois disso, o login neste app libera `/empresas`.

## Rodando localmente

```bash
npm run dev   # http://localhost:3002
```
