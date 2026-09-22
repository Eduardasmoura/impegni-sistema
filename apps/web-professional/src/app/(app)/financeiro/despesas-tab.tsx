"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

export const CATEGORIAS_DESPESA = [
  { value: "aluguel", label: "Aluguel" },
  { value: "fornecedores", label: "Fornecedores" },
  { value: "salarios", label: "Salários" },
  { value: "marketing", label: "Marketing" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "impostos", label: "Impostos" },
  { value: "outros", label: "Outros" },
];

type Despesa = Tables<"expenses">;
const DESPESA_VAZIA = { description: "", amount: "", category: "outros", expense_date: new Date().toISOString().slice(0, 10), recurring: false, notes: "" };

/**
 * Aba Despesas — mesma tabela/CRUD que já existia na "Visão geral" antiga,
 * só relocada e com edição adicionada (só existia criar/excluir antes).
 *
 * IMPORTANTE (achado da análise prévia): `expenses` hoje NÃO tem coluna de
 * fornecedor, vencimento (separado da data), nem status pago/pendente — só
 * description/amount/category/expense_date/recurring/notes. O pedido de
 * reformulação queria essas informações; como o banco não suporta, os
 * filtros "vencidas/pagas/pendentes" e o campo "fornecedor" NÃO foram
 * implementados aqui pra não inventar dado que não existe. Só os filtros
 * de período (já existe, via prop) e categoria (abaixo) são reais.
 */
export function DespesasTab({
  companyId,
  expensesPeriodo,
  categoriaFiltro,
  onCategoriaFiltroChange,
}: {
  companyId: string;
  expensesPeriodo: Despesa[];
  categoriaFiltro: string;
  onCategoriaFiltroChange: (v: string) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Despesa | null>(null);
  const [form, setForm] = useState(DESPESA_VAZIA);
  const [excluindo, setExcluindo] = useState<Despesa | null>(null);
  const [salvandoExclusao, setSalvandoExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const listaFiltrada = categoriaFiltro === "all" ? expensesPeriodo : expensesPeriodo.filter((d) => d.category === categoriaFiltro);
  const totalFiltrado = listaFiltrada.reduce((s, d) => s + Number(d.amount || 0), 0);

  function abrirNova() {
    setEditando(null);
    setForm(DESPESA_VAZIA);
    setDialogOpen(true);
  }
  function abrirEdicao(d: Despesa) {
    setEditando(d);
    setForm({ description: d.description, amount: String(d.amount), category: d.category || "outros", expense_date: d.expense_date, recurring: d.recurring, notes: d.notes || "" });
    setDialogOpen(true);
  }

  async function salvar() {
    if (salvando) return;
    if (!form.description || !form.amount || !form.expense_date) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const payload = {
      company_id: companyId,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      expense_date: form.expense_date,
      recurring: form.recurring,
      notes: form.notes || null,
    };
    const { error } = editando
      ? await supabase.from("expenses").update(payload).eq("id", editando.id)
      : await supabase.from("expenses").insert(payload);
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "salvar a despesa"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["expenses", companyId] });
    setDialogOpen(false);
    toast({ title: editando ? "Despesa atualizada" : "Despesa registrada" });
  }

  async function excluir() {
    if (!excluindo) return;
    setSalvandoExclusao(true);
    const { error } = await supabase.from("expenses").delete().eq("id", excluindo.id);
    setSalvandoExclusao(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "excluir a despesa"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["expenses", companyId] });
    toast({ title: "Despesa excluída" });
    setExcluindo(null);
  }

  return (
    <div className="mt-3 space-y-4">
      <div className="flex flex-wrap items-center gap-2.5 justify-between">
        <Select value={categoriaFiltro} onValueChange={onCategoriaFiltroChange}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIAS_DESPESA.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={abrirNova}><Plus className="w-4 h-4" /> Nova despesa</Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4" /> Despesas no período</CardTitle>
          <span className="text-sm font-semibold text-destructive">{formatCurrency(totalFiltrado)}</span>
        </CardHeader>
        <CardContent>
          {listaFiltrada.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Nenhuma despesa no período. Clique em &quot;Nova despesa&quot; para começar.</p>
          ) : (
            <div className="space-y-2">
              {listaFiltrada.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORIAS_DESPESA.find((c) => c.value === d.category)?.label || d.category} · {formatDate(d.expense_date)}
                      {d.recurring && " · Recorrente"}
                    </p>
                    {d.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.notes}</p>}
                  </div>
                  <span className="text-sm font-semibold text-destructive shrink-0">{formatCurrency(Number(d.amount))}</span>
                  <button onClick={() => abrirEdicao(d)} title="Editar" aria-label={`Editar ${d.description}`} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setExcluindo(d)} title="Excluir" aria-label={`Excluir ${d.description}`} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editando ? "Editar despesa" : "Registrar despesa"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Descrição *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Conta de luz" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor *</Label><CurrencyInput value={form.amount} onValueChange={(v) => setForm({ ...form, amount: v })} /></div>
              <div><Label>Data *</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS_DESPESA.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} className="rounded" />
              Despesa recorrente
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar despesa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!excluindo}
        title="Excluir despesa?"
        description={excluindo ? `"${excluindo.description}" será removida do seu controle financeiro. Essa ação não pode ser desfeita.` : ""}
        loading={salvandoExclusao}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
