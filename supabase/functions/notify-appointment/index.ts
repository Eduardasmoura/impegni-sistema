// Edge Function: notify-appointment
//
// Disparada por um trigger em `public.appointments` (migration
// 011_realtime_appointments_and_notify_trigger, reescrita na 069) sempre
// que um agendamento é criado, reagendado ou tem o status alterado. Busca
// o token de push do profissional responsável (`device_tokens`) e envia
// uma notificação via FCM HTTP v1.
//
// SEC-02 (auditoria de segurança): `verify_jwt=true` só garante que a
// requisição carregue *algum* JWT válido do projeto — a chave pública `anon`
// também qualifica, então sem uma checagem própria qualquer pessoa com a
// chave anon (pública por definição) conseguia chamar esta function com
// qualquer `appointment_id` e fazer leituras cross-tenant com service_role.
// Por isso também exigimos um segredo compartilhado, conhecido só pelo
// trigger do banco (Supabase Vault, secret `notify_appointment_secret`) e
// por esta function (Edge Function secret `NOTIFY_APPOINTMENT_SECRET`).
//
// CORREÇÃO DE SEGURANÇA (auditoria "notify-appointment / secret
// comprometido"): esta function tinha um valor de fallback hardcoded no
// código-fonte, usado sempre que `NOTIFY_APPOINTMENT_SECRET` não estivesse
// configurado no ambiente. Esse valor NÃO era um placeholder antigo — era
// idêntico ao secret real então ativo no Vault, ou seja, o segredo de
// verdade ficava exposto em texto plano pra qualquer pessoa com acesso ao
// código/painel da function. Removido: agora a function exige
// `NOTIFY_APPOINTMENT_SECRET` configurado (`supabase secrets set`, fora do
// alcance deste agente — ação manual, ver runbook do projeto) e falha de
// forma segura e controlada (500, sem detalhes sensíveis) se não estiver.
// Sem fallback, sem secret no código, sem secret nos logs.
//
// A falha desta function NUNCA impede a criação/atualização do
// agendamento: o trigger chama via `net.http_post` dentro de um `perform`
// (fire-and-forget, não aguarda resposta) — a transação em `appointments`
// já terminou antes desta function sequer começar a rodar.
//
// Requer também o secret FIREBASE_SERVICE_ACCOUNT (JSON da conta de
// serviço do Firebase, veja mobile/barber_inova_app/README.md) configurado
// no projeto. Sem esse secret, a function loga um aviso e retorna 200 sem
// quebrar o trigger que a chamou — o app continua funcionando normalmente
// sem push.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type NotifyPayload = {
  appointment_id: string;
  event: "created" | "rescheduled" | "status_changed";
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "agendado",
  in_progress: "em andamento",
  completed: "concluído",
  canceled: "cancelado",
  no_show: "não compareceu",
};

// Título por tipo de evento — só 'created' e 'rescheduled' têm texto
// próprio; 'status_changed' continua caindo no texto genérico de status.
const TITLE_BY_EVENT: Partial<Record<NotifyPayload["event"], string>> = {
  created: "Novo agendamento",
  rescheduled: "Horário alterado",
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Sem fallback: se o secret não estiver configurado no ambiente da
  // function, falha de forma segura (nunca aceita a requisição sem um
  // segredo real pra comparar, nunca loga o valor de nada).
  const expectedSecret = Deno.env.get("NOTIFY_APPOINTMENT_SECRET");
  if (!expectedSecret) {
    console.error("notify-appointment: NOTIFY_APPOINTMENT_SECRET não configurado no ambiente da function — recusando a requisição (sem fallback). Configure o secret (ver runbook do projeto) e reimplante.");
    return new Response(JSON.stringify({ error: "server not configured" }), { status: 500 });
  }
  const providedSecret = req.headers.get("x-notify-secret");
  if (!providedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json body" }), { status: 400 });
  }
  if (!payload.appointment_id) {
    return new Response(JSON.stringify({ error: "appointment_id is required" }), { status: 400 });
  }

  // service_role: só existe dentro da Edge Function (env injetada
  // automaticamente pelo Supabase), nunca chega em nenhum client — é o que
  // permite ler appointments/professionals/device_tokens ignorando RLS.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, status, scheduled_at, professional_id, clients(name), services(name)")
    .eq("id", payload.appointment_id)
    .maybeSingle();

  if (appointmentError || !appointment) {
    console.error("notify-appointment: appointment not found", appointmentError);
    return new Response(JSON.stringify({ error: "appointment not found" }), { status: 404 });
  }

  const { data: professional } = await supabase
    .from("professionals")
    .select("user_id, name")
    .eq("id", appointment.professional_id)
    .maybeSingle();

  if (!professional?.user_id) {
    // Profissional sem conta própria (só cadastro) — não tem pra quem
    // mandar push, mas não é um erro.
    return new Response(JSON.stringify({ skipped: "professional has no linked user" }), { status: 200 });
  }

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("fcm_token")
    .eq("user_id", professional.user_id);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ skipped: "no device tokens for professional" }), { status: 200 });
  }

  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    console.warn("notify-appointment: FIREBASE_SERVICE_ACCOUNT not configured, skipping push send");
    return new Response(JSON.stringify({ skipped: "FIREBASE_SERVICE_ACCOUNT not configured" }), { status: 200 });
  }

  const clienteNome = (appointment as unknown as { clients: { name: string } | null }).clients?.name ?? "Cliente";
  const servicoNome = (appointment as unknown as { services: { name: string } | null }).services?.name ?? "Atendimento";
  // Pra 'rescheduled' isso já é o horário NOVO — o trigger dispara depois
  // do UPDATE, então `appointment.scheduled_at` já reflete o valor atual.
  const horario = new Date(appointment.scheduled_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const title = TITLE_BY_EVENT[payload.event] ?? `Agendamento ${STATUS_LABEL[appointment.status] ?? appointment.status}`;
  const body = `${clienteNome} · ${servicoNome} · ${horario}`;

  try {
    const accessToken = await getFirebaseAccessToken(JSON.parse(serviceAccountJson));
    const projectId = JSON.parse(serviceAccountJson).project_id;

    // MOB-parity fase 5: `data.route` é o deep link que o app abre direto ao
    // tocar na notificação (ver `push_service.dart`, `_abrirRotaDoPush`) —
    // todo agendamento (novo, reagendado ou com status mudado) pertence à
    // Agenda. push_service.dart valida contra uma allow-list antes de
    // navegar, então uma rota inesperada aqui nunca quebra o app.
    const results = await Promise.allSettled(
      tokens.map((t) => sendFcmMessage(projectId, accessToken, t.fcm_token, title, body, "/agenda"))
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    return new Response(JSON.stringify({ sent: tokens.length - failed, failed }), { status: 200 });
  } catch (err) {
    console.error("notify-appointment: failed to send push", err);
    return new Response(JSON.stringify({ error: "failed to send push" }), { status: 200 });
  }
});

// --- Autenticação Firebase (OAuth2 service account -> access token) --------

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const contents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binaryDer = Uint8Array.from(atob(contents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getFirebaseAccessToken(account: ServiceAccount): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const key = await importPrivateKey(account.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`oauth2 token exchange failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.access_token as string;
}

async function sendFcmMessage(projectId: string, accessToken: string, token: string, title: string, body: string, route?: string) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        ...(route ? { data: { route } } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`fcm send failed: ${res.status} ${await res.text()}`);
  return res.json();
}
