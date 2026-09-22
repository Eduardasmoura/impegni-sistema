"use client";

import { Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { PAGAMENTO_ASSINATURA_STATUS_LABEL } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-chart-4/15 text-chart-4",
  confirmed: "bg-chart-2/15 text-chart-2",
  received: "bg-chart-2/15 text-chart-2",
  overdue: "bg-destructive/15 text-destructive",
  refunded: "bg-muted text-muted-foreground",
  deleted: "bg-muted text-muted-foreground",
};

export function PagamentosView({ payments, isManager }: { payments: Tables<"subscription_payments">[]; isManager: boolean }) {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="font-heading text-3xl font-semibold mb-1">Pagamentos</h1>
      <p className="text-sm text-muted-foreground mb-6">Histórico de cobranças da assinatura do seu negócio.</p>

      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {payments.length === 0 && (
            <p className="text-sm text-muted-foreground py-10 text-center px-4">
              {isManager
                ? "Nenhum pagamento registrado ainda. Este histórico é preenchido automaticamente conforme as cobranças da assinatura acontecem."
                : "Só o proprietário ou administrador da empresa pode ver o histórico de pagamentos."}
            </p>
          )}
          {payments.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{formatCurrency(Number(p.value))}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] ?? ""}`}>
                {PAGAMENTO_ASSINATURA_STATUS_LABEL[p.status] ?? p.status}
              </span>
              <span className="text-xs text-muted-foreground">{p.billing_type ?? "—"}</span>
              <span className="text-xs text-muted-foreground ml-auto">venc. {p.due_date ? formatDate(p.due_date) : "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
