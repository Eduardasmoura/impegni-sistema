// Edge Function: admin-create-company
//
// Único ponto do sistema onde uma empresa nova é provisionada de ponta a
// ponta (tenant + assinatura + owner + cobrança recorrente no Asaas) —
// chamada só pelo painel Super Admin. Precisa ser Edge Function (não RPC)
// porque criar o usuário dono pode exigir `auth.admin.inviteUserByEmail`,
// que só existe com `service_role`; essa chave nunca sai daqui, nunca vai
// pro browser. Mesma lógica pra `ASAAS_API_KEY`.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type CreateCompanyPayload = {
  name: string;
  trade_name?: string;
  document?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  instagram?: string;
  color_primary?: string;
  color_secondary?: string;
  segment_id: string;
  plan_id: string;
  owner_email: string;
};

// BLOCKER #2 (auditoria pré-produção): estava em 5, o período oficial do
// produto é 14 dias — mesmo valor usado em private.add_default_subscription
// (self-signup) e em public.admin_change_plan (única fonte que já estava
// certa). As 3 fontes de trial do sistema agora concordam.
const TRIAL_DAYS = 14;
const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3";

// CORS (auditoria ETAPA 1, item "CORS wildcard"): só o painel Super Admin
// chama esta function — restringe a esse único caller em vez de "*".
// `WEB_SUPERADMIN_URL` é opcional (secret a configurar quando o domínio de
// produção existir); sem ele, só localhost:3002 (dev) é aceito — não
// quebra nada hoje, só ainda não libera um domínio de produção que ainda
// não existe.
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

// Asaas autentica por header `access_token` (não é Bearer/OAuth) — a chave
// só existe aqui dentro, injetada via secret do projeto
// (`supabase secrets set ASAAS_API_KEY=...`), nunca em nenhum client.
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
  // verdade (RLS de profiles já libera cada um ler o próprio registro).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return jsonResponse({ error: "invalid session" }, 401);

  const { data: callerProfile } = await callerClient.from("profiles").select("role_platform").eq("id", caller.id).single();
  if (callerProfile?.role_platform !== "super_admin") {
    return jsonResponse({ error: "only super_admin can create companies" }, 403);
  }

  let payload: CreateCompanyPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }
  if (!payload.name || !payload.owner_email || !payload.segment_id || !payload.plan_id) {
    return jsonResponse({ error: "name, owner_email, segment_id and plan_id are required" }, 400);
  }
  // CPF/CNPJ é exigido pelo Asaas pra criar o cliente de cobrança — sem
  // isso não tem como ativar a assinatura recorrente da empresa.
  if (!payload.document) {
    return jsonResponse({ error: "document (CNPJ/CPF) is required to set up billing" }, 400);
  }

  // service_role: só existe aqui dentro — bypassa RLS pra provisionar tudo
  // de uma vez (tenant, assinatura, vínculo do owner), nunca é exposta ao client.
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Slug único (mesma função usada no onboarding self-service).
  const { data: slug, error: slugError } = await admin.rpc("generate_unique_slug", { base_name: payload.name });
  if (slugError || !slug) return jsonResponse({ error: slugError?.message || "failed to generate slug" }, 500);

  // 2. Tenant.
  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: payload.name,
      slug,
      trade_name: payload.trade_name || null,
      document: payload.document || null,
      email: payload.email || null,
      phone: payload.phone || null,
      whatsapp: payload.whatsapp || null,
      address: payload.address || null,
      city: payload.city || null,
      state: payload.state || null,
      zip_code: payload.zip_code || null,
      instagram: payload.instagram || null,
      color_primary: payload.color_primary || null,
      color_secondary: payload.color_secondary || null,
      segment_id: payload.segment_id,
      status: "trial",
    })
    .select()
    .single();
  if (companyError || !company) return jsonResponse({ error: companyError?.message || "failed to create company" }, 500);

  // 3. Plano (preço, pra cobrança no Asaas) + assinatura local (trial, 14
  //    dias — o mesmo prazo do primeiro vencimento no Asaas, ver passo 4).
  //    Assinatura vem antes do owner, pra função de limite já encontrar uma
  //    assinatura ativa quando o membro for inserido a seguir.
  const { data: plan } = await admin.from("plans").select("name, price_cents").eq("id", payload.plan_id).single();
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .insert({
      company_id: company.id,
      plan_id: payload.plan_id,
      status: "trial",
      trial_started_at: new Date().toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select()
    .single();
  if (subscriptionError) return jsonResponse({ error: subscriptionError.message }, 500);

  // 4. Asaas: cliente + assinatura recorrente, primeiro vencimento no dia
  //    em que o trial acaba (a partir daí o próprio Asaas gera a cobrança de
  //    cada ciclo mensal sozinho — nenhum cron job nosso precisa disparar
  //    isso). Se o Asaas falhar, a empresa/assinatura/owner seguem sendo
  //    criados normalmente — fica marcado pra configurar a cobrança
  //    manualmente depois, mesmo padrão de degradação graciosa já usado
  //    pro convite do owner mais abaixo. `company`/`subscription` locais
  //    são atualizados aqui também (não só no banco), pra resposta e
  //    auditoria refletirem o resultado real, não o snapshot de antes do Asaas.
  let asaasWarning: string | null = null;
  if (plan) {
    const customerResult = await asaasFetch("/customers", {
      name: payload.name,
      cpfCnpj: payload.document.replace(/\D/g, ""),
      email: payload.email || undefined,
      mobilePhone: (payload.whatsapp || payload.phone || "").replace(/\D/g, "") || undefined,
    });
    if (customerResult.ok) {
      const asaasCustomerId = customerResult.data.id as string;
      const subscriptionResult = await asaasFetch("/subscriptions", {
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: plan.price_cents / 100,
        nextDueDate: trialEndsAt.toISOString().slice(0, 10),
        cycle: "MONTHLY",
        description: `Assinatura InovaFlow — plano ${plan.name}`,
      });
      if (subscriptionResult.ok) {
        await admin.from("companies").update({ asaas_customer_id: asaasCustomerId }).eq("id", company.id);
        await admin
          .from("subscriptions")
          .update({ asaas_subscription_id: subscriptionResult.data.id })
          .eq("id", subscription.id);
        company.asaas_customer_id = asaasCustomerId;
        subscription.asaas_subscription_id = subscriptionResult.data.id;
      } else {
        asaasWarning = `Asaas: cliente criado mas falha ao criar assinatura recorrente (${subscriptionResult.error})`;
      }
    } else {
      asaasWarning = `Asaas: falha ao criar cliente de cobrança (${customerResult.error})`;
    }
  } else {
    asaasWarning = "Asaas: plano não encontrado, cobrança não configurada";
  }

  // 5. Owner: localiza um usuário já existente com esse e-mail, ou convida
  //    um novo (manda e-mail de verdade, depende do provedor de e-mail do
  //    projeto Supabase estar configurado).
  let ownerId: string | null = null;
  let invited = false;
  {
    let page = 1;
    const perPage = 200;
    while (!ownerId) {
      const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page, perPage });
      if (listError) break;
      const match = usersPage.users.find((u) => u.email?.toLowerCase() === payload.owner_email.toLowerCase());
      if (match) {
        ownerId = match.id;
        break;
      }
      if (usersPage.users.length < perPage) break; // última página, não achou
      page += 1;
    }
  }
  if (!ownerId) {
    const { data: invitedUser, error: inviteError } = await admin.auth.admin.inviteUserByEmail(payload.owner_email);
    if (inviteError || !invitedUser?.user) {
      return jsonResponse(
        { error: `company created, but could not create/invite owner: ${inviteError?.message}`, company, asaas_warning: asaasWarning },
        207
      );
    }
    ownerId = invitedUser.user.id;
    invited = true;
  }

  // 6. Vínculo do owner com a empresa.
  const { error: memberError } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: ownerId,
    role_empresa: "owner",
  });
  if (memberError) return jsonResponse({ error: memberError.message, company, asaas_warning: asaasWarning }, 207);

  // 7. Auditoria.
  await admin.from("audit_logs").insert({
    actor_id: caller.id,
    company_id: company.id,
    action: "company.create",
    target_table: "companies",
    target_id: company.id,
    payload: { new: company, owner_email: payload.owner_email, owner_invited: invited, asaas_warning: asaasWarning },
  });

  if (asaasWarning) {
    return jsonResponse({ company, owner_invited: invited, asaas_warning: asaasWarning }, 207);
  }
  return jsonResponse({ company, owner_invited: invited });
});
