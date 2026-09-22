"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Coffee, Palmtree, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { formatDateTime, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { ConflitosDialog, type Conflito } from "./conflitos-dialog";

type BlockType = "block" | "day_off" | "vacation";

type BlockRow = {
  id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  type: BlockType;
  professionals: { name: string } | null;
};

const TYPE_INFO: Record<BlockType, { label: string; icon: typeof Ban; color: string }> = {
  block: { label: "Bloqueio", icon: Ban, color: "text-chart-4" },
  day_off: { label: "Folga", icon: Coffee, color: "text-chart-2" },
  vacation: { label: "Férias", icon: Palmtree, color: "text-chart-1" },
};

function hojeStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Meia-noite local do dia seguinte, em ISO — usado pra fechar o intervalo
// de dia(s) inteiro(s) de folga/férias sem depender de saber o expediente
// do profissional (a RPC de ocupação já zera a capacidade quando o bloco
// cobre o expediente inteiro do dia).
function proximaMeiaNoiteLocal(dataStr: string) {
  const [y, m, d] = dataStr.split("-").map(Number);
  return new Date(y, m - 1, d + 1).toISOString();
}
function meiaNoiteLocal(dataStr: string) {
  const [y, m, d] = dataStr.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

const FORM_VAZIO = {
  professionalId: "",
  data: hojeStr(),
  dataFim: hojeStr(),
  diaInteiro: true,
  horaInicio: "09:00",
  horaFim: "18:00",
  motivo: "",
};

export function BloqueiosView({ companyId, companyTimezone }: { companyId: string; companyTimezone: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();

  const [tipo, setTipo] = useState<BlockType>("block");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<BlockRow | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);
  const [conflitos, setConflitos] = useState<Conflito[] | null>(null);
  const [payloadPendente, setPayloadPendente] = useState<{ professional_id: string; starts_at: string; ends_at: string; reason: string | null; type: BlockType } | null>(null);

  const { data: professionals = [], isLoading: loadingProfessionals, isError: errorProfessionals } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("id, name").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: blocks = [], isLoading: loadingBlocks, isError: errorBlocks } = useQuery({
    queryKey: ["professional-blocks", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_blocks")
        .select("id, professional_id, starts_at, ends_at, reason, type, professionals(name)")
        .eq("company_id", companyId)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as unknown as BlockRow[];
    },
  });

  function abrirNovo(t: BlockType) {
    setTipo(t);
    setForm({ ...FORM_VAZIO, professionalId: professionals[0]?.id ?? "", diaInteiro: t !== "block" });
    setOpen(true);
  }

  function montarPayload(): { professional_id: string; starts_at: string; ends_at: string; reason: string | null; type: BlockType } | null {
    if (!form.professionalId) return null;
    let starts_at: string;
    let ends_at: string;
    if (tipo === "vacation") {
      if (!form.data || !form.dataFim || form.dataFim < form.data) return null;
      starts_at = meiaNoiteLocal(form.data);
      ends_at = proximaMeiaNoiteLocal(form.dataFim);
    } else if (form.diaInteiro) {
      if (!form.data) return null;
      starts_at = meiaNoiteLocal(form.data);
      ends_at = proximaMeiaNoiteLocal(form.data);
    } else {
      if (!form.data || !form.horaInicio || !form.horaFim || form.horaFim <= form.horaInicio) return null;
      starts_at = new Date(`${form.data}T${form.horaInicio}:00`).toISOString();
      ends_at = new Date(`${form.data}T${form.horaFim}:00`).toISOString();
    }
    return { professional_id: form.professionalId, starts_at, ends_at, reason: form.motivo.trim() || null, type: tipo };
  }

  async function verificarEContinuar() {
    const payload = montarPayload();
    if (!payload) return;
    setSalvando(true);
    const { data, error } = await supabase.rpc("get_block_conflicts", {
      p_company_id: companyId,
      p_professional_id: payload.professional_id,
      p_starts_at: payload.starts_at,
      p_ends_at: payload.ends_at,
    });
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "verificar conflitos"), variant: "destructive" });
      return;
    }
    if (data && data.length > 0) {
      setPayloadPendente(payload);
      setConflitos(data as Conflito[]);
      setOpen(false);
      return;
    }
    await criarBloqueio(payload);
  }

  async function criarBloqueio(payload: { professional_id: string; starts_at: string; ends_at: string; reason: string | null; type: BlockType }) {
    setSalvando(true);
    const { error } = await supabase.from("professional_blocks").insert({ company_id: companyId, ...payload });
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "criar o bloqueio"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["professional-blocks", companyId] });
    qc.invalidateQueries({ queryKey: ["occupancy-month", companyId] });
    toast({ title: `${TYPE_INFO[payload.type].label} criado(a)` });
    setOpen(false);
    setConflitos(null);
    setPayloadPendente(null);
  }

  async function excluir() {
    if (!excluindo) return;
    setExcluindoLoading(true);
    const { error } = await supabase.from("professional_blocks").delete().eq("id", excluindo.id);
    setExcluindoLoading(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "excluir"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["professional-blocks", companyId] });
    qc.invalidateQueries({ queryKey: ["occupancy-month", companyId] });
    toast({ title: "Removido" });
    setExcluindo(null);
  }

  const isLoading = loadingProfessionals || loadingBlocks;
  const isError = errorProfessionals || errorBlocks;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Link href="/agenda" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar pra Agenda
      </Link>
      <h1 className="font-heading text-3xl font-semibold mb-1">Bloqueios, folgas e férias</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Períodos em que um profissional não recebe agendamento. Já contam automaticamente na ocupação da Agenda e nos horários disponíveis pro cliente.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="outline" className="gap-2" onClick={() => abrirNovo("block")}><Plus className="w-4 h-4" /> Bloquear horário</Button>
        <Button variant="outline" className="gap-2" onClick={() => abrirNovo("day_off")}><Plus className="w-4 h-4" /> Folga</Button>
        <Button variant="outline" className="gap-2" onClick={() => abrirNovo("vacation")}><Plus className="w-4 h-4" /> Férias</Button>
      </div>

      {isLoading ? (
        <LoadingState text="Carregando..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar bloqueios/folgas/férias." />
      ) : blocks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Ban className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhum bloqueio, folga ou período de férias cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {blocks.map((b) => {
            const info = TYPE_INFO[b.type] ?? TYPE_INFO.block;
            const Icon = info.icon;
            return (
              <Card key={b.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${info.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{info.label} · {b.professionals?.name ?? "Profissional removido"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDateTime(b.starts_at)} até {formatDateTime(b.ends_at)}{b.reason ? ` · ${b.reason}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setExcluindo(b)}
                    aria-label="Excluir"
                    title="Excluir"
                    className="p-2 rounded-lg hover:bg-muted text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{TYPE_INFO[tipo].label}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Profissional</Label>
              <Select value={form.professionalId} onValueChange={(v) => setForm({ ...form, professionalId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {tipo === "vacation" ? (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data inicial</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div><Label>Data final</Label><Input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} /></div>
              </div>
            ) : (
              <>
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                {tipo === "day_off" && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.diaInteiro} onCheckedChange={(v) => setForm({ ...form, diaInteiro: v === true })} />
                    Dia inteiro
                  </label>
                )}
                {(tipo === "block" || !form.diaInteiro) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Hora início</Label><Input type="time" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} /></div>
                    <div><Label>Hora fim</Label><Input type="time" value={form.horaFim} onChange={(e) => setForm({ ...form, horaFim: e.target.value })} /></div>
                  </div>
                )}
              </>
            )}

            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder={tipo === "block" ? "Ex.: almoço, compromisso pessoal" : tipo === "day_off" ? "Ex.: consulta médica" : "Ex.: férias anuais"}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={verificarEContinuar} disabled={salvando || !montarPayload()}>
              {salvando ? "Verificando..." : "Continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {conflitos && payloadPendente && (
        <ConflitosDialog
          open={!!conflitos}
          conflitos={conflitos}
          companyId={companyId}
          companyTimezone={companyTimezone}
          professionalId={payloadPendente.professional_id}
          criando={salvando}
          onVoltar={() => { setConflitos(null); setPayloadPendente(null); setOpen(true); }}
          onCriarMesmoAssim={() => criarBloqueio(payloadPendente)}
        />
      )}

      <ConfirmDeleteDialog
        open={!!excluindo}
        title={`Excluir ${excluindo ? TYPE_INFO[excluindo.type].label.toLowerCase() : ""}?`}
        description={excluindo ? `${TYPE_INFO[excluindo.type].label} de ${excluindo.professionals?.name ?? "profissional"} em ${formatDate(excluindo.starts_at)} será removido(a). Agendamentos não são afetados.` : ""}
        loading={excluindoLoading}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
