"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ScrollText, Search, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationBar } from "@/components/pagination-bar";
import { formatDateTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const ALL = "__all__";

// Nomes de ação são livres (texto), mas seguem convenção "entidade.verbo" em
// todo o código (company.create, subscription.change_plan, impersonate.start
// etc.) — aqui só traduz pra um rótulo mais legível quando reconhece.
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

export type AuditLogRow = Tables<"audit_logs"> & { companies: Pick<Tables<"companies">, "id" | "name"> | null; actor_name: string | null };

export function AuditoriaView({
  logs,
  total,
  page,
  pageSize,
  actions,
  filters,
  loadError,
}: {
  logs: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  actions: string[];
  filters: { q: string; acao: string; empresa: string };
  loadError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [empresa, setEmpresa] = useState(filters.empresa);
  const [expanded, setExpanded] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: Partial<{ q: string; acao: string; empresa: string; pagina: string }>) {
    const params = new URLSearchParams({
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.acao ? { acao: filters.acao } : {}),
      ...(filters.empresa ? { empresa: filters.empresa } : {}),
    });
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (empresa === filters.empresa) return;
    debounceRef.current = setTimeout(() => pushParams({ empresa, pagina: "" }), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">{total} evento(s) registrados — somente leitura, ninguém consegue apagar daqui.</p>
      </div>

      {loadError && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">Erro ao carregar auditoria: {loadError}</CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por empresa..." value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="pl-9" />
          </div>
          <Select value={filters.acao || ALL} onValueChange={(v) => pushParams({ acao: v === ALL ? "" : v, pagina: "" })}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as ações</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>{ACTION_LABEL[a] ?? a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {logs.map((log) => {
          const isOpen = expanded === log.id;
          return (
            <Card key={log.id}>
              <CardContent className="p-0">
                <button className="w-full p-3 flex flex-wrap items-center gap-3 text-left" onClick={() => setExpanded(isOpen ? null : log.id)}>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-muted text-foreground shrink-0">{ACTION_LABEL[log.action] ?? log.action}</span>
                  <span className="text-sm flex-1 min-w-[160px]">
                    {log.actor_name || "Sistema"} {log.companies?.name && <>· <span className="text-muted-foreground">{log.companies.name}</span></>}
                  </span>
                  {log.target_table && <span className="text-xs text-muted-foreground font-mono hidden sm:inline">{log.target_table}</span>}
                  <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(log.created_at)}</span>
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

        {logs.length === 0 && !loadError && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhum evento encontrado.
            </CardContent>
          </Card>
        )}
      </div>

      <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={(p) => pushParams({ pagina: String(p) })} />
    </main>
  );
}
