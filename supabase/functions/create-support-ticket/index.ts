// Edge Function: create-support-ticket
//
// "Ajuda e Suporte" do painel do profissional. Registra o chamado em
// public.support_tickets (histórico / tela Suporte do Super Admin) e avisa a
// equipe por e-mail via API do Resend.
//
// Segurança: a empresa é derivada do usuário autenticado (company_members
// ativos) — um company_id vindo do navegador só é aceito se o usuário for
// membro ativo dela. A inserção usa service_role só aqui dentro.
//
// Secrets: RESEND_API_KEY (envio) e SUPPORT_EMAIL_TO (destinatário). Sem a
// chave do Resend o chamado é registrado mesmo assim (email_sent=false) —
// a equipe continua vendo em Super Admin → Suporte.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CATEGORIES: Record<string, string> = {
  problema_tecnico: "Problema técnico",
  agenda: "Agenda",
  financeiro: "Financeiro",
  conta: "Cadastro/Conta",
  duvida: "Dúvida sobre o sistema",
  sugestao: "Sugestão",
  outro: "Outro",
};

const ALLOWED_ORIGINS = new Set(
  ["http://localhost:3000", Deno.env.get("WEB_PROFESSIONAL_URL")?.replace(/\/$/, "")].filter((v): v is string => !!v)
);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  let body: { subject?: string; category?: string; message?: string; company_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json body" }, 400);
  }
  const subject = (body.subject ?? "").trim();
  const category = (body.category ?? "").trim();
  const message = (body.message ?? "").trim();
  if (!subject || subject.length > 150) return json({ error: "subject is required (max 150)" }, 400);
  if (!CATEGORIES[category]) return json({ error: "invalid category" }, 400);
  if (!message || message.length > 5000) return json({ error: "message is required (max 5000)" }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Empresa do usuário autenticado (vínculo ativo). company_id do navegador
  // só serve para escolher entre empresas das quais ele JÁ é membro.
  const { data: memberships } = await admin
    .from("company_members")
    .select("company_id, created_at, companies(id, name, slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  const membership = (memberships ?? []).find((m) => m.company_id === body.company_id) ?? (memberships ?? [])[0];
  if (!membership) return json({ error: "no active company for this user" }, 403);
  const company = membership.companies as unknown as { id: string; name: string; slug: string };

  // Proteção contra envio duplicado (duplo clique / reenvio): mesmo usuário,
  // mesmo assunto e mensagem nos últimos 2 minutos → devolve o chamado existente.
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("support_tickets")
    .select("id, created_at")
    .eq("company_id", company.id)
    .eq("opened_by", user.id)
    .eq("subject", subject)
    .eq("description", message)
    .gte("created_at", since)
    .limit(1);
  if (recent && recent.length > 0) {
    return json({ ticket_id: recent[0].id, duplicate: true, email_sent: null });
  }

  const { data: ticket, error: insertError } = await admin
    .from("support_tickets")
    .insert({ company_id: company.id, opened_by: user.id, subject, description: message, category, status: "open", priority: "normal" })
    .select("id, created_at")
    .single();
  if (insertError || !ticket) {
    console.error("[create-support-ticket] insert", insertError?.message);
    return json({ error: "could not register ticket" }, 500);
  }

  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const nome = profile?.full_name || user.email || "—";
  const quando = new Date(ticket.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

  // E-mail para a equipe (Resend). Falha no e-mail não desfaz o chamado.
  let emailSent = false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("SUPPORT_EMAIL_TO");
  if (resendKey && to) {
    const linhas: [string, string][] = [
      ["Empresa", `${company.name} (${company.slug})`],
      ["ID da empresa", company.id],
      ["Profissional", nome],
      ["E-mail", user.email ?? "—"],
      ["Categoria", CATEGORIES[category]],
      ["Assunto", subject],
      ["Data/hora", `${quando} (horário de Brasília)`],
      ["ID da solicitação", ticket.id],
    ];
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1C1B21;max-width:640px">
<h2 style="margin:0 0 16px">Nova solicitação de suporte — Impegni</h2>
<table style="border-collapse:collapse;width:100%;font-size:14px">${linhas
      .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b6b76;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 0"><strong>${escapeHtml(v)}</strong></td></tr>`)
      .join("")}</table>
<p style="margin:20px 0 6px;color:#6b6b76;font-size:14px">Mensagem</p>
<div style="white-space:pre-wrap;border:1px solid #e5e2dc;border-radius:8px;padding:12px;font-size:14px;line-height:1.5">${escapeHtml(message)}</div>
<p style="margin-top:20px;font-size:12px;color:#6b6b76">Responda este e-mail para falar direto com o profissional. SLA de resposta: até 24 horas.</p>
</div>`;
    const text = `Nova solicitação de suporte — Impegni\n\n${linhas.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nMensagem:\n${message}`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Impegni Suporte <nao-responda@impegni.com.br>",
          to: [to],
          reply_to: user.email ?? undefined,
          subject: `[Suporte] ${CATEGORIES[category]} — ${subject}`,
          html,
          text,
        }),
      });
      emailSent = res.ok;
      if (!res.ok) console.error("[create-support-ticket] resend", res.status, (await res.text()).slice(0, 300));
    } catch (e) {
      console.error("[create-support-ticket] resend fetch", (e as Error).message);
    }
  } else {
    console.error("[create-support-ticket] RESEND_API_KEY ou SUPPORT_EMAIL_TO não configurado — chamado registrado sem e-mail");
  }

  return json({ ticket_id: ticket.id, email_sent: emailSent });
});
