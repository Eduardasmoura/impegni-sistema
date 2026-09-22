import Link from "next/link";
import { ArrowRight, Users, UserPlus, Repeat, UserX, UserCog, Trophy, Scissors, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

function SummaryShell({ title, href, hrefLabel, children }: { title: string; href: string; hrefLabel: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Link href={href} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          {hrefLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">{children}</CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</p>
      <p className="text-lg font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

export function ClientsSummaryCard({
  total,
  novos,
  recorrentes,
  semProximo,
}: {
  total: number;
  novos: number;
  recorrentes: number;
  semProximo: number;
}) {
  return (
    <SummaryShell title="Clientes" href="/clientes" hrefLabel="Ver clientes">
      <Metric icon={Users} label="Total de clientes" value={String(total)} />
      <Metric icon={UserPlus} label="Novos no período" value={String(novos)} />
      <Metric icon={Repeat} label="Recorrentes no período" value={String(recorrentes)} />
      <Metric icon={UserX} label="Sem próximo agendamento" value={String(semProximo)} />
    </SummaryShell>
  );
}

export function TeamSummaryCard({
  ativos,
  atendimentosHoje,
  ranking,
}: {
  ativos: number;
  atendimentosHoje: number;
  ranking: { nome: string; atendimentos: number }[];
}) {
  return (
    <SummaryShell title="Equipe" href="/equipe" hrefLabel="Gerenciar equipe">
      <Metric icon={UserCog} label="Profissionais ativos" value={String(ativos)} />
      <Metric icon={TrendingUp} label="Atendimentos hoje" value={String(atendimentosHoje)} />
      <div className="col-span-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5"><Trophy className="w-3.5 h-3.5" /> Ranking de atendimentos (período)</p>
        {ranking.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados suficientes.</p>
        ) : (
          <div className="space-y-1">
            {ranking.slice(0, 3).map((r, i) => (
              <div key={r.nome} className="flex items-center justify-between text-sm">
                <span className="truncate">{i + 1}. {r.nome}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">{r.atendimentos}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </SummaryShell>
  );
}

export function ServicesSummaryCard({
  totalAtivos,
  maisAgendado,
  maiorFaturamento,
}: {
  totalAtivos: number;
  maisAgendado: { nome: string; atendimentos: number } | null;
  maiorFaturamento: { nome: string; valor: number } | null;
}) {
  return (
    <SummaryShell title="Serviços" href="/servicos" hrefLabel="Gerenciar serviços">
      <Metric icon={Scissors} label="Serviços ativos" value={String(totalAtivos)} />
      <Metric icon={DollarSign} label="Maior faturamento" value={maiorFaturamento ? formatCurrency(maiorFaturamento.valor) : "—"} />
      <div className="col-span-2">
        <p className="text-xs text-muted-foreground">Mais agendado no período</p>
        <p className="text-sm font-medium mt-0.5">
          {maisAgendado ? `${maisAgendado.nome} (${maisAgendado.atendimentos})` : "Sem dados suficientes"}
        </p>
      </div>
    </SummaryShell>
  );
}
