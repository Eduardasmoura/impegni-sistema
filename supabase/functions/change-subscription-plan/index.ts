// Edge Function: change-subscription-plan
//
// Fase 4, Parte 8 — o próprio profissional (owner/admin da empresa) troca o
// próprio plano. Mesma arquitetura de admin-create-company (client "como
// quem chamou" só pra autenticar/autorizar, client service_role só pra
// escrever, ASAAS_API_KEY nunca sai daqui) — mas aqui quem decide se pode
// trocar é o dono da própria empresa, não um super_admin.
//
// Regra central: `subscriptions.status` (se a empresa tem acesso liberado
// ou não) NUNCA é tocado por esta função — isso continua sendo escrito
// exclusivamente pelo asaas-webhook, que é quem de fato sabe se um
// pagamento foi confirmado. O que esta função decide é `plan_id` (que
// nível de recurso a empresa tem direito), e só troca isso depois de uma
// chamada síncrona bem-sucedida à API do Asaas — se o Asaas falhar, aborta
// sem tocar no banco. PREÇO E PLANO SÃO SEMPRE RELIDOS DO BANCO
// (`newPlan.price_cents`), nunca aceitos do payload.
//
// PROMOÇÃO DE LANÇAMENTO (migration 095): cada assinatura pode ter um
// preço promocional travado por 6 meses a partir do 1º pagamento de
// verdade — não é um corte de calendário global, é por cliente. O preço
// efetivo cobrado (`valorCobradoCents`) é calculado aqui a cada chamada;
// a reversão automática pra quem NUNCA mais mexe no próprio plano depois
// de contratar (a maioria) é responsabilidade da function
// `expire-subscription-promos`, chamada por um cron diário — ver lá.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3";

const ALLOWED_ORIGINS = new Set(
  ["http://localhost:3000", Deno.env.get("WEB_PROFESSIONAL_URL")?.replace(/\/$/, "")].filter(
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

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function asaasFetch(path: string, body: unknown) {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) return { ok: false as const, error: "ASAAS_API_KEY not configured" };
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.errors) {
    const detail = json?.errors?.map((e: { description?: string }) => e.description).join("; ") ?? `HTTP ${res.status}`;
    return { ok: false as const, error: detail };
  }
  return { ok: true as const, data: json };
}

async function asaasUpdateSubscriptionValue(asaasSubscriptionId: string, value: number) {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) return { ok: false as const, error: "ASAAS_API_KEY not configured" };
  const res = await fetch(`${ASAAS_BASE_URL}/subscriptions/${asaasSubscriptionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify({ value }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.errors) {
    const detail = json?.errors?.map((e: { description?: string }) => e.description).join("; ") ?? `HTTP ${res.status}`;
    return { ok: false as const, error: detail };
  }
  return { ok: true as const, data: json };
}

async function asaasGetFirstPaymentInvoiceUrl(asaasSubscriptionId: string): Promise<string | null> {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) return null;
  const res = await fetch(`${ASAAS_BASE_URL}/payments?subscription=${asaasSubscriptionId}&limit=1`, {
    headers: { access_token: apiKey },
  });
  const json = await res.json().catch(() => null);
  return json?.data?.[0]?.invoiceUrl ?? null;
}

const RESOURCE_LABEL: Record<string, string> = {
  users: "usuários ativos",
  professionals: "profissionais",
  clients: "clientes",
  appointments: "agendamentos neste mês",
};

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

  let payload: { new_plan_id?: string; document?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }
  if (!payload.new_plan_id) return jsonResponse({ error: "new_plan_id is required" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: membership } = await admin
    .from("company_members")
    .select("company_id, role_empresa")
    .eq("user_id", caller.id)
    .eq("active", true)
    .in("role_empresa", ["owner", "admin"])
    .limit(1)
    .maybeSingle();
  if (!membership) return jsonResponse({ error: "only the company owner/admin can change the plan" }, 403);

  const companyId = membership.company_id;

  const { data: company } = await admin.from("companies").select("*").eq("id", companyId).maybeSingle();
  if (!company) return jsonResponse({ error: "company not found" }, 404);

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!subscription) return jsonResponse({ error: "no subscription found for this company" }, 404);
  if (!["trial", "expired", "canceled", "active", "past_due"].includes(subscription.status)) {
    return jsonResponse({ error: `cannot change plan while subscription status is "${subscription.status}"` }, 400);
  }

  const { data: newPlan } = await admin.from("plans").select("*").eq("id", payload.new_plan_id).eq("active", true).maybeSingle();
  if (!newPlan) return jsonResponse({ error: "plan not found or inactive" }, 404);
  if (newPlan.id === subscription.plan_id && subscription.status === "active") {
    return jsonResponse({ error: "company is already on this plan", reason: "already_active" }, 400);
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [{ count: users }, { count: professionals }, { count: clients }, { count: appointments }] = await Promise.all([
    admin.from("company_members").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("active", true),
    admin.from("professionals").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    admin.from("clients").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    admin.from("appointments").select("*", { count: "exact", head: true }).eq("company_id", companyId).neq("status", "canceled").gte("scheduled_at", monthStart),
  ]);
  const usage: Record<string, number> = { users: users ?? 0, professionals: professionals ?? 0, clients: clients ?? 0, appointments: appointments ?? 0 };
  const limits: Record<string, number | null> = {
    users: newPlan.max_users,
    professionals: newPlan.max_professionals,
    clients: newPlan.max_clients,
    appointments: newPlan.max_appointments,
  };
  const exceeded = Object.keys(usage)
    .filter((k) => limits[k] !== null && usage[k] > (limits[k] as number))
    .map((k) => `${RESOURCE_LABEL[k]}: ${usage[k]} (limite do plano novo: ${limits[k]})`);
  if (exceeded.length > 0) {
    return jsonResponse({ error: "current usage exceeds the new plan's limits", exceeded }, 400);
  }

  const precisaCheckout = subscription.status !== "active";

  // ---------- Preço promocional (migration 095) ----------
  const jaTinhaJanela = subscription.promo_ends_at !== null;
  const aindaNaJanela = jaTinhaJanela && new Date(subscription.promo_ends_at as string) > now;

  let promoPriceCents: number | null = null;
  let promoEndsAt: string | null = subscription.promo_ends_at;

  if (aindaNaJanela && newPlan.promo_active && newPlan.promo_price_cents !== null) {
    promoPriceCents = newPlan.promo_price_cents;
  } else if (!jaTinhaJanela && precisaCheckout && newPlan.promo_active && newPlan.promo_price_cents !== null) {
    promoPriceCents = newPlan.promo_price_cents;
    promoEndsAt = addMonths(now, 6).toISOString();
  }

  const valorCobradoCents = promoPriceCents ?? newPlan.price_cents;

  let invoiceUrl: string | null = null;
  let asaasSubscriptionId = subscription.asaas_subscription_id as string | null;
  let asaasCustomerId = company.asaas_customer_id as string | null;

  if (asaasSubscriptionId && !precisaCheckout) {
    const result = await asaasUpdateSubscriptionValue(asaasSubscriptionId, valorCobradoCents / 100);
    if (!result.ok) {
      return jsonResponse({ error: `Asaas: falha ao atualizar valor da assinatura (${result.error})` }, 502);
    }
  } else if (asaasSubscriptionId && precisaCheckout) {
    const result = await asaasUpdateSubscriptionValue(asaasSubscriptionId, valorCobradoCents / 100);
    if (!result.ok) {
      return jsonResponse({ error: `Asaas: falha ao atualizar valor da assinatura (${result.error})` }, 502);
    }
    invoiceUrl = await asaasGetFirstPaymentInvoiceUrl(asaasSubscriptionId);
  } else {
    const document = company.document || payload.document;
    if (!document) {
      return jsonResponse({ error: "document (CPF/CNPJ) is required to subscribe", reason: "missing_document" }, 400);
    }
    const cleanDocument = onlyDigits(document);
    if (cleanDocument.length !== 11 && cleanDocument.length !== 14) {
      return jsonResponse({ error: "invalid CPF/CNPJ", reason: "invalid_document" }, 400);
    }

    if (!asaasCustomerId) {
      const customerResult = await asaasFetch("/customers", {
        name: company.name,
        cpfCnpj: cleanDocument,
        email: company.email || undefined,
        mobilePhone: (company.whatsapp || company.phone || "").replace(/\D/g, "") || undefined,
      });
      if (!customerResult.ok) {
        return jsonResponse({ error: `Asaas: falha ao cadastrar cliente de cobrança (${customerResult.error})` }, 502);
      }
      asaasCustomerId = customerResult.data.id;
    }

    const subscriptionResult = await asaasFetch("/subscriptions", {
      customer: asaasCustomerId,
      billingType: "UNDEFINED",
      value: valorCobradoCents / 100,
      nextDueDate: new Date().toISOString().slice(0, 10),
      cycle: "MONTHLY",
      description: `Assinatura InovaFlow — plano ${newPlan.name}`,
    });
    if (!subscriptionResult.ok) {
      return jsonResponse({ error: `Asaas: falha ao criar assinatura recorrente (${subscriptionResult.error})` }, 502);
    }
    asaasSubscriptionId = subscriptionResult.data.id;

    await admin
      .from("companies")
      .update({ document: company.document || cleanDocument, asaas_customer_id: asaasCustomerId })
      .eq("id", companyId);

    invoiceUrl = await asaasGetFirstPaymentInvoiceUrl(asaasSubscriptionId);
  }

  const { data: updated, error: updateError } = await admin
    .from("subscriptions")
    .update({
      plan_id: newPlan.id,
      asaas_subscription_id: asaasSubscriptionId,
      promo_price_cents: promoPriceCents,
      promo_ends_at: promoEndsAt,
    })
    .eq("id", subscription.id)
    .select()
    .single();
  if (updateError) return jsonResponse({ error: updateError.message }, 500);

  await admin.from("audit_logs").insert({
    actor_id: caller.id,
    company_id: companyId,
    action: "subscription.self_change_plan",
    target_table: "subscriptions",
    target_id: subscription.id,
    payload: {
      old_plan_id: subscription.plan_id,
      new_plan_id: newPlan.id,
      usage,
      first_subscription: !subscription.asaas_subscription_id,
      valor_cobrado_cents: valorCobradoCents,
      promo_price_cents: promoPriceCents,
      promo_ends_at: promoEndsAt,
    },
  });

  return jsonResponse({ subscription: updated, plan: newPlan, invoice_url: invoiceUrl, valor_cobrado_cents: valorCobradoCents });
});
