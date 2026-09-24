"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Inbox, MessageSquarePlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/query-state";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { supportCategoryLabel, supportProtocol, supportStatus } from "@/lib/support";
import { cn } from "@/lib/utils";

export type TicketResumo = { id: string; subject: string; category: string | null; status: string; created_at: string; updated_at: string; opened_by: string | null };

// A RLS de support_tickets (support_tickets_select_company_members) só
// devolve chamados das empresas em que o usuário é membro ativo; o filtro por
// company_id aqui só escolhe a empresa aberta no painel.
export function SolicitacoesView({ companyId, userId }: { companyId: string; userId: string }) {
  const { data: tickets, isLoading, isError } = useQuery({
    queryKey: ["support-tickets", companyId],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("support_tickets")
        .select("id, subject, category, status, created_at, updated_at, opened_by")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TicketResumo[];
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold">Minhas solicitações</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe os chamados que você e sua equipe enviaram. Respondemos em até 24 horas pelo e-mail cadastrado.</p>
        </div>
        <Button asChild className="gap-2 self-start sm:self-auto"><Link href="/suporte/solicitar"><MessageSquarePlus className="w-4 h-4" /> Nova solicitação</Link></Button>
      </div>

      {isLoading ? (
        <Card className="divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-5 py-4 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
          ))}
        </Card>
      ) : isError ? (
        <ErrorState message="Não foi possível carregar suas solicitações. Tente novamente em instantes." />
      ) : !tickets || tickets.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <Inbox className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <p className="font-heading text-lg font-semibold mt-3">Nenhuma solicitação por aqui</p>
          <p className="text-sm text-muted-foreground mt-1">Quando você falar com a nossa equipe, o chamado aparece nesta lista.</p>
          <Button asChild variant="outline" className="mt-5 gap-2"><Link href="/suporte/solicitar"><MessageSquarePlus className="w-4 h-4" /> Abrir solicitação</Link></Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_140px_110px_130px_20px] gap-4 px-5 py-2.5 text-xs font-medium text-muted-foreground border-b border-border bg-muted/40">
            <span>Assunto</span><span>Categoria</span><span>Aberta em</span><span>Status</span><span />
          </div>
          <ul className="divide-y divide-border">
            {tickets.map((t) => {
              const st = supportStatus(t.status);
              return (
                <li key={t.id}>
                  <Link href={`/suporte/solicitacoes/${t.id}`} data-testid="ticket-row" className="group grid grid-cols-[minmax(0,1fr)_20px] md:grid-cols-[minmax(0,1fr)_140px_110px_130px_20px] gap-x-4 gap-y-1 items-center px-5 py-4 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary">{t.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        #{supportProtocol(t.id)} · atualizado em {formatDate(t.updated_at)}{t.opened_by === userId ? " · aberta por você" : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 md:hidden">
                        <StatusBadge status={t.status} />
                        <span className="text-xs text-muted-foreground">{supportCategoryLabel(t.category)} · {formatDate(t.created_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground md:order-last" />
                    <span className="hidden md:block text-sm text-muted-foreground truncate">{supportCategoryLabel(t.category)}</span>
                    <span className="hidden md:block text-sm text-muted-foreground">{formatDate(t.created_at)}</span>
                    <span className="hidden md:block"><StatusBadge status={t.status} /></span>
                    <span className={cn("sr-only")}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const st = supportStatus(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", st.badge)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} /> {st.label}
    </span>
  );
}
