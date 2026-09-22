// Edge Function: admin-impersonate
//
// "Acessar como empresa": gera uma sessão real (magic link) pra um usuário
// de uma empresa, sem NUNCA revelar a senha dele — só quem já tem
// `service_role` (aqui dentro, nunca no browser) consegue emitir esse link
// via `auth.admin.generateLink`. Precisa ser Edge Function pelo mesmo
// motivo de admin-create-company: essa chamada de admin só existe com
// service_role.
//
// Toda chamada registra uma linha em `impersonation_sessions` (quem, qual
// empresa, qual usuário, motivo, início) e em `audit_logs` — o encerramento
// (fim da sessão) é feito depois pela RPC `admin_end_impersonation`.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS (auditoria ETAPA 1, item "CORS wildcard"): só o painel Super Admin
// chama esta function — restringe a esse único caller em vez de "*".
// `WEB_SUPERADMIN_URL` é opcional (secret a configurar quando o domínio de
// produção existir); sem ele, só localhost:3002 (dev) é aceito.
const ALLOWED_ORIGINS = new Set(
  ["http://localhost:3002", Deno.env.get("WEB_SUPERADMIN_URL")?.replace(/\/$/, "")].filter(
    (v): v is string => !!v
  )
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

type Payload = { company_id?: string; target_user_id?: string; reason?: string; redirect_to?: string };

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Client "como quem chamou" — só pra confirmar que é super_admin de
  // verdade (mesmo padrão de admin-create-company).
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return jsonResponse({ error: "invalid session" }, 401);

  const { data: callerProfile } = await callerClient.from("profiles").select("role_platform").eq("id", caller.id).single();
  if (callerProfile?.role_platform !== "super_admin") {
    return jsonResponse({ error: "only super_admin can impersonate" }, 403);
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }
  if (!payload.company_id) return jsonResponse({ error: "company_id is required" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: company } = await admin.from("companies").select("id, name").eq("id", payload.company_id).single();
  if (!company) return jsonResponse({ error: "company not found" }, 404);

  // Se não veio um target_user_id específico, usa o owner da empresa —
  // é sempre o membro mais representativo pra investigar um problema.
  let targetUserId = payload.target_user_id ?? null;
  if (!targetUserId) {
    const { data: owner } = await admin
      .from("company_members")
      .select("user_id")
      .eq("company_id", payload.company_id)
      .eq("role_empresa", "owner")
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    targetUserId = owner?.user_id ?? null;
  }
  if (!targetUserId) return jsonResponse({ error: "no active owner found for this company — pass target_user_id explicitly" }, 400);

  // Confirma que o usuário-alvo é mesmo membro DESSA empresa (nunca aceita
  // um target_user_id de fora do tenant informado).
  const { data: membership } = await admin
    .from("company_members")
    .select("id, role_empresa")
    .eq("company_id", payload.company_id)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (!membership) return jsonResponse({ error: "target user is not a member of this company" }, 400);

  const { data: targetUser, error: targetUserError } = await admin.auth.admin.getUserById(targetUserId);
  if (targetUserError || !targetUser?.user?.email) {
    return jsonResponse({ error: "could not resolve target user's email" }, 500);
  }

  const redirectTo = payload.redirect_to || Deno.env.get("WEB_PROFESSIONAL_URL") || "http://localhost:3000";
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetUser.user.email,
    options: { redirectTo: `${redirectTo.replace(/\/$/, "")}/auth/callback` },
  });
  if (linkError || !link) {
    return jsonResponse({ error: `failed to generate access link: ${linkError?.message}` }, 500);
  }

  const { data: session, error: sessionError } = await admin
    .from("impersonation_sessions")
    .insert({
      admin_id: caller.id,
      company_id: payload.company_id,
      target_user_id: targetUserId,
      reason: payload.reason || null,
    })
    .select()
    .single();
  if (sessionError) return jsonResponse({ error: sessionError.message }, 500);

  await admin.from("audit_logs").insert({
    actor_id: caller.id,
    company_id: payload.company_id,
    action: "impersonate.start",
    target_table: "impersonation_sessions",
    target_id: session.id,
    payload: { target_user_id: targetUserId, target_role: membership.role_empresa, reason: payload.reason || null, company_name: company.name },
  });

  return jsonResponse({ url: link.properties.action_link, session_id: session.id, target_email: targetUser.user.email });
});
