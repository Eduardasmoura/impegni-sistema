"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type Notificacao = { id: string; title: string; message: string; sent_at: string | null; is_read: boolean };

export const NOTIFICATIONS_KEY = ["platform-notifications"];
export const UNREAD_KEY = ["platform-notifications-unread"];

// "Hoje, 10:32" / "Ontem, 18:20" / "12/09, 09:15" — fuso fixo (mesmo padrão
// de lib/format.ts) pra servidor e navegador não divergirem.
export function quandoNotificacao(iso: string | null): string {
  if (!iso) return "";
  const tz = "America/Sao_Paulo";
  const d = new Date(iso);
  const dia = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: tz });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 86_400_000);
  if (dia(d) === dia(hoje)) return `Hoje, ${hora}`;
  if (dia(d) === dia(ontem)) return `Ontem, ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: tz })}, ${hora}`;
}

// Hooks compartilhados pelo sino e pela página /avisos. As funções do banco
// (get_my_notifications etc.) só devolvem avisos da(s) empresa(s) do próprio
// usuário — a tabela de avisos em si não é legível pelo painel.
export function useNotificacoes(limit = 50) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, limit],
    queryFn: async () => {
      const { data, error } = await createClient().rpc("get_my_notifications", { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as Notificacao[];
    },
    refetchInterval: 60_000,
  });
}

export function useMarcarNotificacao() {
  const qc = useQueryClient();
  const atualizar = () => {
    qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    qc.invalidateQueries({ queryKey: UNREAD_KEY });
  };
  return {
    marcarLida: async (id: string) => {
      await createClient().rpc("mark_notification_read", { p_announcement_id: id });
      atualizar();
    },
    marcarTodas: async () => {
      await createClient().rpc("mark_all_notifications_read");
      atualizar();
    },
  };
}

export function NotificacaoDialog({ notificacao, onClose }: { notificacao: Notificacao | null; onClose: () => void }) {
  return (
    <Dialog open={!!notificacao} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {notificacao && (
          <>
            <DialogHeader>
              <DialogTitle>{notificacao.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">{quandoNotificacao(notificacao.sent_at)} · Equipe Impegni</p>
            </DialogHeader>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{notificacao.message}</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function NotificationsBell({ className, align = "start" }: { className?: string; align?: "start" | "end" }) {
  const [aberta, setAberta] = useState<Notificacao | null>(null);
  const { data: lista = [] } = useNotificacoes(10);
  const { data: naoLidas = 0 } = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: async () => {
      const { data, error } = await createClient().rpc("get_my_unread_notifications_count");
      if (error) throw error;
      return data ?? 0;
    },
    refetchInterval: 60_000,
  });
  const { marcarLida, marcarTodas } = useMarcarNotificacao();

  function abrir(n: Notificacao) {
    setAberta(n);
    if (!n.is_read) marcarLida(n.id);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : "Notificações"}
            title="Notificações"
            className={cn("relative p-1.5 rounded-lg hover:bg-muted text-muted-foreground", className)}
          >
            <Bell className="w-5 h-5 lg:w-4 lg:h-4" />
            {naoLidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-4 text-center">
                {naoLidas > 9 ? "9+" : naoLidas}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} collisionPadding={8} className="w-[min(92vw,360px)] p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-heading font-semibold text-sm">Notificações</p>
            {naoLidas > 0 && (
              <button onClick={() => marcarTodas()} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todas como lidas
              </button>
            )}
          </div>
          {lista.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Bell className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Você está em dia! Não há novas notificações.</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {lista.map((n) => (
                <li key={n.id}>
                  <button onClick={() => abrir(n)} className="w-full text-left px-4 py-3 hover:bg-muted/60 flex gap-3">
                    <span className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", n.is_read ? "bg-transparent" : "bg-primary")} aria-label={n.is_read ? "Lida" : "Não lida"} />
                    <span className="min-w-0">
                      <span className={cn("block text-sm truncate", n.is_read ? "text-foreground/80" : "font-semibold")}>{n.title}</span>
                      <span className="block text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</span>
                      <span className="block text-[11px] text-muted-foreground mt-1">{quandoNotificacao(n.sent_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border">
            <Link href="/avisos" className="block text-center text-sm font-medium text-primary py-2.5 hover:bg-muted/60">
              Ver todas as notificações
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <NotificacaoDialog notificacao={aberta} onClose={() => setAberta(null)} />
    </>
  );
}
