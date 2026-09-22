// Edge Function: create-appointment-charge
//
// Fase 5, Parte 12 — cobrança avulsa (não recorrente) pra UM agendamento,
// via Asaas. Mesma arquitetura de admin-create-company/change-subscription-plan:
// client "como quem chamou" só pra autenticar, client service_role só pra
// escrever, ASAAS_API_KEY nunca sai daqui.
//
// Diferença importante pro Asaas cobrar QUALQUER coisa, ele exige um
// "customer" já cadastrado lá, e criar esse customer exige cpfCnpj — dado
// que o InovaFlow nunca coletou de cliente nenhum até agora. Por isso este
// endpoint aceita opcionalmente `cpf_cnpj` no corpo: se o cliente ainda não
// tem um Asaas customer, usa o valor recebido (e persiste em
// clients.cpf_cnpj) pra criar um. Sem CPF/CNPJ (nem já salvo, nem enviado
// agora), devolve 400 com um motivo estruturado pro frontend pedir o campo
// — não é um provedor faltando (Asaas está configurado e funcionando,
// prova disso é admin-create-company/change-subscription-plan), é um dado
// que precisa ser coletado uma vez.
//
// billingType: 'UNDEFINED' — deixa o próprio cliente escolher Pix, boleto
// ou cartão na página hospedada do Asaas (invoiceUrl), em vez do
// InovaFlow decidir ou precisar processar dado de cartão diretamente.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3";

// CORS (auditoria ETAPA 1, item "CORS wildcard"): esta function é chamada
// pela página pública de agendamento do web-client — uma origem por
// EMPRESA (`{slug}.{domínio}`), não uma origem fixa única, diferente das
// outras 4 functions administrativas. Por isso o casamento é por domínio
// raiz + qualquer subdomínio, não por lista exata de URLs.
// `WEB_CLIENT_ROOT_DOMAIN` é opcional (configurar com o MESMO valor do
// `NEXT_PUBLIC_ROOT_DOMAIN` do app web-client quando o domínio de produção
// existir); sem ele, só localhost:3001 e `*.localhost:3001` (dev) são aceitos.
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  let hostname: string;
  let port: string;
  try {
    const u = new URL(origin);
    hostname = u.hostname;
    port = u.port;
  } catch {
    return false;
  }
  if (port === "3001" && (hostname === "localhost" || hostname.endsWith(".localhost"))) return true;
  const rootDomain = Deno.env.get("WEB_CLIENT_ROOT_DOMAIN");
  if (rootDomain) {
    const root = rootDomain.replace(/^https?:\/\//, "").split(":")[0].toLowerCase();
    if (hostname === root || hostname.endsWith(`.${root}`)) return true;
  }
  return false;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin!;
  return headers;
}

async function asaasFetch(path: string, init: RequestInit) {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) return { ok: false as const, error: "ASAAS_API_KEY not configured" };
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", access_token: apiKey, ...(init.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.errors) {
    const detail = json?.errors?.map((e: { description?: string }) => e.description).join("; ") ?? `HTTP ${res.status}`;
    return { ok: false as const, error: detail };
  }
  return { ok: true as const, data: json };
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
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

  let payload: { payment_id?: string; cpf_cnpj?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }
  if (!payload.payment_id) return jsonResponse({ error: "payment_id is required" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: payment } = await admin.from("payments").select("*").eq("id", payload.payment_id).maybeSingle();
  if (!payment) return jsonResponse({ error: "payment not found" }, 404);

  // Autorização: quem chama precisa ser membro da empresa dona do
  // agendamento, OU o próprio cliente do pagamento — mesma checagem usada
  // em book_appointment/reschedule_appointment (edge function não passa
  // por RLS, então confere o vínculo direto).
  const { data: membership } = await admin
    .from("company_members")
    .select("id")
    .eq("user_id", caller.id)
    .eq("company_id", payment.company_id)
    .eq("active", true)
    .maybeSingle();

  let isOwningClient = false;
  if (!membership && payment.client_id) {
    const { data: clientRow } = await admin.from("clients").select("id").eq("id", payment.client_id).eq("user_id", caller.id).maybeSingle();
    isOwningClient = !!clientRow;
  }
  if (!membership && !isOwningClient) return jsonResponse({ error: "not authorized to charge this payment" }, 403);

  if (payment.status !== "pending") {
    return jsonResponse({ error: `payment is not pending (current status: "${payment.status}")` }, 400);
  }
  if (payment.asaas_payment_id) {
    // Já existe uma cobrança criada — devolve o link já existente em vez
    // de duplicar a cobrança no Asaas.
    return jsonResponse({ invoice_url: payment.asaas_invoice_url, asaas_payment_id: payment.asaas_payment_id, already_existed: true });
  }
  if (!payment.client_id) {
    return jsonResponse({ error: "payment has no client to charge" }, 400);
  }

  const { data: client } = await admin.from("clients").select("*").eq("id", payment.client_id).maybeSingle();
  if (!client) return jsonResponse({ error: "client not found" }, 404);

  const { data: company } = await admin.from("companies").select("name").eq("id", payment.company_id).maybeSingle();

  // 1) Garante um customer no Asaas pro cliente, criando se ainda não
  //    existir. Exige CPF/CNPJ — do banco (já coletado antes) ou vindo
  //    agora no corpo do request.
  let asaasCustomerId = client.asaas_customer_id as string | null;
  if (!asaasCustomerId) {
    const cpfCnpj = payload.cpf_cnpj ? onlyDigits(payload.cpf_cnpj) : client.cpf_cnpj ? onlyDigits(client.cpf_cnpj) : null;
    if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
      return jsonResponse({ error: "cpf_cnpj required to charge online", reason: "missing_cpf_cnpj" }, 400);
    }

    const customerResult = await asaasFetch("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: client.name,
        cpfCnpj,
        email: client.email ?? undefined,
        mobilePhone: client.phone ? onlyDigits(client.phone) : undefined,
        externalReference: client.id,
      }),
    });
    if (!customerResult.ok) {
      return jsonResponse({ error: `Asaas: falha ao cadastrar cliente (${customerResult.error})` }, 502);
    }
    asaasCustomerId = customerResult.data.id;

    // Persiste CPF/CNPJ e o customer id pra não recriar em cobranças
    // futuras do mesmo cliente.
    await admin.from("clients").update({ cpf_cnpj: cpfCnpj, asaas_customer_id: asaasCustomerId }).eq("id", client.id);
  }

  // 2) Cria a cobrança avulsa. UNDEFINED = o próprio cliente escolhe
  //    Pix/boleto/cartão na página hospedada do Asaas.
  const dueDate = new Date().toISOString().slice(0, 10);
  const paymentResult = await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: asaasCustomerId,
      billingType: "UNDEFINED",
      value: Number(payment.amount),
      dueDate,
      description: `Agendamento — ${company?.name ?? "InovaFlow"}`,
      externalReference: payment.id,
    }),
  });
  if (!paymentResult.ok) {
    return jsonResponse({ error: `Asaas: falha ao criar cobrança (${paymentResult.error})` }, 502);
  }

  const { data: updated, error: updateError } = await admin
    .from("payments")
    .update({
      asaas_payment_id: paymentResult.data.id,
      asaas_invoice_url: paymentResult.data.invoiceUrl,
      method: "online",
    })
    .eq("id", payment.id)
    .select()
    .single();
  if (updateError) return jsonResponse({ error: updateError.message }, 500);

  await admin.from("audit_logs").insert({
    actor_id: caller.id,
    company_id: payment.company_id,
    action: "payment.create_online_charge",
    target_table: "payments",
    target_id: payment.id,
    payload: { asaas_payment_id: paymentResult.data.id, value: payment.amount },
  });

  return jsonResponse({ invoice_url: updated.asaas_invoice_url, asaas_payment_id: updated.asaas_payment_id, payment: updated });
});
