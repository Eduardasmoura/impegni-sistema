"use client";

import { useState } from "react";
import { FileBarChart, Pencil, Copy, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { CUSTOM_SOURCES } from "./custom-report-engine";
import type { Tables } from "@/lib/supabase/database.types";
import { formatDateTime } from "@/lib/format";

/**
 * "Meus relatórios" — relatórios personalizados salvos pela empresa
 * (RLS: qualquer membro vê; só quem criou ou um gestor edita/exclui —
 * ver migration 20260916100000). Nada aqui é fictício: só aparece o que
 * existe de verdade em `custom_reports`.
 */
export function MeusRelatoriosSection({
  customReports,
  onAbrir,
  onEditar,
  onDuplicar,
  onExcluir,
}: {
  customReports: Tables<"custom_reports">[];
  onAbrir: (id: string) => void;
  onEditar: (id: string) => void;
  onDuplicar: (r: Tables<"custom_reports">) => void;
  onExcluir: (id: string) => void;
}) {
  const [excluindo, setExcluindo] = useState<Tables<"custom_reports"> | null>(null);

  if (customReports.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <FileBarChart className="w-3.5 h-3.5" /> Meus relatórios
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {customReports.map((r) => (
          <Card key={r.id} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-3">
              <button onClick={() => onAbrir(r.id)} className="text-left w-full">
                <p className="text-sm font-medium truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {CUSTOM_SOURCES.find((s) => s.key === r.source)?.label ?? r.source} · Atualizado {formatDateTime(r.updated_at)}
                </p>
              </button>
              <div className="flex items-center gap-1 mt-2">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => onEditar(r.id)}><Pencil className="w-3 h-3" /> Editar</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => onDuplicar(r)}><Copy className="w-3 h-3" /> Duplicar</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setExcluindo(r)}>
                  <Trash2 className="w-3 h-3" /> Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ConfirmDeleteDialog
        open={!!excluindo}
        title="Excluir relatório personalizado"
        description={`Tem certeza que deseja excluir "${excluindo?.name}"? Essa ação não pode ser desfeita.`}
        onConfirm={() => { if (excluindo) onExcluir(excluindo.id); setExcluindo(null); }}
        onCancel={() => setExcluindo(null)}
      />
    </section>
  );
}
