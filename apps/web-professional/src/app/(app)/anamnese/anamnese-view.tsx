"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ClipboardList, Pencil, Trash2, ArrowUp, ArrowDown, GripVertical, Lock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

const TIPOS: { value: Tables<"anamnesis_fields">["field_type"]; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "boolean", label: "Sim / Não" },
  { value: "single_choice", label: "Seleção única" },
  { value: "multiple_choice", label: "Múltipla escolha" },
];
const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.value, t.label]));
const FORM_VAZIO = { label: "", field_type: "text" as Tables<"anamnesis_fields">["field_type"], required: false, options: "" };

/**
 * Formulário de anamnese configurável (Fase 3, Parte 7) — um formulário por
 * empresa (cria sob demanda no primeiro acesso). Perguntas viram
 * `anamnesis_fields`; preencher a ficha de um cliente (feito em Clientes)
 * grava em `anamnesis_responses`/`answers`, histórico nunca é sobrescrito.
 */
export function AnamneseView({ companyId, canCustomize }: { companyId: string; canCustomize: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Tables<"anamnesis_fields"> | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [excluindo, setExcluindo] = useState<Tables<"anamnesis_fields"> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoPergunta, setExcluindoPergunta] = useState(false);
  const [criandoForm, setCriandoForm] = useState(false);
  // guarda síncrona (não é useState) pra sobreviver ao StrictMode do React
  // disparando o efeito 2x em dev — sem isso, as 2 chamadas concorrentes
  // liam "ainda não tentei" antes da primeira terminar e criavam 2 linhas.
  const tentouCriar = useRef(false);

  // Uma ficha por segmento de atuação (migration 20260918000000): a empresa
  // pode ter várias fichas ativas. Legado (sem segmento) continua sendo 1.
  const { data: formularios = [], isLoading: carregandoForm, isError: erroForm } = useQuery({
    queryKey: ["anamnesis-forms", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis_forms")
        .select("*, segments(name)")
        .eq("company_id", companyId)
        .order("created_at");
      if (error) throw error;
      return data as unknown as (Tables<"anamnesis_forms"> & { segments: { name: string } | null })[];
    },
  });
  const [formIdSelecionado, setFormIdSelecionado] = useState<string | null>(null);
  const formulario = formularios.find((f) => f.id === formIdSelecionado) ?? formularios.find((f) => f.active) ?? formularios[0] ?? null;

  const { data: campos = [], isLoading: carregandoCampos, isError: erroCampos } = useQuery({
    queryKey: ["anamnesis-fields", formulario?.id],
    enabled: !!formulario?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis_fields")
        .select("*")
        .eq("form_id", formulario!.id)
        .is("archived_at", null)
        .order("sort_order");
      if (error) throw error;
      return data as Tables<"anamnesis_fields">[];
    },
  });

  // Sem formulário ainda: cria um automaticamente na primeira visita à tela
  // (fluxo mais simples que pedir pra clicar "criar formulário" à toa).
  useEffect(() => {
    if (!carregandoForm && !erroForm && formularios.length === 0 && !tentouCriar.current) {
      tentouCriar.current = true;
      setCriandoForm(true);
      supabase
        .from("anamnesis_forms")
        .insert({ company_id: companyId, title: "Anamnese" })
        .select()
        .single()
        .then(({ error }) => {
          setCriandoForm(false);
          // 23505 = unique_violation: outra chamada concorrente (StrictMode,
          // outra aba) já criou o formulário — não é erro de verdade, só
          // recarrega e usa o que já existe.
          if (!error || error.code === "23505") qc.invalidateQueries({ queryKey: ["anamnesis-forms", companyId] });
        });
    }
  }, [carregandoForm, erroForm, formularios.length, companyId, qc, supabase]);

  async function alternarAtivo(v: boolean) {
    if (!formulario) return;
    const { error } = await supabase.from("anamnesis_forms").update({ active: v }).eq("id", formulario.id);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "atualizar o formulário"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["anamnesis-forms", companyId] });
  }

  async function salvarPergunta() {
    if (!formulario || !form.label.trim() || salvando) return;
    const precisaOpcoes = form.field_type === "single_choice" || form.field_type === "multiple_choice";
    const options = precisaOpcoes ? form.options.split(",").map((o) => o.trim()).filter(Boolean) : null;
    if (precisaOpcoes && (!options || options.length < 2)) {
      toast({ title: "Informe pelo menos 2 opções, separadas por vírgula", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const payload = { form_id: formulario.id, label: form.label.trim(), field_type: form.field_type, required: form.required, options };
    const { error } = editando
      ? await supabase.from("anamnesis_fields").update(payload).eq("id", editando.id)
      : await supabase.from("anamnesis_fields").insert({ ...payload, sort_order: campos.length });
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "salvar a pergunta"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["anamnesis-fields", formulario.id] });
    toast({ title: editando ? "Pergunta atualizada" : "Pergunta adicionada" });
    fechar();
  }

  async function excluirPergunta() {
    if (!excluindo || !formulario) return;
    setExcluindoPergunta(true);
    let { error } = await supabase.from("anamnesis_fields").delete().eq("id", excluindo.id);
    let arquivada = false;
    // Pergunta que já tem respostas não pode ser apagada (o banco bloqueia,
    // pra nunca destruir histórico) — vira "arquivada": some da ficha, mas
    // as respostas antigas continuam intactas.
    if (error?.code === "P0001" && /respostas/.test(error.message)) {
      ({ error } = await supabase.from("anamnesis_fields").update({ archived_at: new Date().toISOString() }).eq("id", excluindo.id));
      arquivada = !error;
    }
    setExcluindoPergunta(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "excluir a pergunta"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["anamnesis-fields", formulario.id] });
    toast({ title: arquivada ? "Pergunta arquivada" : "Pergunta removida", description: arquivada ? "Ela já tinha respostas: sai da ficha, mas o histórico continua guardado." : undefined });
    setExcluindo(null);
  }

  async function mover(campo: Tables<"anamnesis_fields">, direcao: -1 | 1) {
    const idx = campos.findIndex((c) => c.id === campo.id);
    const vizinho = campos[idx + direcao];
    if (!vizinho || !formulario) return;
    await Promise.all([
      supabase.from("anamnesis_fields").update({ sort_order: vizinho.sort_order }).eq("id", campo.id),
      supabase.from("anamnesis_fields").update({ sort_order: campo.sort_order }).eq("id", vizinho.id),
    ]);
    qc.invalidateQueries({ queryKey: ["anamnesis-fields", formulario.id] });
  }

  function editar(campo: Tables<"anamnesis_fields">) {
    setEditando(campo);
    setForm({
      label: campo.label,
      field_type: campo.field_type,
      required: campo.required,
      options: Array.isArray(campo.options) ? (campo.options as string[]).join(", ") : "",
    });
    setOpen(true);
  }

  function fechar() {
    setOpen(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  if (carregandoForm || criandoForm) return <LoadingState text="Carregando..." />;
  if (erroForm) return <ErrorState message="Não foi possível carregar o formulário de anamnese." />;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Anamnese</h1>
          <p className="text-sm text-muted-foreground">Ficha de perguntas que o profissional preenche com o cliente{formulario?.segments?.name ? ` — ${formulario.segments.name}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Formulário ativo</Label>
          <Switch checked={formulario?.active ?? false} onCheckedChange={alternarAtivo} />
        </div>
      </div>

      {formularios.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {formularios.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormIdSelecionado(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                formulario?.id === f.id ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.segments?.name ?? f.title}{!f.active && " · inativa"}
            </button>
          ))}
        </div>
      )}

      {!canCustomize && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 flex items-start gap-2.5 text-sm">
          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-foreground">Seu plano usa a ficha de anamnese <strong>padrão</strong> — as perguntas abaixo não podem ser alteradas.</p>
            <Link href="/meu-plano" className="inline-flex items-center gap-1 text-primary hover:underline mt-1">
              <Sparkles className="w-3.5 h-3.5" /> Fazer upgrade para personalizar
            </Link>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-3">
        <Dialog open={open && canCustomize} onOpenChange={(o) => (o ? setOpen(o) : fechar())}>
          {canCustomize && (
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nova pergunta</Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader><DialogTitle>{editando ? "Editar pergunta" : "Nova pergunta"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Pergunta</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Possui alguma alergia?" /></div>
              <div>
                <Label>Tipo de resposta</Label>
                <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v as typeof form.field_type })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(form.field_type === "single_choice" || form.field_type === "multiple_choice") && (
                <div>
                  <Label>Opções (separadas por vírgula)</Label>
                  <Textarea rows={2} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Ex: Seco, Oleoso, Misto" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Obrigatória</Label>
                <Switch checked={form.required} onCheckedChange={(v) => setForm({ ...form, required: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvarPergunta} disabled={!form.label.trim() || salvando}>{salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {carregandoCampos ? (
        <LoadingState text="Carregando perguntas..." />
      ) : erroCampos ? (
        <ErrorState message="Não foi possível carregar as perguntas." />
      ) : campos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="mb-4">Nenhuma pergunta cadastrada ainda.</p>
            {canCustomize && (
              <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Adicionar primeira pergunta</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {campos.map((c, i) => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-center gap-3">
                {canCustomize && <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.label}{c.required && <span className="text-destructive"> *</span>}</p>
                  <p className="text-xs text-muted-foreground">{TIPO_LABEL[c.field_type]}</p>
                </div>
                {canCustomize && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => mover(c, -1)} disabled={i === 0} title="Mover pra cima" aria-label="Mover pra cima" className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => mover(c, 1)} disabled={i === campos.length - 1} title="Mover pra baixo" aria-label="Mover pra baixo" className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editar(c)} title="Editar" aria-label="Editar pergunta" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setExcluindo(c)} title="Excluir" aria-label="Excluir pergunta" className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!excluindo}
        title="Excluir pergunta?"
        description={excluindo ? `"${excluindo.label}" some do formulário. Respostas já preenchidas por clientes continuam guardadas no histórico.` : ""}
        loading={excluindoPergunta}
        onConfirm={excluirPergunta}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
