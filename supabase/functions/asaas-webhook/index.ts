// Edge Function: asaas-webhook
//
// Endpoint público chamado pelo Asaas quando o status de uma cobrança muda
// (criada, confirmada, atrasada, estornada...). A função em si ficou fina
// de propósito: só autentica a chamada e calcula um identificador estável
// do evento; toda a lógica de negócio (idempotência, proteção contra
// evento fora de ordem, atualização de subscriptions/payments, audit_logs)
// mora agora em `private.process_asaas_webhook_event` (ver migration
// payment_webhook_idempotency) — testável via SQL, o que esta função
// sozinha nunca foi (sem sandbox de pagamento nem o secret do webhook
// disponíveis fora de produção).
//
// Não usa verify_jwt (o Asaas não manda um JWT do Supabase) — em vez disso
// exige o header `asaas-access-token`, mecanismo de autenticação de webhook
// nativo do próprio Asaas (configurável em Configurações > Webhooks). Sem o
// token certo, qualquer request é recusada antes de tocar no banco.
//
// BLOCKER #3 (auditoria pré-produção) — RESOLVIDO: o fallback hardcoded que
// existia aqui (`WEBHOOK_TOKEN_FALLBACK`) foi removido de vez. O secret
// `ASAAS_WEBHOOK_TOKEN` agora é OBRIGATÓRIO — sem ele configurado no
// projeto, a função nega toda requisição (500), nunca aceita um valor
// hardcoded no código.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Identificador estável do evento pra dedup — o Asaas não manda um ID de
// entrega/retry neste formato de payload, então o hash do corpo bruto
// recebido é a chave real: um reenvio genuíno (retry de webhook) manda
// bytes idênticos e bate o mesmo hash; um evento novo, mesmo que sobre o
// mesmo pagamento, quase sempre difere em algum campo (status, valor,
// data) e gera um hash novo.
async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!expectedToken) {
    console.error("asaas-webhook: ASAAS_WEBHOOK_TOKEN não configurado no projeto — recusando todas as requisições até ser configurado (supabase secrets set).");
    return jsonResponse({ error: "server not configured" }, 500);
  }
  const providedToken = req.headers.get("asaas-access-token");
  if (!providedToken || providedToken !== expectedToken) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const rawBody = await req.text();
  let body: { event?: string; payment?: Record<string, unknown> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }

  const event = body.event;
  if (!event || !body.payment) {
    return jsonResponse({ skipped: "no event or payment in payload" }, 200);
  }

  const eventHash = await sha256Hex(rawBody);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data, error } = await admin.rpc("process_asaas_webhook_event", {
    p_event_hash: eventHash,
    p_event: event,
    p_payment: body.payment,
  });

  if (error) {
    console.error("asaas-webhook: falha ao processar evento", { event, error: error.message });
    return jsonResponse({ error: "failed to process event" }, 500);
  }

  return jsonResponse(data);
});
