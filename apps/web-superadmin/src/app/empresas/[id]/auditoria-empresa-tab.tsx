"use client";

// Auditoria filtrada por empresa — mesma tabela `audit_logs` da tela
// /auditoria (não duplica nada), só já vem com o filtro de empresa fixo e
// sem os controles de busca/ação (o Super Admin já está no contexto certo).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";

const ACTION_LABEL: Record<string, string> = {
  "company.create": "Empresa criada",
  "company.update": "Empresa atualizada",
  "subscription.change_plan": "Plano alterado",
  "subscription.asaas_webhook": "Assinatura atualizada (Asaas)",
  "impersonate.start": "Acesso como empresa iniciado",
  "impersonate.end": "Acesso como empresa encerrado",
  "user.enable_access": "Acesso de usuário liberado",
  "user.disable_access": "Acesso de usuário bloqueado",
  "user.reset_access": "Redefinição de acesso enviada",
};

export function AuditoriaEmpresaTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["admin-auditoria-empresa", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-muted-foreground mb-4">Eventos de auditoria registrados para <strong className="text-foreground">{companyName}</strong> — somente leitura, ninguém consegue apagar daqui.</p>

      {error && <Card className="mb-4 border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Erro ao carregar auditoria: {(error as Error).message}</CardContent></Card>}

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : (logs ?? []).length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground"><ScrollText className="w-10 h-10 mx-auto mb-3 opacity-40" />Nenhum evento registrado para esta empresa.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(logs ?? []).map((log) => {
            const isOpen = expanded === log.id;
            return (
              <Card key={log.id}>
                <CardContent className="p-0">
                  <button className="w-full p-3 flex flex-wrap items-center gap-3 text-left" onClick={() => setExpanded(isOpen ? null : log.id)}>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-muted text-foreground shrink-0">{ACTION_LABEL[log.action] ?? log.action}</span>
                    {log.target_table && <span className="text-xs text-muted-foreground font-mono hidden sm:inline">{log.target_table}</span>}
                    <span className="text-xs text-muted-foreground shrink-0 ml-auto">{formatDateTime(log.created_at)}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border p-3 bg-muted/30">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(log.payload, null, 2)}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
