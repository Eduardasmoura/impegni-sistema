"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Filter, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { DEFAULT_RELATORIOS_FILTERS, PERIODOS_RELATORIO, type RelatoriosFilters } from "./filters";
import { REPORT_CATEGORIES, reportKey, findReport, type CategoryDef, type ReportDef } from "./report-registry";
import { RelatoriosFilterBar } from "./filter-bar";
import { ReportShell } from "./report-shell";
import { useRelatoriosRawData } from "./report-data";
import { useReportContent } from "./report-content";
import { STATUS_LABEL, METODO_PAGAMENTO_LABEL } from "@/lib/labels";
import { useState } from "react";

/**
 * Central de Relatórios — voltou pra navegação por abas de categoria a
 * pedido explícito (revertendo a versão hub com busca/favoritos/recentes/
 * construtor personalizado da etapa anterior). Container único e margem
 * esquerda consistente pra título, abas, filtros e grade de cards.
 *
 * Uma correção sobre o que foi pedido: os relatórios de Clientes
 * (Aquisição/Recorrência/Inatividade/Aniversariantes) e os demais já são
 * reais — calculam dado de verdade (RPCs de segmentação, agendamentos,
 * pagamentos etc.) desde a etapa anterior. Não recolocamos o badge "Em
 * breve" neles: isso deixaria de ser um rótulo honesto (diria "ainda não
 * existe" sobre algo que já funciona). "Em breve" continua só onde é
 * verdade — hoje, apenas Fidelidade.
 */
export function RelatoriosView({ companyId, companyName }: { companyId: string; companyName: string; profileId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const catParam = searchParams.get("cat") ?? REPORT_CATEGORIES[0].key;
  const slugParam = searchParams.get("r");
  const [filters, setFilters] = useState<RelatoriosFilters>(DEFAULT_RELATORIOS_FILTERS);

  const activeCategory = REPORT_CATEGORIES.find((c) => c.key === catParam) ?? REPORT_CATEGORIES[0];
  const openReport = slugParam ? findReport(catParam, slugParam) : null;

  function irParaCategoria(catKey: string) {
    router.push(`/relatorios?cat=${catKey}`, { scroll: false });
  }
  function abrirRelatorio(catKey: string, slug: string) {
    router.push(`/relatorios?cat=${catKey}&r=${slug}`, { scroll: false });
  }
  function voltarParaCategoria() {
    router.push(`/relatorios?cat=${catParam}`, { scroll: false });
  }

  const { data: services = [] } = useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"services">[];
    },
  });
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });

  const raw = useRelatoriosRawData(companyId, filters);
  const { content, isLoading: contentLoading } = useReportContent(openReport?.categoria.key ?? "", openReport?.relatorio.slug ?? "", raw, filters, professionals, services);

  const filtrosResumo = useMemo(() => {
    const partes: string[] = [];
    if (filters.professionalIds.length) partes.push(`Profissional: ${professionals.find((p) => p.id === filters.professionalIds[0])?.name ?? ""}`);
    if (filters.serviceIds.length) partes.push(`Serviço: ${services.find((s) => s.id === filters.serviceIds[0])?.name ?? ""}`);
    if (filters.status.length) partes.push(`Status: ${STATUS_LABEL[filters.status[0]] ?? filters.status[0]}`);
    if (filters.paymentMethods.length) partes.push(`Forma: ${METODO_PAGAMENTO_LABEL[filters.paymentMethods[0]] ?? filters.paymentMethods[0]}`);
    return partes;
  }, [filters, professionals, services]);
  const periodoLabel = PERIODOS_RELATORIO.find((p) => p.key === filters.periodo)?.label ?? "";

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground">Relatórios</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Central de análise do seu negócio.</p>

      <CategoryTabs active={activeCategory.key} onChange={irParaCategoria} />

      <div className="mt-4">
        <RelatoriosFilterBar categoria={activeCategory} filtros={filters} onChange={setFilters} services={services} professionals={professionals} />
      </div>

      {openReport ? (
        <ReportShell
          reportKey={reportKey(openReport.categoria.key, openReport.relatorio.slug)}
          title={openReport.relatorio.title}
          description={openReport.relatorio.description}
          companyName={companyName}
          periodoLabel={periodoLabel}
          filtrosResumo={filtrosResumo}
          onVoltar={voltarParaCategoria}
          content={content}
          isLoading={raw.isLoading || contentLoading}
        />
      ) : activeCategory.key === "visao-geral" ? (
        <VisaoGeralPreview />
      ) : activeCategory.key === "fidelidade" ? (
        <EstadoFidelidade />
      ) : (
        <CategoriaGrid categoria={activeCategory} professionalCount={professionals.length} onAbrir={(slug) => abrirRelatorio(activeCategory.key, slug)} />
      )}
    </div>
  );
}

function CategoryTabs({ active, onChange }: { active: string; onChange: (key: string) => void }) {
  return (
    <div className="bg-muted rounded-xl p-1.5">
      <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {REPORT_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => onChange(c.key)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              active === c.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <c.icon className="w-3.5 h-3.5" /> {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoriaGrid({ categoria, professionalCount, onAbrir }: { categoria: CategoryDef; professionalCount: number; onAbrir: (slug: string) => void }) {
  const descricao =
    categoria.key === "equipe" && professionalCount <= 1
      ? "Você tem 1 profissional cadastrado — quando adicionar mais, os relatórios comparam a equipe automaticamente."
      : categoria.description;

  // Grade sem card órfão: número de colunas escolhido pela quantidade real
  // de relatórios da categoria (2 vira 2, 3 vira 3 numa linha só, 4 vira
  // 2×2) — em vez de fixar 3 colunas e sobrar 1 item sozinho na segunda
  // linha, como acontecia antes.
  const colsClass =
    categoria.reports.length >= 4 ? "md:grid-cols-2" : categoria.reports.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-muted-foreground">{descricao}</p>
      <div className={cn("grid grid-cols-1 gap-6", colsClass)}>
        {categoria.reports.map((r) => (
          <ReportCard key={r.slug} relatorio={r} onClick={() => onAbrir(r.slug)} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ relatorio, onClick }: { relatorio: ReportDef; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left w-full min-w-0 block group">
      <Card className="min-w-0 border-border hover:border-muted-foreground/30 hover:shadow-sm transition-all">
        <CardContent className="p-5 md:p-6 flex flex-col min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading font-semibold text-base truncate">{relatorio.title}</h3>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">{relatorio.description}</p>
          <div className="mt-4">
            {relatorio.status === "planned" ? (
              <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Em breve</span>
            ) : (
              <span className="text-xs text-primary font-medium">Abrir relatório →</span>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function VisaoGeralPreview() {
  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">Os principais indicadores do negócio no período selecionado.</p>
    </div>
  );
}

function EstadoFidelidade() {
  return (
    <Card className="mt-6 border-dashed">
      <CardContent className="p-8 flex flex-col items-center text-center gap-2">
        <Heart className="w-8 h-8 text-muted-foreground" />
        <p className="font-medium">Fidelidade ainda não existe como funcionalidade no Impegni</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Quando o programa de fidelidade for implementado, os relatórios desta categoria aparecem aqui automaticamente.
        </p>
      </CardContent>
    </Card>
  );
}
