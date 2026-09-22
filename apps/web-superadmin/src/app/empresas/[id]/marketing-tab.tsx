"use client";

// Marketing da empresa — campanhas automáticas (aniversário/inatividade/
// recuperação), cupons e avaliações. Todas as tabelas (`campaign_rules`,
// `campaign_sends`, `coupons`, `coupon_redemptions`, `reviews`) já têm RLS
// permitindo is_super_admin() (confirmado na auditoria) — só leitura aqui.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Megaphone, Star, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";

const CAMPAIGN_TYPE_LABEL: Record<string, string> = { birthday: "Aniversário", inactive_client: "Cliente inativo", recovery: "Recuperação" };
const SEND_STATUS_LABEL: Record<string, string> = { pending: "Pendente", sent: "Enviado", failed: "Falhou" };
const SEND_STATUS_COLOR: Record<string, string> = { pending: "bg-chart-4/15 text-chart-4", sent: "bg-chart-2/15 text-chart-2", failed: "bg-destructive/15 text-destructive" };

export function MarketingTab({ companyId }: { companyId: string }) {
  const supabase = createClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-marketing", companyId],
    queryFn: async () => {
      const [rules, sends, coupons, redemptions, reviews] = await Promise.all([
        supabase.from("campaign_rules").select("id, type, enabled, days_threshold").eq("company_id", companyId),
        supabase.from("campaign_sends").select("id, channel, status, sent_at, created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100),
        supabase.from("coupons").select("id, code, name, active, discount_percent, discount_amount").eq("company_id", companyId),
        supabase.from("coupon_redemptions").select("id, discount_amount, created_at").eq("company_id", companyId),
        supabase.from("reviews").select("rating").eq("company_id", companyId).eq("status", "published"),
      ]);
      for (const r of [rules, sends, coupons, redemptions, reviews]) if (r.error) throw r.error;
      return {
        rules: rules.data ?? [], sends: sends.data ?? [], coupons: coupons.data ?? [],
        redemptions: redemptions.data ?? [], reviews: reviews.data ?? [],
      };
    },
  });

  const resumo = useMemo(() => {
    const sends = data?.sends ?? [];
    const porStatus: Record<string, number> = {};
    for (const s of sends) porStatus[s.status] = (porStatus[s.status] ?? 0) + 1;
    const cuponsAtivos = (data?.coupons ?? []).filter((c) => c.active).length;
    const totalDescontos = (data?.redemptions ?? []).reduce((s, r) => s + Number(r.discount_amount ?? 0), 0);
    const reviews = data?.reviews ?? [];
    const mediaAvaliacao = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    return { porStatus, cuponsAtivos, totalDescontos, resgates: data?.redemptions.length ?? 0, mediaAvaliacao, totalReviews: reviews.length };
  }, [data]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-muted-foreground mb-4">Campanhas automáticas, cupons e avaliações da empresa — somente leitura.</p>

      {error && <Card className="mb-4 border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Erro ao carregar marketing: {(error as Error).message}</CardContent></Card>}

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Envios enviados</p><p className="text-2xl font-bold font-heading mt-1 text-chart-2">{resumo.porStatus.sent ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cupons ativos</p><p className="text-2xl font-bold font-heading mt-1">{resumo.cuponsAtivos}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Descontos concedidos</p><p className="text-xl font-bold font-heading mt-1">{formatCurrency(resumo.totalDescontos)}</p></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-2"><div><p className="text-xs text-muted-foreground">Avaliação média</p><p className="text-2xl font-bold font-heading mt-1">{resumo.mediaAvaliacao ? resumo.mediaAvaliacao.toFixed(1) : "—"}</p></div>{resumo.mediaAvaliacao && <Star className="w-4 h-4 text-chart-4 fill-chart-4" />}</CardContent></Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4" /> Regras de campanha</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(data?.rules ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma regra configurada.</p>}
                {(data?.rules ?? []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span>{CAMPAIGN_TYPE_LABEL[r.type] ?? r.type}{r.days_threshold ? ` (${r.days_threshold}d)` : ""}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${r.enabled ? "bg-chart-2/15 text-chart-2" : "bg-muted text-muted-foreground"}`}>{r.enabled ? "Ativa" : "Inativa"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ticket className="w-4 h-4" /> Cupons</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(data?.coupons ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum cupom cadastrado.</p>}
                {(data?.coupons ?? []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{c.code}</span>
                    <span className="text-muted-foreground">{c.discount_percent ? `${c.discount_percent}%` : formatCurrency(c.discount_amount)}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c.active ? "bg-chart-2/15 text-chart-2" : "bg-muted text-muted-foreground"}`}>{c.active ? "Ativo" : "Inativo"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Últimos envios</CardTitle></CardHeader>
            <CardContent className="p-0">
              {(data?.sends ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Nenhum envio registrado.</p>
              ) : (
                <div className="divide-y divide-border">
                  {(data?.sends ?? []).slice(0, 20).map((s) => (
                    <div key={s.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${SEND_STATUS_COLOR[s.status] ?? "bg-muted"}`}>{SEND_STATUS_LABEL[s.status] ?? s.status}</span>
                      <span className="text-muted-foreground capitalize">{s.channel}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{formatDateTime(s.sent_at ?? s.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
