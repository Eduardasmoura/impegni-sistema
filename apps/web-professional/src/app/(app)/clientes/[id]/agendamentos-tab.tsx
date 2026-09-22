import { Card, CardContent } from "@/components/ui/card";
import { History, CalendarClock } from "lucide-react";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Atendimento } from "./cliente-ficha-view";

// Status vêm direto de `appointments.status` (STATUS_LABEL já é o
// vocabulário oficial usado em Agenda/Dashboard/Financeiro — nenhum status
// novo foi inventado aqui).
const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  in_progress: "bg-chart-3/15 text-chart-3",
  completed: "bg-chart-2/15 text-chart-2",
  canceled: "bg-destructive/15 text-destructive",
  no_show: "bg-destructive/15 text-destructive",
};

export function AgendamentosTab({
  proximos,
  passados,
  carregando,
}: {
  proximos: Atendimento[];
  passados: Atendimento[];
  carregando: boolean;
}) {
  if (carregando) {
    return <Card className="mt-3"><CardContent className="p-5 text-sm text-muted-foreground">Carregando agendamentos...</CardContent></Card>;
  }

  return (
    <div className="mt-3 space-y-6">
      <section>
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><CalendarClock className="w-4 h-4" /> Próximos</h3>
        {proximos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
        ) : (
          <div className="space-y-2">{proximos.map((a) => <LinhaAtendimento key={a.id} a={a} />)}</div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><History className="w-4 h-4" /> Histórico</h3>
        {passados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum atendimento anterior registrado.</p>
        ) : (
          <div className="space-y-2">{passados.map((a) => <LinhaAtendimento key={a.id} a={a} />)}</div>
        )}
      </section>
    </div>
  );
}

function LinhaAtendimento({ a }: { a: Atendimento }) {
  return (
    <Card>
      <CardContent className="p-3.5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">
            {formatDate(a.scheduled_at)} · {formatTime(a.scheduled_at)}
          </p>
          <p className="text-sm text-muted-foreground">
            {a.services?.name ?? "Serviço removido"}
            {a.professionals?.name ? ` · ${a.professionals.name}` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium">{formatCurrency(a.price)}</p>
          <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full inline-block mt-0.5", STATUS_STYLE[a.status] ?? "bg-muted text-muted-foreground")}>
            {STATUS_LABEL[a.status] ?? a.status}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
