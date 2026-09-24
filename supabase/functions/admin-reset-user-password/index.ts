// Edge Function: admin-reset-user-password
//
// "Redefinir acesso" no painel Super Admin: dispara o e-mail de
// redefinição de senha de verdade pro usuário (mesmo fluxo self-service de
// "esqueci minha senha"), sem o Super Admin nunca ver ou manipular a senha
// em si — só aciona o envio. Edge Function porque precisa resolver o
// e-mail a partir do user_id via `service_role` antes de disparar.

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

  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return jsonResponse({ error: "invalid session" }, 401);

  const { data: callerProfile } = await callerClient.from("profiles").select("role_platform").eq("id", caller.id).single();
  if (callerProfile?.role_platform !== "super_admin") {
    return jsonResponse({ error: "only super_admin can reset user access" }, 403);
  }

  let payload: { user_id?: string; redirect_to?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }
  if (!payload.user_id) return jsonResponse({ error: "user_id is required" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: targetUser, error: targetUserError } = await admin.auth.admin.getUserById(payload.user_id);
  if (targetUserError || !targetUser?.user?.email) {
    return jsonResponse({ error: "user not found" }, 404);
  }

  // `resetPasswordForEmail` no client anônimo é o MESMO caminho do
  // self-service "esqueci minha senha" — manda o e-mail de verdade via
  // provedor configurado no projeto; não expõe nenhum link pro Super Admin.
  const anonAuthClient = createClient(supabaseUrl, anonKey);
  const redirectTo = payload.redirect_to || Deno.env.get("WEB_PROFESSIONAL_URL") || "https://app.impegni.com.br";
  const { error: sendError } = await anonAuthClient.auth.resetPasswordForEmail(targetUser.user.email, {
    // Via /auth/callback: este e-mail chega no fluxo implícito (tokens no
    // fragmento), que o /reset-password (PKCE) não consegue ler sozinho.
    redirectTo: `${redirectTo.replace(/\/$/, "")}/auth/callback`,
  });
  if (sendError) return jsonResponse({ error: sendError.message }, 500);

  await admin.from("audit_logs").insert({
    actor_id: caller.id,
    action: "user.reset_access",
    target_table: "auth.users",
    target_id: payload.user_id,
    payload: { email: targetUser.user.email },
  });

  return jsonResponse({ ok: true, email: targetUser.user.email });
});
