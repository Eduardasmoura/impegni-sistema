"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog, Pencil, Trash2, Percent, Clock, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { HorariosSemanaDialog } from "./horarios-semana-dialog";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

const FORM_VAZIO = {
  name: "",
  role_title: "",
  start_time: "09:00",
  end_time: "18:00",
  active: true,
  commission_type: "percentage" as "percentage" | "fixed",
  commission_value: "",
  segment_ids: [] as string[],
};

/**
 * Cadastro dos profissionais que atendem (barbeiros, cabeleireiras...) — quem
 * de fato aparece pro cliente escolher ao agendar. É diferente de
 * `company_members` (quem tem login no painel); um profissional pode não ter
 * conta própria ainda, só o registro aqui.
 */
export function EquipeView({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Deep link do onboarding guiado (Fase 6) — chegar em /equipe?onboarding=1
  // já abre o diálogo de cadastro, poupando 1 clique de quem veio do passo
  // "Adicione um profissional" do checklist.
  useEffect(() => {
    if (searchParams.get("onboarding") === "1") setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [editando, setEditando] = useState<Tables<"professionals"> | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [excluindo, setExcluindo] = useState<Tables<"professionals"> | null>(null);
  const [salvandoExclusao, setSalvandoExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [configurandoHorarios, setConfigurandoHorarios] = useState<Tables<"professionals"> | null>(null);

  const { data: profissionais = [], isLoading, isError } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });

  // Segmentos de atuação do profissional (Cílios, Unhas, Sobrancelhas...) —
  // determinam quais fichas de anamnese ele/a empresa recebem. Catálogo
  // global (`segments`) já existe pro onboarding; a novidade é o vínculo
  // por profissional (`professional_segments`, N:N).
  const { data: segmentosDisponiveis = [] } = useQuery({
    queryKey: ["segments-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("segments").select("id, name").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
  const { data: segmentosPorProfissional = {} } = useQuery({
    queryKey: ["professional-segments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_segments")
        .select("professional_id, segment_id, professionals!inner(company_id)")
        .eq("professionals.company_id", companyId);
      if (error) throw error;
      const mapa: Record<string, string[]> = {};
      for (const row of data ?? []) (mapa[row.professional_id] ??= []).push(row.segment_id);
      return mapa;
    },
  });

  // Comissão vigente de cada profissional — a vigência aberta (effective_to
  // is null) de `professional_commissions` (migration 054). Não é coluna em
  // `professionals`: trocar a comissão fecha essa vigência e abre outra,
  // preservando o valor que valia em cada atendimento passado.
  const { data: comissoes = {} } = useQuery({
    queryKey: ["professional-commissions-current", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_commissions")
        .select("professional_id, commission_type, commission_value")
        .eq("company_id", companyId)
        .is("effective_to", null);
      if (error) throw error;
      const mapa: Record<string, { commission_type: string; commission_value: number }> = {};
      (data || []).forEach((c) => { mapa[c.professional_id] = { commission_type: c.commission_type, commission_value: Number(c.commission_value) }; });
      return mapa;
    },
  });

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    const payload = {
      company_id: companyId,
      name: form.name,
      role_title: form.role_title || null,
      start_time: form.start_time,
      end_time: form.end_time,
      active: form.active,
    };
    const { data: salvo, error } = editando
      ? await supabase.from("professionals").update(payload).eq("id", editando.id).select("id").single()
      : await supabase.from("professionals").insert(payload).select("id").single();
    if (error) {
      setSalvando(false);
      toast({ title: "Erro", description: friendlyError(error, "salvar o profissional"), variant: "destructive" });
      return;
    }

    if (form.commission_value.trim()) {
      const { error: comissaoError } = await supabase.rpc("set_professional_commission", {
        p_professional_id: salvo.id,
        p_commission_type: form.commission_type,
        p_commission_value: Number(form.commission_value),
      });
      if (comissaoError) {
        toast({ title: "Profissional salvo, mas a comissão não foi atualizada", description: friendlyError(comissaoError, "atualizar a comissão"), variant: "destructive" });
      }
    }

    // Segmentos determinam as fichas de anamnese que o profissional/empresa
    // recebem — a RPC substitui o conjunto inteiro e já sincroniza (cria a
    // ficha do segmento novo, copiando o modelo publicado pelo Super Admin,
    // se ainda não existir uma).
    const { error: segmentosError } = await supabase.rpc("set_professional_segments", {
      p_professional_id: salvo.id,
      p_segment_ids: form.segment_ids,
    });
    if (segmentosError) {
      toast({ title: "Profissional salvo, mas os segmentos não foram atualizados", description: friendlyError(segmentosError, "atualizar os segmentos"), variant: "destructive" });
    }

    setSalvando(false);
    qc.invalidateQueries({ queryKey: ["professionals", companyId] });
    qc.invalidateQueries({ queryKey: ["professional-commissions-current", companyId] });
    qc.invalidateQueries({ queryKey: ["professional-segments", companyId] });
    toast({ title: editando ? "Profissional atualizado" : "Profissional cadastrado" });
    setOpen(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  async function excluir() {
    if (!excluindo) return;
    setSalvandoExclusao(true);
    const { error } = await supabase.from("professionals").delete().eq("id", excluindo.id);
    setSalvandoExclusao(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: friendlyError(error, "excluir o profissional"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["professionals", companyId] });
    toast({ title: "Profissional removido" });
    setExcluindo(null);
  }

  function editar(profissional: Tables<"professionals">) {
    setEditando(profissional);
    const comissaoAtual = comissoes[profissional.id];
    setForm({
      name: profissional.name,
      role_title: profissional.role_title || "",
      start_time: profissional.start_time || "09:00",
      end_time: profissional.end_time || "18:00",
      active: profissional.active,
      commission_type: (comissaoAtual?.commission_type as "percentage" | "fixed") || "percentage",
      commission_value: comissaoAtual ? String(comissaoAtual.commission_value) : "",
      segment_ids: segmentosPorProfissional[profissional.id] ?? [],
    });
    setOpen(true);
  }

  function alternarSegmento(segmentId: string) {
    setForm((f) => ({
      ...f,
      segment_ids: f.segment_ids.includes(segmentId) ? f.segment_ids.filter((s) => s !== segmentId) : [...f.segment_ids, segmentId],
    }));
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Equipe</h1>
          <p className="text-sm text-muted-foreground">Profissionais que atendem na sua empresa</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo profissional</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editando ? "Editar profissional" : "Novo profissional"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Cargo</Label><Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} placeholder="Ex: barbeiro" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início do expediente</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                <div><Label>Fim do expediente</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo (aparece pro cliente agendar)</Label>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>

              <div className="pt-2 border-t border-border">
                <Label className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Segmentos de atuação</Label>
                <p className="text-xs text-muted-foreground mb-2">Define quais fichas de anamnese este profissional (e a empresa) recebem. Pode marcar mais de um.</p>
                <div className="flex flex-wrap gap-2">
                  {segmentosDisponiveis.map((s) => {
                    const marcado = form.segment_ids.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => alternarSegmento(s.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          marcado ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                  {segmentosDisponiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhum segmento cadastrado na plataforma ainda.</p>}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Label className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Comissão</Label>
                <p className="text-xs text-muted-foreground mb-2">Deixe em branco pra não alterar. Trocar aqui não muda o valor de repasses já fechados.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={form.commission_type} onValueChange={(v) => setForm({ ...form, commission_type: v as "percentage" | "fixed" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.commission_type === "percentage" ? (
                    <Input type="number" min={0} max={100} placeholder="Ex: 40" value={form.commission_value} onChange={(e) => setForm({ ...form, commission_value: e.target.value })} />
                  ) : (
                    <CurrencyInput value={form.commission_value} onValueChange={(v) => setForm({ ...form, commission_value: v })} />
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={!form.name || salvando}>{salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <LoadingState text="Carregando equipe..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar sua equipe." />
      ) : (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {profissionais.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">{p.name[0]}</div>
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.role_title || "—"}{!p.active && " · inativo"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setConfigurandoHorarios(p)} title="Horários por dia da semana" aria-label="Configurar horários por dia da semana" className="p-1.5 rounded-lg hover:bg-muted"><Clock className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => editar(p)} title="Editar" aria-label="Editar profissional" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setExcluindo(p)} title="Excluir" aria-label="Excluir profissional" className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">{p.start_time?.slice(0, 5)} — {p.end_time?.slice(0, 5)}</p>
                {comissoes[p.id] && (
                  <span className="text-xs font-medium text-primary">
                    {comissoes[p.id].commission_type === "percentage" ? `${comissoes[p.id].commission_value}%` : formatCurrency(comissoes[p.id].commission_value)}
                  </span>
                )}
              </div>
              {(segmentosPorProfissional[p.id]?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {segmentosPorProfissional[p.id].map((segId) => {
                    const nome = segmentosDisponiveis.find((s) => s.id === segId)?.name;
                    return nome ? <span key={segId} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{nome}</span> : null;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {profissionais.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-16 text-center text-muted-foreground">
              <UserCog className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="mb-4">Você ainda não tem nenhum profissional cadastrado.</p>
              <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Adicionar primeiro profissional</Button>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      <ConfirmDeleteDialog
        open={!!excluindo}
        title="Excluir profissional?"
        description={excluindo ? `"${excluindo.name}" será removido da equipe e deixa de aparecer pros clientes agendarem. Essa ação não pode ser desfeita.` : ""}
        loading={salvandoExclusao}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />

      {configurandoHorarios && (
        <HorariosSemanaDialog
          open={!!configurandoHorarios}
          onOpenChange={(o) => !o && setConfigurandoHorarios(null)}
          professional={configurandoHorarios}
          companyId={companyId}
        />
      )}
    </div>
  );
}
