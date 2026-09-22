import Link from "next/link";
import { ArrowRight, Play, Pause, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatTime } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";

type AgendamentoHoje = Tables<"appointments"> & {
  clients: { name: string } | null;
  services: { name: string } | null;
  professionals: { name: string } | null;
};

// Mesmas 5 cores/rótulos de status já usados na ficha do cliente
// (agendamentos-tab.tsx) — nenhum status novo, só os reais de
// `appointments.status`. O pedido original citava "confirmado"/"aguardando
// confirmação", que não existem no banco — usei os status reais.
const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  in_progress: "bg-chart-3/15 text-chart-3",
  completed: "bg-chart-2/15 text-chart-2",
  canceled: "bg-destructive/15 text-destructive",
  no_show: "bg-destructive/15 text-destructive",
};

export function AgendaTodayCard({
  agendamentos,
  onMudarStatus,
}: {
  agendamentos: AgendamentoHoje[];
  onMudarStatus: (a: Tables<"appointments">, status: string) => void;
}) {
  const contagem = agendamentos.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Agenda de hoje</CardTitle>
        <Link href="/agenda" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          Ver agenda completa <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {agendamentos.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3 pb-3 border-b border-border">
            <span className="font-medium text-foreground">{agendamentos.length} agendamento{agendamentos.length === 1 ? "" : "s"}</span>
            {Object.entries(contagem).map(([status, n]) => (
              <span key={status}>{n} {(STATUS_LABEL[status] ?? status).toLowerCase()}</span>
            ))}
          </div>
        )}

        {agendamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum agendamento hoje.</p>
        ) : (
          <div className="space-y-1 max-h-[360px] overflow-y-auto">
            {agendamentos.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="text-center w-14 shrink-0">
                  <p className="text-sm font-medium tabular-nums">{formatTime(a.scheduled_at)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.clients?.name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.services?.name ?? "Serviço"} · {a.professionals?.name ?? "—"}
                  </p>
                </div>
                <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full shrink-0 hidden sm:inline-block", STATUS_STYLE[a.status] ?? "bg-muted text-muted-foreground")}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
                <p className="text-sm font-medium w-16 text-right shrink-0 tabular-nums">{formatCurrency(Number(a.price))}</p>
                <div className="flex gap-0.5 shrink-0">
                  {a.status === "scheduled" && <IconBtn icon={Play} color="text-chart-2" title="Iniciar atendimento" onClick={() => onMudarStatus(a, "in_progress")} />}
                  {a.status === "in_progress" && <IconBtn icon={Pause} color="text-chart-4" title="Voltar para agendado" onClick={() => onMudarStatus(a, "scheduled")} />}
                  {(a.status === "scheduled" || a.status === "in_progress") && <IconBtn icon={Check} color="text-primary" title="Concluir atendimento" onClick={() => onMudarStatus(a, "completed")} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IconBtn({ icon: Icon, color, title, onClick }: { icon: typeof Play; color: string; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className={cn("p-1.5 rounded-lg hover:bg-muted", color)}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
