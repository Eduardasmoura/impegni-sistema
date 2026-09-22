"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export function NotificacoesView({
  companyId,
  whatsappReminderEnabled,
  isManager,
}: {
  companyId: string;
  whatsappReminderEnabled: boolean;
  isManager: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [enabled, setEnabled] = useState(whatsappReminderEnabled);
  const [saving, setSaving] = useState(false);

  async function alternar(value: boolean) {
    setSaving(true);
    setEnabled(value);
    // Mesmo campo já editável em "Meu negócio" (`companies.whatsapp_reminder_enabled`)
    // — aqui é só um atalho dedicado a notificações, não um campo novo.
    const { error } = await supabase.from("companies").update({ whatsapp_reminder_enabled: value }).eq("id", companyId);
    setSaving(false);
    if (error) {
      setEnabled(!value);
      toast({ title: "Erro ao salvar", description: friendlyError(error, "salvar a preferência de notificação"), variant: "destructive" });
      return;
    }
    toast({ title: value ? "Lembretes por WhatsApp ativados" : "Lembretes por WhatsApp desativados" });
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="font-heading text-3xl font-semibold mb-1">Notificações</h1>
      <p className="text-sm text-muted-foreground mb-6">Como seus clientes são avisados sobre os agendamentos.</p>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Lembrete automático por WhatsApp</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground max-w-sm">Envia um lembrete automático para o cliente antes do horário agendado.</p>
            <Switch checked={enabled} disabled={saving || !isManager} onCheckedChange={alternar} />
          </div>
          {!isManager && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" /> Só o proprietário ou administrador da empresa pode alterar esta configuração.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Lembretes, confirmações e avisos de cancelamento configuráveis separadamente são uma melhoria futura — hoje existe apenas este lembrete geral.
      </p>
    </div>
  );
}
