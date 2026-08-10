"use client";

import { useState } from "react";
import { Building2, Scissors, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const STATUS_LABEL: Record<string, string> = { trial: "Teste", active: "Ativa", suspended: "Suspensa" };
const STATUS_COLOR: Record<string, string> = {
  trial: "bg-chart-4/15 text-chart-4",
  active: "bg-chart-2/15 text-chart-2",
  suspended: "bg-destructive/15 text-destructive",
};
const STATUS_OPTIONS = ["trial", "active", "suspended"] as const;

export function EmpresasView({ companies, loadError }: { companies: Tables<"companies">[]; loadError?: string }) {
  const { toast } = useToast();
  const supabase = createClient();
  const [rows, setRows] = useState(companies);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateCompany(id: string, patch: { new_status?: string; new_anamnesis_enabled?: boolean }) {
    setSavingId(id);
    const { data, error } = await supabase.rpc("admin_update_company", { company_id: id, ...patch });
    setSavingId(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    toast({ title: "Empresa atualizada" });
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold">Empresas</h1>
        <p className="text-sm text-muted-foreground">{rows.length} empresa(s) cadastradas na plataforma</p>
      </div>

      {loadError && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">Erro ao carregar empresas: {loadError}</CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {c.business_type === "estudio_estetica" ? <Sparkles className="w-4 h-4 text-muted-foreground" /> : <Scissors className="w-4 h-4 text-muted-foreground" />}
              </div>

              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{c.name}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status] ?? ""}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  /{c.slug} · {c.business_type === "estudio_estetica" ? "Studio/Estética" : "Barbearia"} · desde {formatDate(c.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={c.status}
                  disabled={savingId === c.id}
                  onChange={(e) => updateCompany(c.id, { new_status: e.target.value })}
                  className="text-sm rounded-lg border border-input bg-card px-2 py-1.5"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs text-muted-foreground">Ficha de Anamnese</label>
                <Switch
                  checked={c.anamnesis_enabled}
                  disabled={savingId === c.id}
                  onCheckedChange={(checked) => updateCompany(c.id, { new_anamnesis_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {rows.length === 0 && !loadError && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhuma empresa cadastrada ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
