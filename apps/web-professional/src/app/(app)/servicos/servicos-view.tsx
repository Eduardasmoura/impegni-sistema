"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Scissors, Pencil, Trash2, Clock, ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { uploadCompanyAsset } from "@/lib/upload";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

const CATEGORIAS = ["cabelo", "barba", "combo", "estetica", "unhas", "maquiagem", "outros"];
const TIPOS = [
  { value: "avulso", label: "Serviço avulso" },
  { value: "pacote", label: "Pacote" },
];
const FORM_VAZIO = { name: "", description: "", category: "cabelo", type: "avulso", duration_min: "30", price: "", photo_url: "", active: true, anamnesis_form_id: "" };

export function ServicosView({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Deep link do onboarding guiado (Fase 6) — chegar em /servicos?onboarding=1
  // já abre o diálogo de cadastro, poupando 1 clique de quem veio do passo
  // "Cadastre seu primeiro serviço" do checklist.
  useEffect(() => {
    if (searchParams.get("onboarding") === "1") setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [editando, setEditando] = useState<Tables<"services"> | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [excluindo, setExcluindo] = useState<Tables<"services"> | null>(null);
  const [salvandoExclusao, setSalvandoExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const { data: servicos = [], isLoading, isError } = useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"services">[];
    },
  });

  // Fichas de anamnese da própria empresa (RLS + FK composta no banco garantem
  // que nunca aparece/é aceita ficha de outra empresa). Só mostra o campo se a
  // empresa tem alguma ficha visível (recurso ligado no plano).
  const { data: fichas = [] } = useQuery({
    queryKey: ["anamnesis-forms", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis_forms")
        .select("id, title, active, segments(name)")
        .eq("company_id", companyId)
        .order("created_at");
      if (error) throw error;
      return data as unknown as { id: string; title: string; active: boolean; segments: { name: string } | null }[];
    },
  });
  const fichasSelecionaveis = fichas.filter((f) => f.active || f.id === form.anamnesis_form_id);

  async function uploadFoto(file: File) {
    if (enviandoFoto) return;
    setEnviandoFoto(true);
    try {
      const url = await uploadCompanyAsset(supabase, companyId, "services", file);
      setForm((f) => ({ ...f, photo_url: url }));
    } catch (e) {
      toast({ title: "Erro no upload", description: friendlyError(e, "enviar a imagem"), variant: "destructive" });
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    const payload = {
      company_id: companyId,
      name: form.name,
      description: form.description || null,
      category: form.category,
      type: form.type,
      duration_min: Number(form.duration_min) || 30,
      price: Number(form.price) || 0,
      photo_url: form.photo_url || null,
      active: form.active,
      // só toca no vínculo quando o campo está visível — evita apagar um vínculo
      // existente se a lista de fichas não pôde ser carregada
      ...(fichas.length > 0 ? { anamnesis_form_id: form.anamnesis_form_id || null } : {}),
    };
    const { error } = editando
      ? await supabase.from("services").update(payload).eq("id", editando.id)
      : await supabase.from("services").insert(payload);
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "salvar o serviço"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["services", companyId] });
    toast({ title: editando ? "Serviço atualizado" : "Serviço cadastrado" });
    setOpen(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  async function excluir() {
    if (!excluindo) return;
    setSalvandoExclusao(true);
    const { error } = await supabase.from("services").delete().eq("id", excluindo.id);
    setSalvandoExclusao(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: friendlyError(error, "excluir o serviço"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["services", companyId] });
    toast({ title: "Serviço removido" });
    setExcluindo(null);
  }

  function editar(servico: Tables<"services">) {
    setEditando(servico);
    setForm({
      name: servico.name,
      description: servico.description || "",
      category: servico.category || "cabelo",
      type: servico.type || "avulso",
      duration_min: String(servico.duration_min),
      price: String(servico.price),
      photo_url: servico.photo_url || "",
      active: servico.active,
      anamnesis_form_id: servico.anamnesis_form_id || "",
    });
    setOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Serviços</h1>
          <p className="text-sm text-muted-foreground">Catálogo de serviços oferecidos pela sua empresa</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo serviço</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editando ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer shrink-0">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {form.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFoto(e.target.files[0])} />
                </label>
                <p className="text-xs text-muted-foreground">{enviandoFoto ? "Enviando..." : "Clique na foto pra trocar (opcional)"}</p>
              </div>
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="O que o cliente vai ver antes de agendar (opcional)" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duração (min)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></div>
                <div><Label>Preço</Label><CurrencyInput value={form.price} onValueChange={(v) => setForm({ ...form, price: v })} /></div>
              </div>
              {fichas.length > 0 && (
                <div>
                  <Label>Ficha de anamnese</Label>
                  <Select value={form.anamnesis_form_id || "__nenhuma__"} onValueChange={(v) => setForm({ ...form, anamnesis_form_id: v === "__nenhuma__" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__nenhuma__">Nenhuma</SelectItem>
                      {fichasSelecionaveis.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.segments?.name ?? f.title}{!f.active && " (inativa)"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Ao atender este serviço, essa ficha é escolhida automaticamente. Sem ficha, você escolhe na hora.</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Ativo (aparece pro cliente agendar)</Label>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={!form.name || salvando}>{salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <LoadingState text="Carregando serviços..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar seus serviços." />
      ) : (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {servicos.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {s.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Scissors className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {s.category} · {s.type === "pacote" ? "Pacote" : "Avulso"}
                      {!s.active && " · inativo"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => editar(s)} title="Editar" aria-label="Editar serviço" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setExcluindo(s)} title="Excluir" aria-label="Excluir serviço" className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
              {s.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.description}</p>}
              <div className="flex items-end justify-between mt-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration_min} min</p>
                <p className="font-heading font-bold text-primary">{formatCurrency(Number(s.price))}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {servicos.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Scissors className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="mb-4">Você ainda não possui serviços cadastrados.</p>
              <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Adicionar primeiro serviço</Button>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      <ConfirmDeleteDialog
        open={!!excluindo}
        title="Excluir serviço?"
        description={excluindo ? `"${excluindo.name}" deixa de aparecer no catálogo e pro cliente agendar. Essa ação não pode ser desfeita.` : ""}
        loading={salvandoExclusao}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
