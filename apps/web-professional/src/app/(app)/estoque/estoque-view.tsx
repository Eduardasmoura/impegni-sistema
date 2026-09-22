"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const CATEGORIAS = ["cabelo", "barba", "estetica", "unhas", "maquiagem", "acessorio", "outros"];

const FORM_VAZIO = { name: "", description: "", category: "cabelo", price: "", cost_price: "", stock_qty: "", min_stock_qty: "5", unit: "un" };

export function EstoqueView({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Tables<"products"> | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<Tables<"products"> | null>(null);
  const [salvandoExclusao, setSalvandoExclusao] = useState(false);

  const { data: produtos = [], isLoading, isError } = useQuery({
    queryKey: ["products", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"products">[];
    },
  });

  const produtosComEstoqueBaixo = produtos.filter((p) => p.stock_qty <= (p.min_stock_qty || 5));
  const valorTotalEmEstoque = produtos.reduce((s, p) => s + Number(p.cost_price || 0) * (p.stock_qty || 0), 0);

  async function salvar() {
    setSalvando(true);
    const payload = {
      company_id: companyId,
      name: form.name,
      description: form.description || null,
      category: form.category,
      price: Number(form.price) || 0,
      cost_price: Number(form.cost_price) || 0,
      stock_qty: Number(form.stock_qty) || 0,
      min_stock_qty: Number(form.min_stock_qty) || 5,
      unit: form.unit,
    };
    const { error } = editando
      ? await supabase.from("products").update(payload).eq("id", editando.id)
      : await supabase.from("products").insert(payload);
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "salvar o produto"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["products", companyId] });
    toast({ title: editando ? "Produto atualizado" : "Produto cadastrado" });
    setOpen(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  async function excluir() {
    if (!excluindo) return;
    setSalvandoExclusao(true);
    const { error } = await supabase.from("products").delete().eq("id", excluindo.id);
    setSalvandoExclusao(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: friendlyError(error, "excluir o produto"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["products", companyId] });
    toast({ title: "Produto removido" });
    setExcluindo(null);
  }

  function editar(produto: Tables<"products">) {
    setEditando(produto);
    setForm({
      name: produto.name,
      description: produto.description || "",
      category: produto.category || "cabelo",
      price: String(produto.price),
      cost_price: String(produto.cost_price || ""),
      stock_qty: String(produto.stock_qty),
      min_stock_qty: String(produto.min_stock_qty || 5),
      unit: produto.unit || "un",
    });
    setOpen(true);
  }

  const formulario = (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditando(null); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Novo produto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{editando ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço venda</Label>
              <CurrencyInput value={form.price} onValueChange={(v) => setForm({ ...form, price: v })} />
            </div>
            <div>
              <Label>Preço custo</Label>
              <CurrencyInput value={form.cost_price} onValueChange={(v) => setForm({ ...form, cost_price: v })} />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
            </div>
            <div>
              <Label>Estoque mínimo</Label>
              <Input type="number" value={form.min_stock_qty} onChange={(e) => setForm({ ...form, min_stock_qty: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={!form.name || salvando}>{salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Estoque</h1>
          <p className="text-sm text-muted-foreground">Valor em estoque: {formatCurrency(valorTotalEmEstoque)}</p>
        </div>
        {formulario}
      </div>

      {isLoading ? (
        <LoadingState text="Carregando estoque..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar o estoque." />
      ) : (
        <>
          {produtosComEstoqueBaixo.length > 0 && (
            <Card className="mb-4 border-amber-300 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-sm text-amber-800">{produtosComEstoqueBaixo.length} produto(s) com estoque baixo.</p>
              </CardContent>
            </Card>
          )}

          {produtos.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="mb-4">Você ainda não tem produtos no estoque.</p>
                <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Adicionar primeiro produto</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {produtos.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.category}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => editar(p)} title="Editar" aria-label="Editar produto" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => setExcluindo(p)} title="Excluir" aria-label="Excluir produto" className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Estoque</p>
                        <p className={cn("font-semibold", p.stock_qty <= (p.min_stock_qty || 5) ? "text-amber-600" : "")}>{p.stock_qty} {p.unit}</p>
                      </div>
                      <p className="font-heading font-bold text-primary">{formatCurrency(Number(p.price))}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDeleteDialog
        open={!!excluindo}
        title="Excluir produto?"
        description={excluindo ? `"${excluindo.name}" será removido do estoque. Essa ação não pode ser desfeita.` : ""}
        loading={salvandoExclusao}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
