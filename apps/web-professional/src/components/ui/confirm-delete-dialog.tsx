"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Confirmação antes de excluir — antes cada exclusão (produto, profissional,
// cliente, serviço, despesa) disparava no primeiro clique do ícone, sem
// nenhuma chance de desfazer. Mesmo padrão visual já usado em
// meus-agendamentos-view.tsx (web-client), só que reutilizável.
export function ConfirmDeleteDialog({
  open,
  title,
  description,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
