import { Building2, Users, UserCog, UsersRound, CalendarCheck2 } from "lucide-react";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const { user, supabase } = await requireSuperAdmin();

  const [
    { count: totalCompanies },
    { count: activeCompanies },
    { count: trialCompanies },
    { count: suspendedCompanies },
    { count: totalUsers },
    { count: totalProfessionals },
    { count: totalClients },
    { count: totalAppointments },
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "trial"),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "suspended"),
    supabase.from("company_members").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("professionals").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
  ]);

  const { data: subscriptions } = await supabase.from("subscriptions").select("plan_id, plans(name)");
  const empresasPorPlano = new Map<string, number>();
  for (const s of subscriptions ?? []) {
    const planName = (s as unknown as { plans: { name: string } | null }).plans?.name ?? "Sem plano";
    empresasPorPlano.set(planName, (empresasPorPlano.get(planName) ?? 0) + 1);
  }

  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5);
  seisMesesAtras.setDate(1);
  const { data: novasEmpresas } = await supabase
    .from("companies")
    .select("created_at")
    .gte("created_at", seisMesesAtras.toISOString());

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
    <div className="min-h-screen bg-background">
      <AdminNav userEmail={user.email} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-heading text-3xl font-semibold mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">Visão geral da plataforma</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard icon={Building2} label="Empresas" value={totalCompanies ?? 0} />
          <KpiCard icon={Building2} label="Ativas" value={activeCompanies ?? 0} color="text-chart-2" />
          <KpiCard icon={Building2} label="Em teste" value={trialCompanies ?? 0} color="text-chart-4" />
          <KpiCard icon={Building2} label="Suspensas" value={suspendedCompanies ?? 0} color="text-destructive" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard icon={Users} label="Usuários" value={totalUsers ?? 0} />
          <KpiCard icon={UserCog} label="Profissionais" value={totalProfessionals ?? 0} />
          <KpiCard icon={UsersRound} label="Clientes" value={totalClients ?? 0} />
          <KpiCard icon={CalendarCheck2} label="Agendamentos" value={totalAppointments ?? 0} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Empresas por plano</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {empresasPorPlano.size === 0 && <p className="text-sm text-muted-foreground">Nenhuma assinatura ainda.</p>}
              {Array.from(empresasPorPlano.entries()).map(([plano, qtd]) => (
                <div key={plano} className="flex items-center justify-between text-sm">
                  <span>{plano}</span>
                  <span className="font-semibold">{qtd}</span>
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
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: typeof Building2; label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`w-4 h-4 ${color ?? "text-muted-foreground"}`} />
        </div>
        <p className="font-heading text-2xl font-bold mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}
