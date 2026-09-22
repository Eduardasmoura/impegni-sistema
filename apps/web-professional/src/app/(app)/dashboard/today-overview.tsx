import { CalendarCheck, CheckCircle2, Users, DollarSign, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TodayOverview({
  agendamentos,
  atendimentos,
  clientes,
  receita,
  cancelamentos,
}: {
  agendamentos: number;
  atendimentos: number;
  clientes: number;
  receita: number;
  cancelamentos: number;
}) {
  const itens = [
    { label: "Agendamentos", value: String(agendamentos), icon: CalendarCheck, color: "text-primary" },
    { label: "Atendimentos", value: String(atendimentos), icon: CheckCircle2, color: "text-chart-2" },
    { label: "Clientes", value: String(clientes), icon: Users, color: "text-chart-4" },
    { label: "Receita", value: formatCurrency(receita), icon: DollarSign, color: "text-chart-1" },
    { label: "Cancelamentos", value: String(cancelamentos), icon: XCircle, color: "text-destructive" },
  ];

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground mb-2.5">Hoje</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {itens.map((it) => (
          <Card key={it.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{it.label}</span>
                <it.icon className={cn("w-4 h-4", it.color)} />
              </div>
              <p className="font-heading text-2xl font-bold mt-2 tabular-nums">{it.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
