"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListOrdered, Phone, Calendar, Clock, Bell, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

type Entrada = {
  id: string;
  status: string;
  preferred_date: string | null;
  preferred_period: string | null;
  notes: string | null;
  created_at: string;
  clients: { name: string; phone: string | null } | null;
  services: { name: string } | null;
  professionals: { name: string } | null;
};

const PERIODO_LABEL: Record<string, string> = { morning: "Manhã", afternoon: "Tarde", evening: "Noite", any: "Qualquer horário" };

const ABAS = [
  { key: "waiting", label: "Na fila" },
  { key: "notified", label: "Notificados" },
  { key: "booked", label: "Agendados" },
  { key: "canceled", label: "Cancelados" },
] as const;

/**
 * Fase 5, Parte 9 — visão do profissional sobre a lista de espera.
 * Notificar o cliente aqui é uma ação MANUAL (ligar/mandar mensagem por
 * fora) — o Impegni não tem canal automático pro cliente (só push pro
 * profissional funciona hoje), então o botão só registra que o contato
 * foi feito, não dispara nada sozinho.
 */
export function EsperaView({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [aba, setAba] = useState<(typeof ABAS)[number]["key"]>("waiting");
  const [atualizando, setAtualizando] = useState<string | null>(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["waitlist", companyId, aba],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist_entries")
        .select("id, status, preferred_date, preferred_period, notes, created_at, clients(name, phone), services(name), professionals(name)")
        .eq("company_id", companyId)
        .eq("status", aba)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Entrada[];
    },
  });

  async function mudarStatus(id: string, status: string, label: string) {
    setAtualizando(id);
    const { error } = await supabase.from("waitlist_entries").update({ status }).eq("id", id);
    setAtualizando(null);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "atualizar a lista de espera"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["waitlist", companyId] });
    toast({ title: label });
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Link href="/agenda" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar pra Agenda
      </Link>
      <h1 className="font-heading text-3xl font-semibold mb-1">Lista de espera</h1>
      <p className="text-sm text-muted-foreground mb-6">Clientes esperando uma vaga quando não há horário livre.</p>

      <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
        <TabsList>
          {ABAS.map((a) => <TabsTrigger key={a.key} value={a.key}>{a.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value={aba}>
          {isLoading ? (
            <LoadingState text="Carregando..." />
          ) : isError ? (
            <ErrorState message="Não foi possível carregar a lista de espera." />
          ) : data.length === 0 ? (
            <Card className="mt-3">
              <CardContent className="py-12 text-center text-muted-foreground">
                <ListOrdered className="w-9 h-9 mx-auto mb-3 opacity-40" />
                {aba === "waiting" ? "Ninguém na fila de espera agora." : "Nada por aqui ainda."}
              </CardContent>
            </Card>
          ) : (
            <div className="mt-3 space-y-2">
              {data.map((e) => (
                <Card key={e.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{e.clients?.name ?? "Cliente removido"}</p>
                      {e.clients?.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {e.clients.phone}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {e.services?.name ?? "Serviço removido"}{e.professionals?.name ? ` com ${e.professionals.name}` : " — qualquer profissional"}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {e.preferred_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(e.preferred_date)}</span>}
                        {e.preferred_period && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {PERIODO_LABEL[e.preferred_period] ?? e.preferred_period}</span>}
                      </div>
                      {e.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">&quot;{e.notes}&quot;</p>}
                      <p className="text-[11px] text-muted-foreground mt-1.5">Entrou na fila em {formatDate(e.created_at)}</p>
                    </div>
                    {aba === "waiting" && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="gap-1.5" disabled={atualizando === e.id} onClick={() => mudarStatus(e.id, "notified", "Marcado como notificado")}>
                          <Bell className="w-3.5 h-3.5" /> Notificado
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" disabled={atualizando === e.id} onClick={() => mudarStatus(e.id, "booked", "Marcado como agendado")}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Agendado
                        </Button>
                        <button
                          onClick={() => mudarStatus(e.id, "canceled", "Removido da fila")}
                          disabled={atualizando === e.id}
                          aria-label="Remover da fila"
                          title="Remover da fila"
                          className={cn("p-1.5 rounded-lg hover:bg-muted", atualizando === e.id && "opacity-50")}
                        >
                          <XCircle className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    )}
                    {aba === "notified" && (
                      <Button size="sm" variant="outline" className="gap-1.5 shrink-0" disabled={atualizando === e.id} onClick={() => mudarStatus(e.id, "booked", "Marcado como agendado")}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Agendado
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
