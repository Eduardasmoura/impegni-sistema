import { TrendingUp, TrendingDown, Wallet, Percent, Users, Clock, HandCoins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Visão geral — os 7 KPIs pedidos, todos calculados a partir do que já é
 * buscado no orquestrador (nenhuma query nova aqui). "Comissões" vem de
 * uma prévia agregada (soma de `calculate_professional_payout` por
 * profissional no período — MESMA RPC já usada na aba Comissões, não uma
 * conta nova) calculada no orquestrador e passada pronta.
 *
 * "Lucro líquido" continua = receita recebida − despesas (mesma fórmula de
 * sempre) — comissão é mostrada à parte, não subtraída automaticamente,
 * porque nem toda empresa registra o repasse ao profissional como
 * "despesa" no sistema; subtrair sozinho inventaria uma regra de negócio
 * nova.
 *
 * Hierarquia visual (ajuste de validação, sem mudar nenhum cálculo):
 * as 3 métricas que resumem "o que aconteceu no período" (bruta/despesas/
 * lucro) ficam em destaque; as outras 4, que são detalhamento, ficam numa
 * segunda faixa mais compacta — evita tanto o "muro de 7 cartões iguais"
 * quanto o buraco vazio que sobrava na grade 4+3.
 */
export function VisaoGeralTab({
  receitaBruta,
  receitaRecebida,
  despesas,
  comissoes,
  lucro,
  ticketMedio,
  pendente,
}: {
  receitaBruta: number;
  receitaRecebida: number;
  despesas: number;
  comissoes: number | null;
  lucro: number;
  ticketMedio: number | null;
  pendente: number;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PrimaryKpi icon={TrendingUp} label="Receita bruta" value={formatCurrency(receitaBruta)} tone="neutral" hint="Todos os lançamentos, qualquer status" />
        <PrimaryKpi icon={TrendingDown} label="Despesas" value={formatCurrency(despesas)} tone="bad" />
        <PrimaryKpi icon={Percent} label="Lucro líquido" value={formatCurrency(lucro)} tone={lucro >= 0 ? "good" : "bad"} hint="Receita recebida − despesas" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SecondaryKpi icon={Wallet} label="Receita recebida" value={formatCurrency(receitaRecebida)} hint="Só pagamentos confirmados" />
        <SecondaryKpi icon={HandCoins} label="Comissões" value={comissoes != null ? formatCurrency(comissoes) : "—"} hint="Repasse no período" />
        <SecondaryKpi icon={Users} label="Ticket médio" value={ticketMedio != null ? formatCurrency(ticketMedio) : "—"} />
        <SecondaryKpi icon={Clock} label="Valores pendentes" value={formatCurrency(pendente)} warn={pendente > 0} hint="Aguardando ou atrasados" />
      </div>
    </div>
  );
}

const TONE_STYLES = {
  neutral: { icon: "text-primary", badge: "bg-primary/10" },
  good: { icon: "text-chart-2", badge: "bg-chart-2/10" },
  bad: { icon: "text-destructive", badge: "bg-destructive/10" },
} as const;

function PrimaryKpi({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: keyof typeof TONE_STYLES;
  hint?: string;
}) {
  const t = TONE_STYLES[tone];
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", t.badge)}>
          <Icon className={cn("w-5 h-5", t.icon)} />
        </div>
        <div className="min-w-0">
          <span className="text-sm text-muted-foreground">{label}</span>
          <p className="font-heading text-3xl font-bold mt-1 tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SecondaryKpi({ icon: Icon, label, value, hint, warn }: { icon: React.ElementType; label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <Card className="bg-muted/40 border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={cn("w-3.5 h-3.5", warn ? "text-chart-4" : "text-muted-foreground")} />
        </div>
        <p className={cn("font-heading text-xl font-bold mt-1.5 tabular-nums", warn && "text-chart-4")}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}
