"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Paginação por querystring (`?pagina=N`), reaproveitada em toda tela que
// lista dados do banco em página (Empresas, Assinaturas, Pagamentos,
// Usuários, Auditoria) — o componente só sabe desenhar botões e chamar
// `onPageChange`; quem decide como isso vira URL é a tela.
export function PaginationBar({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft className="w-4 h-4" /> Anterior
      </Button>
      <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Próxima <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
