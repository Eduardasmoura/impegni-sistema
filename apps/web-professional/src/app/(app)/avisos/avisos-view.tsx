"use client";

import { useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificacaoDialog, quandoNotificacao, useMarcarNotificacao, useNotificacoes, type Notificacao } from "@/components/notifications-bell";

// Todas as notificações do usuário (avisos enviados pelo Super Admin às
// empresas dele). Mesmas funções seguras do sino — nada de outra empresa.
export function AvisosView() {
  const { data: lista = [], isLoading, error } = useNotificacoes(200);
  const { marcarLida, marcarTodas } = useMarcarNotificacao();
  const [aberta, setAberta] = useState<Notificacao | null>(null);
  const naoLidas = lista.filter((n) => !n.is_read).length;

  function abrir(n: Notificacao) {
    setAberta(n);
    if (!n.is_read) marcarLida(n.id);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold">Notificações</h1>
          <p className="text-sm text-muted-foreground mt-1">Avisos e novidades da equipe Impegni.</p>
        </div>
        {naoLidas > 0 && (
          <Button variant="outline" size="sm" onClick={() => marcarTodas()} className="gap-1.5">
            <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Não foi possível carregar as notificações. Tente novamente em instantes.</CardContent></Card>
      ) : lista.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Você está em dia! Não há novas notificações.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {lista.map((n) => (
              <li key={n.id}>
                <button onClick={() => abrir(n)} className="w-full text-left p-4 sm:px-5 hover:bg-muted/50 flex gap-3">
                  <span className={cn("mt-1.5 w-2.5 h-2.5 rounded-full shrink-0", n.is_read ? "bg-muted-foreground/20" : "bg-primary")} aria-label={n.is_read ? "Lida" : "Não lida"} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={cn("text-sm sm:text-[15px] truncate", n.is_read ? "text-foreground/80" : "font-semibold")}>{n.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{quandoNotificacao(n.sent_at)}</span>
                    </span>
                    <span className="block text-sm text-muted-foreground line-clamp-2 mt-1">{n.message}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <NotificacaoDialog notificacao={aberta} onClose={() => setAberta(null)} />
    </div>
  );
}
