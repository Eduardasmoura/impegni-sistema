"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mesmo padrão/visual de `apps/web-superadmin/src/components/pagination-bar.tsx`
// (não há pacote compartilhado entre os apps — cada um tem sua cópia, ver
// CLAUDE.md) — replicado aqui pra Clientes, com o texto "X–Y de Z" a mais
// que a versão do Super Admin não precisava mostrar.
export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = "cliente",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Substantivo no singular pro contador "X–Y de Z ___(s)" — default
      mantém o comportamento original (Clientes). Financeiro usa
      "lançamento". */
  itemLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const inicio = (page - 1) * pageSize + 1;
  const fim = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pt-4">
      <p className="text-sm text-muted-foreground">
        {inicio}–{fim} de {total} {itemLabel}{total === 1 ? "" : "s"}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground px-1">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="gap-1">
            Próxima <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
