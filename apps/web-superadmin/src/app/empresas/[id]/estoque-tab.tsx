"use client";

// Estoque da empresa — somente leitura. Mesma regra de "estoque baixo" já
// usada em apps/web-professional/.../estoque/estoque-view.tsx
// (`stock_qty <= (min_stock_qty || 5)`), replicada aqui pra não inventar um
// critério novo. RLS de `products` já permite is_super_admin() (auditoria).
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";

export function EstoqueTab({ companyId }: { companyId: string }) {
  const supabase = createClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-estoque", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, category, price, cost_price, stock_qty, min_stock_qty, unit").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data;
    },
  });

  const resumo = useMemo(() => {
    const produtos = data ?? [];
    const baixo = produtos.filter((p) => p.stock_qty <= (p.min_stock_qty || 5));
    const valorTotal = produtos.reduce((s, p) => s + Number(p.cost_price || 0) * (p.stock_qty || 0), 0);
    return { total: produtos.length, baixo, valorTotal };
  }, [data]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-muted-foreground mb-4">Produtos cadastrados pela empresa — somente leitura.</p>

      {error && <Card className="mb-4 border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Erro ao carregar estoque: {(error as Error).message}</CardContent></Card>}

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Produtos cadastrados</p><p className="text-2xl font-bold font-heading mt-1">{resumo.total}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Estoque baixo</p><p className={`text-2xl font-bold font-heading mt-1 ${resumo.baixo.length > 0 ? "text-destructive" : ""}`}>{resumo.baixo.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Valor total em estoque (custo)</p><p className="text-xl font-bold font-heading mt-1">{formatCurrency(resumo.valorTotal)}</p></CardContent></Card>
          </div>

          {resumo.baixo.length > 0 && (
            <Card className="mb-4 border-destructive/30">
              <CardContent className="p-4">
                <p className="text-sm font-medium flex items-center gap-2 mb-2 text-destructive"><AlertTriangle className="w-4 h-4" /> Produtos com estoque baixo</p>
                <div className="space-y-1">
                  {resumo.baixo.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span>{p.name}</span>
                      <span className="text-destructive font-medium">{p.stock_qty} {p.unit} (mín. {p.min_stock_qty})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {(data ?? []).length === 0 ? (
                <div className="py-16 text-center text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-3 opacity-40" />Nenhum produto cadastrado.</div>
              ) : (
                <div className="divide-y divide-border">
                  {(data ?? []).map((p) => {
                    const baixo = p.stock_qty <= (p.min_stock_qty || 5);
                    return (
                      <div key={p.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                        <span className="flex-1 min-w-[160px]">{p.name}</span>
                        <span className="text-muted-foreground min-w-[100px]">{p.category ?? "—"}</span>
                        <span className={`font-medium min-w-[80px] ${baixo ? "text-destructive" : ""}`}>{p.stock_qty} {p.unit}</span>
                        <span className="text-muted-foreground min-w-[100px]">{formatCurrency(p.price)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
