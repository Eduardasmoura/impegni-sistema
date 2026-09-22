import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, CalendarPlus, CheckCircle2, Receipt } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AtividadeItem = {
  id: string;
  tipo: "cliente" | "agendamento" | "concluido" | "pagamento";
  texto: string;
  timestamp: string;
};

const ICONE: Record<AtividadeItem["tipo"], { icon: React.ElementType; color: string }> = {
  cliente: { icon: UserPlus, color: "text-chart-4" },
  agendamento: { icon: CalendarPlus, color: "text-primary" },
  concluido: { icon: CheckCircle2, color: "text-chart-2" },
  pagamento: { icon: Receipt, color: "text-chart-1" },
};

// Feed derivado de dados reais já existentes (clients.created_at,
// appointments.created_at/status, payments.status) — não depende de uma
// tabela de auditoria dedicada (audit_logs existe mas não cobre todas essas
// ações), então é montado combinando essas fontes (ver dashboard-view.tsx).
export function RecentActivityCard({ itens }: { itens: AtividadeItem[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader><CardTitle className="text-base">Atividade recente</CardTitle></CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma atividade recente.</p>
        ) : (
          <div className="space-y-3">
            {itens.map((it) => {
              const { icon: Icon, color } = ICONE[it.tipo];
              return (
                <div key={it.id} className="flex items-start gap-3">
                  <div className={cn("w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0", color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* line-clamp (2 linhas), não truncate — texto curto
                        cortado no meio do nome (ex.: "Ana Beatriz Souz...")
                        ficava ilegível no mobile; 2 linhas cabem a frase
                        inteira na maioria dos casos reais. */}
                    <p className="text-sm line-clamp-2">{it.texto}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(it.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
