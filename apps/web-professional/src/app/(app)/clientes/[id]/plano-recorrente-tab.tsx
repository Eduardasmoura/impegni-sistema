"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Repeat, Package, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

type Pacote = Tables<"client_packages"> & { services: { name: string } | null };
const PACOTE_VAZIO = { service_id: "", total_sessions: "5", price_paid: "", validade_dias: "" };

/**
 * "Plano recorrente" — pedido explícito da reformulação de Clientes, mas o
 * banco hoje NÃO tem um conceito de assinatura/cobrança recorrente por
 * CLIENTE (o que existe é `client_packages`: pacote pré-pago de N sessões
 * de um serviço, sem periodicidade nem "próxima cobrança" — diferente de
 * um plano mensal recorrente de verdade). Pra não inventar dado de
 * cobrança que não existe, a seção "Plano recorrente" sempre mostra o
 * estado vazio hoje — nenhum cliente tem essa informação porque a
 * estrutura pra isso ainda não existe. "Pacotes" (funcionalidade real,
 * já existente antes desta reformulação) continua abaixo, sem mudança de
 * comportamento — só mudou de lugar (era uma aba do dialog antigo).
 */
export function PlanoRecorrenteTab({ companyId, clientId }: { companyId: string; clientId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [comprando, setComprando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(PACOTE_VAZIO);

  const { data: servicos = [] } = useQuery({
    queryKey: ["servicos-pacote", companyId],
    enabled: comprando,
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id, name, price").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as { id: string; name: string; price: number }[];
    },
  });

  const { data: pacotes = [], isLoading, isError } = useQuery({
    queryKey: ["cliente-pacotes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_packages").select("*, services(name)").eq("client_id", clientId).order("purchased_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Pacote[];
    },
  });

  async function comprar() {
    if (!form.service_id || !form.total_sessions || !form.price_paid) return;
    setSalvando(true);
    const expires_at = form.validade_dias ? new Date(Date.now() + Number(form.validade_dias) * 86400000).toISOString() : null;
    const { error } = await supabase.from("client_packages").insert({
      company_id: companyId,
      client_id: clientId,
      service_id: form.service_id,
      total_sessions: Number(form.total_sessions),
      price_paid: Number(form.price_paid),
      expires_at,
    });
    setSalvando(false);
    if (error) {
      toast({ title: "Erro ao registrar pacote", description: friendlyError(error, "registrar o pacote"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["cliente-pacotes", clientId] });
    toast({ title: "Pacote registrado" });
    setForm(PACOTE_VAZIO);
    setComprando(false);
  }

  return (
    <div className="mt-3 space-y-6">
      <section>
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Repeat className="w-4 h-4" /> Plano recorrente</h3>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Este cliente não possui um plano recorrente ativo.
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Package className="w-4 h-4" /> Pacotes</h3>

        {!comprando ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setComprando(true)}>
            <Plus className="w-3.5 h-3.5" /> Registrar novo pacote
          </Button>
        ) : (
          <Card>
            <CardContent className="p-3.5 space-y-2.5">
              <div>
                <Label>Serviço</Label>
                <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha o serviço" /></SelectTrigger>
                  <SelectContent>{servicos.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div><Label>Sessões</Label><Input type="number" min={1} value={form.total_sessions} onChange={(e) => setForm({ ...form, total_sessions: e.target.value })} /></div>
                <div><Label>Validade (dias, opcional)</Label><Input type="number" min={1} placeholder="Sem prazo" value={form.validade_dias} onChange={(e) => setForm({ ...form, validade_dias: e.target.value })} /></div>
              </div>
              <div><Label>Valor pago pelo pacote</Label><CurrencyInput value={form.price_paid} onValueChange={(v) => setForm({ ...form, price_paid: v })} /></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={comprar} disabled={salvando || !form.service_id || !form.total_sessions || !form.price_paid} className="gap-1.5">
                  {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Registrar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setComprando(false); setForm(PACOTE_VAZIO); }}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground mt-3">Carregando pacotes...</p>
        ) : isError ? (
          <p className="text-sm text-destructive mt-3">Não foi possível carregar os pacotes.</p>
        ) : pacotes.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">Nenhum pacote registrado pra este cliente.</p>
        ) : (
          <div className="space-y-2 mt-3">
            {pacotes.map((p) => {
              const restante = p.total_sessions - p.used_sessions;
              const expirado = p.expires_at ? new Date(p.expires_at) < new Date() : false;
              const esgotado = restante <= 0;
              return (
                <Card key={p.id}>
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-medium">{p.services?.name ?? "Serviço removido"}</p>
                        <p className="text-xs text-muted-foreground">Comprado em {formatDate(p.purchased_at)} · {formatCurrency(p.price_paid)}</p>
                        {p.expires_at && <p className="text-xs text-muted-foreground">Válido até {formatDate(p.expires_at)}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{restante} / {p.total_sessions} <span className="text-xs font-normal text-muted-foreground">restantes</span></p>
                        {(expirado || esgotado) && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">{expirado ? "Expirado" : "Esgotado"}</span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round((p.used_sessions / p.total_sessions) * 100))}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
