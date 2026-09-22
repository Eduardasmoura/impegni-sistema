"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, ClipboardList, Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const TIPOS: { value: string; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "boolean", label: "Sim / Não" },
  { value: "single_choice", label: "Seleção única" },
  { value: "multiple_choice", label: "Múltipla escolha" },
];
const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.value, t.label]));

type CampoLocal = { key: string; label: string; field_type: string; required: boolean; options: string };
const CAMPO_VAZIO: CampoLocal = { key: "", label: "", field_type: "text", required: false, options: "" };

function paraLocal(f: Tables<"anamnesis_template_fields">): CampoLocal {
  return {
    key: f.id,
    label: f.label,
    field_type: f.field_type,
    required: f.required,
    options: Array.isArray(f.options) ? (f.options as string[]).join(", ") : "",
  };
}

export function AnamneseTemplateView({
  segment,
  currentTemplate,
  initialFields,
  versions,
}: {
  segment: { id: string; name: string };
  currentTemplate: Tables<"anamnesis_templates"> | null;
  initialFields: Tables<"anamnesis_template_fields">[];
  versions: { id: string; version: number; created_at: string }[];
}) {
  const { toast } = useToast();
  const supabase = createClient();
  const [titulo, setTitulo] = useState(currentTemplate?.title ?? `Ficha de ${segment.name}`);
  const [campos, setCampos] = useState<CampoLocal[]>(initialFields.map(paraLocal));
  const [open, setOpen] = useState(false);
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [form, setForm] = useState<CampoLocal>(CAMPO_VAZIO);
  const [preview, setPreview] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [sujo, setSujo] = useState(false);

  function abrirNovo() {
    setForm(CAMPO_VAZIO);
    setEditandoIdx(null);
    setOpen(true);
  }
  function abrirEditar(idx: number) {
    setForm(campos[idx]);
    setEditandoIdx(idx);
    setOpen(true);
  }
  function salvarCampo() {
    if (!form.label.trim()) return;
    const precisaOpcoes = form.field_type === "single_choice" || form.field_type === "multiple_choice";
    if (precisaOpcoes && form.options.split(",").map((o) => o.trim()).filter(Boolean).length < 2) {
      toast({ title: "Informe pelo menos 2 opções, separadas por vírgula", variant: "destructive" });
      return;
    }
    setCampos((prev) => {
      const novo = { ...form, key: form.key || crypto.randomUUID() };
      if (editandoIdx === null) return [...prev, novo];
      return prev.map((c, i) => (i === editandoIdx ? novo : c));
    });
    setSujo(true);
    setOpen(false);
  }
  function remover(idx: number) {
    setCampos((prev) => prev.filter((_, i) => i !== idx));
    setSujo(true);
  }
  function mover(idx: number, direcao: -1 | 1) {
    setCampos((prev) => {
      const alvo = idx + direcao;
      if (alvo < 0 || alvo >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[alvo]] = [copia[alvo], copia[idx]];
      return copia;
    });
    setSujo(true);
  }

  async function publicar() {
    if (campos.length === 0) {
      toast({ title: "Adicione pelo menos uma pergunta antes de publicar", variant: "destructive" });
      return;
    }
    setPublicando(true);
    const payload = campos.map((c, i) => ({
      label: c.label.trim(),
      field_type: c.field_type,
      options: c.field_type === "single_choice" || c.field_type === "multiple_choice"
        ? c.options.split(",").map((o) => o.trim()).filter(Boolean)
        : null,
      required: c.required,
      sort_order: i,
    }));
    const { data, error } = await supabase.rpc("admin_save_anamnesis_template", {
      p_segment_id: segment.id,
      p_title: titulo,
      p_fields: payload as never,
    });
    setPublicando(false);
    if (error || !data) {
      toast({ title: "Erro ao publicar", description: error?.message, variant: "destructive" });
      return;
    }
    setSujo(false);
    toast({ title: `Ficha publicada — versão ${data.version}`, description: "Empresas que já tinham essa ficha não são alteradas retroativamente; só quem sincronizar a partir de agora recebe esta versão." });
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/configuracoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Configurações
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Ficha de anamnese — {segment.name}</h1>
          <p className="text-sm text-muted-foreground">
            {currentTemplate ? `Versão atual: v${currentTemplate.version}` : "Nenhuma versão publicada ainda — empresas com este segmento recebem uma ficha em branco."}
            {versions.length > 1 && ` · ${versions.length} versões no histórico`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreview((v) => !v)} className="gap-2"><Eye className="w-4 h-4" /> {preview ? "Ocultar prévia" : "Prévia"}</Button>
          <Button onClick={publicar} disabled={publicando || !sujo} className="gap-2">
            {publicando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Publicar {currentTemplate ? `v${currentTemplate.version + 1}` : "v1"}
          </Button>
        </div>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        Publicar cria uma <strong className="text-foreground">nova versão</strong> — nunca altera fichas que empresas já copiaram e já usaram pra atender clientes. Só empresas que ainda não têm ficha deste segmento (ou um profissional novo que ganhar este segmento) recebem a versão publicada aqui.
      </div>

      <div className="space-y-1.5 mb-4">
        <Label>Título da ficha</Label>
        <Input value={titulo} onChange={(e) => { setTitulo(e.target.value); setSujo(true); }} />
      </div>

      {preview ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Prévia — como o cliente/profissional vai ver</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {campos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pergunta ainda.</p>}
            {campos.map((c) => (
              <div key={c.key}>
                <p className="text-sm font-medium">{c.label || <span className="text-muted-foreground italic">(sem texto)</span>}{c.required && <span className="text-destructive"> *</span>}</p>
                {(c.field_type === "single_choice" || c.field_type === "multiple_choice") ? (
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {c.options.split(",").map((o) => o.trim()).filter(Boolean).map((o) => (
                      <span key={o} className="px-3 py-1.5 rounded-full text-sm border border-primary/40 text-primary">{o}</span>
                    ))}
                  </div>
                ) : c.field_type === "boolean" ? (
                  <div className="flex gap-2 mt-1.5">
                    <span className="px-4 py-2 rounded-full text-sm border border-primary/40 text-primary">Sim</span>
                    <span className="px-4 py-2 rounded-full text-sm border border-primary/40 text-primary">Não</span>
                  </div>
                ) : (
                  <div className="mt-1.5 h-9 rounded-lg border border-input bg-background" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-end mb-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" onClick={abrirNovo} className="gap-2"><Plus className="w-4 h-4" /> Nova pergunta</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editandoIdx === null ? "Nova pergunta" : "Editar pergunta"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Pergunta</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Já teve reação alérgica a produtos?" /></div>
                  <div>
                    <Label>Tipo de resposta</Label>
                    <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {(form.field_type === "single_choice" || form.field_type === "multiple_choice") && (
                    <div><Label>Opções (separadas por vírgula)</Label><Textarea rows={2} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Ex: Seco, Oleoso, Misto" /></div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label>Obrigatória</Label>
                    <Switch checked={form.required} onCheckedChange={(v) => setForm({ ...form, required: v })} />
                  </div>
                </div>
                <DialogFooter><Button onClick={salvarCampo} disabled={!form.label.trim()}>{editandoIdx === null ? "Adicionar" : "Salvar"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {campos.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Nenhuma pergunta cadastrada ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {campos.map((c, i) => (
                <Card key={c.key}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.label}{c.required && <span className="text-destructive"> *</span>}</p>
                      <p className="text-xs text-muted-foreground">{TIPO_LABEL[c.field_type]}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => mover(i, -1)} disabled={i === 0} title="Mover pra cima" aria-label="Mover pra cima" className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => mover(i, 1)} disabled={i === campos.length - 1} title="Mover pra baixo" aria-label="Mover pra baixo" className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => abrirEditar(i)} title="Editar" aria-label="Editar pergunta" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => remover(i)} title="Remover" aria-label="Remover pergunta" className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {versions.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Histórico de versões</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span>Versão {v.version}{currentTemplate?.id === v.id && <span className="text-primary font-medium"> · atual</span>}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
