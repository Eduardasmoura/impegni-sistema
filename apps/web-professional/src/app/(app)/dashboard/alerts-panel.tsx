import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type Alerta = { id: string; label: string; description: string; href: string };

// Só alertas com um sinal real e barato de calcular (ver dashboard-view.tsx
// pra origem de cada um: estoque baixo, assinatura vencendo, pagamento
// pendente, serviço sem preço). "Clientes sem retorno"/"horários vagos" do
// pedido original ficaram de fora por exigirem consulta própria mais
// pesada — não implementados agora pra não inventar um número aproximado.
export function AlertsPanel({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground mb-2.5 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" /> Atenção
      </h2>
      <div className="space-y-2">
        {alertas.map((a) => (
          <Link key={a.id} href={a.href}>
            <Card className="border-chart-4/30 bg-chart-4/5 hover:bg-chart-4/10 transition-colors">
              <CardContent className="p-3.5 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-chart-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
