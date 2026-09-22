"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ErrorState } from "@/components/ui/query-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { METODO_PAGAMENTO_LABEL, PAGAMENTO_STATUS_LABEL, STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const PAGE_SIZE = 25;

export type LinhaPagamento = {
  id: string;
  amount: number;
  method: string | null;
  status: string;
  created_at: string;
  asaas_invoice_url: string | null;
  client_id: string | null;
  client_name: string | null;
  service_id: string | null;
  service_name: string | null;
  professional_id: string | null;
  professional_name: string | null;
  appointment_id: string | null;
  appointment_status: string | null;
  appointment_scheduled_at: string | null;
  total_count: number;
};

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-chart-2/15 text-chart-2",
  pending: "bg-chart-4/15 text-chart-4",
  overdue: "bg-destructive/15 text-destructive",
  refunded: "bg-muted text-muted-foreground",
  canceled: "bg-muted text-muted-foreground",
};
const APPT_STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  in_progress: "bg-chart-3/15 text-chart-3",
  completed: "bg-chart-2/15 text-chart-2",
  canceled: "bg-destructive/15 text-destructive",
  no_show: "bg-destructive/15 text-destructive",
};

/**
 * Tabela paginada/pesquisável de `payments`, compartilhada pelas abas
 * "Receitas" e "Pagamentos" — mesma RPC (`list_company_payments`, migration
 * 20260914160000), só muda a ênfase visual via `mode`:
 *  - "receitas": lista geral (livro-caixa), coluna única de status.
 *  - "pagamentos": destaca lado a lado o status do ATENDIMENTO e do
 *    PAGAMENTO — pedido explícito da reformulação (uma coisa não significa
 *    a outra: dá pra ter atendimento concluído com pagamento pendente).
 */
export function PaymentsLedger({
  companyId,
  mode,
  professionals,
  services,
  defaultStatus,
}: {
  companyId: string;
  mode: "receitas" | "pagamentos";
  professionals: Tables<"professionals">[];
  services: Tables<"services">[];
  defaultStatus?: string;
}) {
  const supabase = createClient();
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(defaultStatus ?? "all");
  const [method, setMethod] = useState("all");
  const [professionalId, setProfessionalId] = useState("all");
  const [serviceId, setServiceId] = useState("all");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaInput.trim()), 300);
    return () => clearTimeout(t);
  }, [buscaInput]);
  useEffect(() => setPagina(1), [busca, status, method, professionalId, serviceId]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["financeiro-payments", companyId, busca, status, method, professionalId, serviceId, pagina],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_company_payments", {
        p_company_id: companyId,
        p_search: busca || undefined,
        p_status: status === "all" ? undefined : status,
        p_method: method === "all" ? undefined : method,
        p_professional_id: professionalId === "all" ? undefined : professionalId,
        p_service_id: serviceId === "all" ? undefined : serviceId,
        p_page: pagina,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return data as LinhaPagamento[];
    },
    placeholderData: (prev) => prev,
  });

  const linhas = data ?? [];
  const total = linhas[0]?.total_count ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input value={buscaInput} onChange={(e) => setBuscaInput(e.target.value)} placeholder="Buscar por cliente, telefone ou e-mail..." className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(PAGAMENTO_STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Forma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as formas</SelectItem>
            {Object.entries(METODO_PAGAMENTO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        {professionals.length > 1 && (
          <Select value={professionalId} onValueChange={setProfessionalId}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Profissional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={serviceId} onValueChange={setServiceId}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Serviço" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os serviços</SelectItem>
            {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </Card>
      ) : isError ? (
        <ErrorState message="Não foi possível carregar os lançamentos." />
      ) : linhas.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          {busca || status !== "all" || method !== "all" || professionalId !== "all" || serviceId !== "all"
            ? "Nenhum lançamento encontrado para esse filtro."
            : "Nenhum lançamento registrado ainda."}
        </CardContent></Card>
      ) : (
        <>
          <Card className="hidden md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Forma</TableHead>
                  {mode === "pagamentos" && <TableHead>Atendimento</TableHead>}
                  <TableHead>{mode === "pagamentos" ? "Pagamento" : "Status"}</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={isFetching ? "opacity-60 transition-opacity" : ""}>
                {linhas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">{formatDate(l.created_at)}</TableCell>
                    <TableCell className="font-medium truncate max-w-[160px]">{l.client_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[140px]">{l.service_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[120px]">{l.professional_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.method ? METODO_PAGAMENTO_LABEL[l.method] ?? l.method : "—"}</TableCell>
                    {mode === "pagamentos" && (
                      <TableCell>
                        {l.appointment_status ? (
                          <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full", APPT_STATUS_STYLE[l.appointment_status] ?? "bg-muted text-muted-foreground")}>
                            {STATUS_LABEL[l.appointment_status] ?? l.appointment_status}
                          </span>
                        ) : "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full", STATUS_STYLE[l.status] ?? "bg-muted text-muted-foreground")}>
                        {PAGAMENTO_STATUS_LABEL[l.status] ?? l.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(l.amount)}</TableCell>
                    <TableCell className="text-right">
                      {l.asaas_invoice_url && (
                        <a href={l.asaas_invoice_url} target="_blank" rel="noopener noreferrer" title="Ver cobrança" aria-label="Ver cobrança online" className="p-1.5 rounded-lg hover:bg-muted inline-flex">
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="md:hidden space-y-2">
            {linhas.map((l) => (
              <Card key={l.id}>
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{l.client_name ?? "Cliente"}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.service_name ?? "—"} · {formatDate(l.created_at)}</p>
                    </div>
                    <p className="font-medium text-sm shrink-0 tabular-nums">{formatCurrency(l.amount)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {mode === "pagamentos" && l.appointment_status && (
                      <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full", APPT_STATUS_STYLE[l.appointment_status] ?? "bg-muted text-muted-foreground")}>
                        Atendimento: {STATUS_LABEL[l.appointment_status] ?? l.appointment_status}
                      </span>
                    )}
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full", STATUS_STYLE[l.status] ?? "bg-muted text-muted-foreground")}>
                      {mode === "pagamentos" ? "Pagamento: " : ""}{PAGAMENTO_STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PaginationBar page={pagina} pageSize={PAGE_SIZE} total={total} onPageChange={setPagina} itemLabel="lançamento" />
        </>
      )}
    </div>
  );
}
