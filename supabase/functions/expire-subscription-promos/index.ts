// Edge Function: expire-subscription-promos
//
// Chamada por um cron diário (`select cron.schedule(...)`, ver migration
// 096) — varre assinaturas cuja janela promocional (`subscriptions.
// promo_ends_at`, migration 095) já passou e devolve o valor da
// assinatura no Asaas pro preço cheio do plano. É o que faz a promoção
// de lançamento realmente "voltar ao normal" pra quem nunca mais mexe no
// próprio plano depois de contratar (a maioria) — sem isso, o desconto
// ficaria pra sempre.
//
// SEGURANÇA: diferente de `asaas-webhook`/`notify-appointment`, esta
// function não recebe (nem aceita) nenhum parâmetro do chamador — ela só
// processa o que o PRÓPRIO BANCO decide que está vencido, calculado
// inteiramente aqui dentro. Não há dado sensível na resposta (só uma
// contagem) nem nenhuma forma de um chamador direcionar a ação pra uma
// assinatura específica. Por isso usa só `verify_jwt: true` (a chave
// anon, pública por definição, já basta) em vez de um segredo
// compartilhado extra — não haveria o que esse segredo protegeria de
// verdade aqui. Se quiser blindar mesmo assim, dá pra adicionar o mesmo
// padrão de `notify_appointment_secret` (Vault + `supabase secrets set`)
// depois.
//
// Idempotente por desenho: "reivindica" cada assinatura (zera
// `promo_price_cents` ANTES de chamar a Asaas) — se o cron disparar de
// novo enquanto uma execução anterior ainda está rodando, a segunda
// simplesmente não encontra nada pra fazer nessa linha. Se a chamada à
// Asaas falhar, devolve a reivindicação (restaura o valor) pra tentar de
// novo no próximo dia, em vez de silenciosamente desistir.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3";

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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("subscriptions")
    .select("id, company_id, asaas_subscription_id, promo_price_cents, plans(price_cents)")
    .not("promo_price_cents", "is", null)
    .not("promo_ends_at", "is", null)
    .lte("promo_ends_at", nowIso)
    .eq("status", "active")
    .not("asaas_subscription_id", "is", null);

  if (error) {
    console.error("expire-subscription-promos: falha ao consultar assinaturas vencidas", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!due || due.length === 0) {
    return new Response(JSON.stringify({ processed: 0, failed: 0, total_due: 0 }), { status: 200 });
  }

  let processed = 0;
  let failed = 0;

  for (const sub of due) {
    const plan = sub.plans as unknown as { price_cents: number } | null;
    if (!plan || !sub.asaas_subscription_id) continue;

    const { data: claimed } = await admin
      .from("subscriptions")
      .update({ promo_price_cents: null })
      .eq("id", sub.id)
      .not("promo_price_cents", "is", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const result = await asaasUpdateSubscriptionValue(sub.asaas_subscription_id, plan.price_cents / 100);
    if (!result.ok) {
      failed++;
      console.error(`expire-subscription-promos: falha ao atualizar assinatura ${sub.id}`, result.error);
      await admin.from("subscriptions").update({ promo_price_cents: sub.promo_price_cents }).eq("id", sub.id);
      continue;
    }

    processed++;
    await admin.from("audit_logs").insert({
      company_id: sub.company_id,
      action: "subscription.promo_expired",
      target_table: "subscriptions",
      target_id: sub.id,
      payload: { old_promo_price_cents: sub.promo_price_cents, new_price_cents: plan.price_cents },
    });
  }

  return new Response(JSON.stringify({ processed, failed, total_due: due.length }), { status: 200 });
});
