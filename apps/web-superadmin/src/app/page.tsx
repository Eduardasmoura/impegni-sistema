import { Building2, Users, UserCog, UsersRound, CalendarCheck2, CheckCircle2, Clock, XCircle, ShieldOff, TrendingUp, Wallet, AlertTriangle, PauseCircle, UserPlus } from "lucide-react";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { DashboardFilters } from "./dashboard-filters";

export default async function DashboardPage({ searchParams }: { searchParams: { de?: string; ate?: string } }) {
  const { user, supabase } = await requireSuperAdmin();

  // Período padrão: últimos 30 dias — o mesmo range que a RPC usa quando
  // nada é informado, então o filtro da UI só precisa mandar o que o
  // usuário escolheu (ou nada, e cai no default do banco).
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
  const de = searchParams.de || trintaDiasAtras.toISOString().slice(0, 10);
  const ate = searchParams.ate || hoje.toISOString().slice(0, 10);

  const [{ data: summaryRows, error: summaryError }, { data: porPlano }] = await Promise.all([
    supabase.rpc("admin_dashboard_summary", { p_from: `${de}T00:00:00Z`, p_to: `${ate}T23:59:59Z` }),
    supabase.rpc("admin_companies_by_plan"),
  ]);
  const s = summaryRows?.[0];

  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5);
  seisMesesAtras.setDate(1);
  const { data: novasEmpresas } = await supabase.from("companies").select("created_at").gte("created_at", seisMesesAtras.toISOString());

  const porMes = new Map<string, number>();
  const meses: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const chave = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    meses.push(chave);
    porMes.set(chave, 0);
  }
  for (const c of novasEmpresas ?? []) {
    const chave = new Date(c.created_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    if (porMes.has(chave)) porMes.set(chave, (porMes.get(chave) ?? 0) + 1);
  }
  const maxNovas = Math.max(1, ...Array.from(porMes.values()));

  return (
    <AdminShell userEmail={user.email}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral da plataforma</p>
          </div>
          <DashboardFilters de={de} ate={ate} />
        </div>

        {summaryError && (
          <Card className="mb-4 border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">Erro ao carregar métricas: {summaryError.message}</CardContent>
          </Card>
        )}

        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Empresas</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <KpiCard icon={Building2} label="Total" value={s?.total_companies ?? 0} />
          <KpiCard icon={CheckCircle2} label="Ativas" value={s?.active_companies ?? 0} color="text-chart-2" />
          <KpiCard icon={Clock} label="Em teste" value={s?.trial_companies ?? 0} color="text-chart-4" />
          <KpiCard icon={AlertTriangle} label="Trials expirados" value={s?.trial_expired_companies ?? 0} color="text-destructive" />
          <KpiCard icon={ShieldOff} label="Bloqueadas" value={s?.suspended_companies ?? 0} color="text-destructive" />
        </div>

        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Assinaturas</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <KpiCard icon={CheckCircle2} label="Ativas" value={s?.active_subscriptions ?? 0} color="text-chart-2" />
          <KpiCard icon={Clock} label="Em teste" value={s?.trial_subscriptions ?? 0} color="text-chart-4" />
          <KpiCard icon={AlertTriangle} label="Pagamento atrasado" value={s?.past_due_subscriptions ?? 0} color="text-destructive" />
          <KpiCard icon={XCircle} label="Canceladas" value={s?.canceled_subscriptions ?? 0} />
          <KpiCard icon={PauseCircle} label="Expiradas" value={s?.expired_subscriptions ?? 0} />
        </div>

        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Financeiro (período selecionado)</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <KpiCard icon={Wallet} label="Receita do período" value={formatCurrency(s?.revenue_period ?? 0)} color="text-chart-2" isText />
          <KpiCard icon={TrendingUp} label="MRR" value={formatCurrency(s?.mrr ?? 0)} color="text-primary" isText />
          <KpiCard icon={CheckCircle2} label="Pagamentos aprovados" value={s?.payments_confirmed ?? 0} color="text-chart-2" />
          <KpiCard icon={Clock} label="Pagamentos pendentes" value={s?.payments_pending ?? 0} color="text-chart-4" />
          <KpiCard icon={AlertTriangle} label="Pagamentos atrasados" value={s?.payments_overdue ?? 0} color="text-destructive" />
        </div>

        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Uso da plataforma</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <KpiCard icon={UserPlus} label="Novos clientes (período)" value={s?.new_companies_period ?? 0} />
          <KpiCard icon={TrendingUp} label="Conversão trial → plano" value={formatConversao(s)} color="text-primary" isText />
          <UsageCard supabase={supabase} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Empresas por plano</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(!porPlano || porPlano.length === 0) && <p className="text-sm text-muted-foreground">Nenhum plano cadastrado ainda.</p>}
              {(porPlano ?? []).map((p) => (
                <div key={p.plan_id} className="flex items-center justify-between text-sm">
                  <span>{p.plan_name}</span>
                  <span className="font-semibold">{p.company_count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Novas empresas (6 meses)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-28">
                {meses.map((mes) => {
                  const qtd = porMes.get(mes) ?? 0;
                  return (
                    <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-muted rounded-t-md relative flex items-end" style={{ height: "80px" }}>
                        <div className="w-full bg-primary rounded-t-md" style={{ height: `${(qtd / maxNovas) * 80}px` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize">{mes}</span>
                      <span className="text-[10px] font-semibold">{qtd}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AdminShell>
  );
}

// Proxy simples de conversão — não é uma coorte histórica (não acompanha
// uma turma de trials ao longo do tempo), é a foto de agora: de todo mundo
// que já saiu do trial (virou assinante ativo ou expirou sem contratar),
// qual fração converteu. Sem dado nenhum dos dois lados, não há conversão
// a calcular — mostra "—" em vez de 0% (que sugeriria conversão zero).
function formatConversao(s: { active_subscriptions: number; trial_expired_companies: number } | undefined): string {
  if (!s) return "—";
  const total = s.active_subscriptions + s.trial_expired_companies;
  if (total === 0) return "—";
  return `${Math.round((s.active_subscriptions / total) * 100)}%`;
}

async function UsageCard({ supabase }: { supabase: Awaited<ReturnType<typeof requireSuperAdmin>>["supabase"] }) {
  const [{ count: totalUsers }, { count: totalProfessionals }, { count: totalClients }, { count: totalAppointments }] = await Promise.all([
    supabase.from("company_members").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("professionals").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
  ]);
  return (
    <>
      <KpiCard icon={Users} label="Usuários" value={totalUsers ?? 0} />
      <KpiCard icon={UserCog} label="Profissionais" value={totalProfessionals ?? 0} />
      <KpiCard icon={UsersRound} label="Clientes" value={totalClients ?? 0} />
      <KpiCard icon={CalendarCheck2} label="Agendamentos" value={totalAppointments ?? 0} />
    </>
  );
}

function KpiCard({ icon: Icon, label, value, color, isText }: { icon: typeof Building2; label: string; value: number | string; color?: string; isText?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`w-4 h-4 shrink-0 ${color ?? "text-muted-foreground"}`} />
        </div>
        <p className={`font-heading font-bold mt-2 ${isText ? "text-xl" : "text-2xl"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
