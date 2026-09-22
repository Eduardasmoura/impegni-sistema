import { PaymentsLedger } from "./payments-ledger";
import type { Tables } from "@/lib/supabase/database.types";

export function ReceitasTab({ companyId, professionals, services }: { companyId: string; professionals: Tables<"professionals">[]; services: Tables<"services">[] }) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-muted-foreground">Todos os lançamentos financeiros — busca, filtros e paginação direto no banco (não carrega tudo de uma vez).</p>
      <PaymentsLedger companyId={companyId} mode="receitas" professionals={professionals} services={services} />
    </div>
  );
}
