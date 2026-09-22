import { PaymentsLedger } from "./payments-ledger";
import type { Tables } from "@/lib/supabase/database.types";

export function PagamentosTab({ companyId, professionals, services }: { companyId: string; professionals: Tables<"professionals">[]; services: Tables<"services">[] }) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-muted-foreground">
        Atendimento e pagamento são coisas diferentes: um atendimento pode estar concluído com o pagamento ainda pendente, ou vice-versa. As colunas abaixo mostram os dois status lado a lado.
      </p>
      <PaymentsLedger companyId={companyId} mode="pagamentos" professionals={professionals} services={services} />
    </div>
  );
}
