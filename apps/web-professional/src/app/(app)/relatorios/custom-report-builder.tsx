"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Table2, BarChart3, LineChart as LineChartIcon, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { CUSTOM_SOURCES, type CustomSourceKey, type CustomReportConfig } from "./custom-report-engine";

const VISUALIZACOES: { key: CustomReportConfig["visualization"]; label: string; icon: typeof Table2 }[] = [
  { key: "table", label: "Tabela", icon: Table2 },
  { key: "bar", label: "Gráfico de barras", icon: BarChart3 },
  { key: "line", label: "Gráfico de linhas", icon: LineChartIcon },
  { key: "kpi", label: "Indicadores", icon: Gauge },
];

/**
 * Construtor de relatório personalizado — 5 passos simples (fonte →
 * colunas → filtros aplicáveis → agrupar por → visualização) + nome +
 * salvar. Sem nada parecido com BI: cada passo é um clique, não uma
 * expressão. Salva em `custom_reports` (RLS: só a própria empresa).
 */
export function CustomReportBuilder({
  companyId,
  editReport,
  onDone,
  onCancel,
}: {
  companyId: string;
  editReport: Tables<"custom_reports"> | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const { toast } = useToast();
  const [salvando, setSalvando] = useState(false);

  const [source, setSource] = useState<CustomSourceKey | null>((editReport?.source as CustomSourceKey) ?? null);
  const editConfig = editReport?.config as unknown as CustomReportConfig | undefined;
  const [colunas, setColunas] = useState<string[]>(editConfig?.columns ?? []);
  const [groupBy, setGroupBy] = useState<string | null>(editConfig?.groupBy ?? null);
  const [visualizacao, setVisualizacao] = useState<CustomReportConfig["visualization"]>(editConfig?.visualization ?? "table");
  const [nome, setNome] = useState(editReport?.name ?? "");

  const def = CUSTOM_SOURCES.find((s) => s.key === source) ?? null;

  useEffect(() => {
    if (def && colunas.length === 0) setColunas(def.columns.map((c) => c.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  async function salvar() {
    if (!source || !nome.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!editReport && !userData.user?.id) return;
    setSalvando(true);
    const config: CustomReportConfig = { columns: colunas, groupBy, visualization: groupBy ? visualizacao : (visualizacao === "kpi" ? "kpi" : "table") };
    const payload = { company_id: companyId, name: nome.trim(), source, config };
    const { error } = editReport
      ? await supabase.from("custom_reports").update(payload).eq("id", editReport.id)
      : await supabase.from("custom_reports").insert({ ...payload, created_by: userData.user!.id });
    setSalvando(false);
    if (error) { toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: editReport ? "Relatório atualizado" : "Relatório salvo" });
    onDone();
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5" /> Cancelar
      </button>
      <div>
        <h2 className="font-heading text-xl font-bold">{editReport ? "Editar relatório personalizado" : "Criar relatório personalizado"}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Monte um relatório com base nos dados do seu negócio.</p>
      </div>

      <StepCard numero={1} titulo="Escolha a fonte">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CUSTOM_SOURCES.map((s) => (
            <button key={s.key} onClick={() => { setSource(s.key); setColunas([]); setGroupBy(null); }}>
              <Card className={cn("h-full transition-colors", source === s.key ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:border-primary/40")}>
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.description}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </StepCard>

      {def && (
        <>
          <StepCard numero={2} titulo="Escolha as informações">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {def.columns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={colunas.includes(c.key)} onCheckedChange={(v) => setColunas((prev) => (v ? [...prev, c.key] : prev.filter((k) => k !== c.key)))} />
                  {c.label}
                </label>
              ))}
            </div>
          </StepCard>

          <StepCard numero={3} titulo="Filtros disponíveis nesse relatório">
            <p className="text-xs text-muted-foreground">
              {!def.usesPeriodo
                ? "Este relatório mostra o estado atual — o filtro de período não se aplica."
                : `Período${def.extraFilters.length ? ", " + def.extraFilters.map((f) => FILTER_LABEL[f]).join(", ") : ""} — aplicados na tela do relatório, igual aos demais.`}
            </p>
          </StepCard>

          {def.groupByOptions.length > 0 && (
            <StepCard numero={4} titulo="Agrupar por (opcional)">
              <div className="flex flex-wrap gap-2">
                <Chip selected={groupBy === null} onClick={() => setGroupBy(null)}>Nenhum (uma linha por registro)</Chip>
                {def.groupByOptions.map((g) => <Chip key={g.key} selected={groupBy === g.key} onClick={() => setGroupBy(g.key)}>{g.label}</Chip>)}
              </div>
            </StepCard>
          )}

          <StepCard numero={5} titulo="Visualização">
            <div className="flex flex-wrap gap-2">
              {VISUALIZACOES.filter((v) => (groupBy ? true : v.key === "table" || v.key === "kpi")).map((v) => (
                <button key={v.key} onClick={() => setVisualizacao(v.key)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors", visualizacao === v.key ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted")}>
                  <v.icon className="w-3.5 h-3.5" /> {v.label}
                </button>
              ))}
            </div>
          </StepCard>

          <StepCard numero={6} titulo="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder='Ex.: "Faturamento dos meus profissionais"' />
          </StepCard>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={salvar} disabled={!nome.trim() || colunas.length === 0 || salvando} className="gap-1.5">
              <Check className="w-4 h-4" /> Salvar relatório
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

const FILTER_LABEL: Record<string, string> = { professional: "Profissional", service: "Serviço", paymentMethod: "Forma de pagamento", status: "Status" };

function StepCard({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Label className="text-xs text-muted-foreground">Passo {numero}</Label>
        <h3 className="text-sm font-semibold mb-3">{titulo}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("px-3 py-1.5 rounded-full border text-sm transition-colors", selected ? "border-primary ring-1 ring-primary bg-primary/5 font-medium" : "hover:bg-muted")}>
      {children}
    </button>
  );
}
