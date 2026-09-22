"use client";

// Wrapper de abas da "Central da Empresa". Não existe @radix-ui/react-tabs
// neste app — a barra de abas é manual (botões + estado local), igual ao
// padrão já usado em outras telas do produto (ver financeiro-view.tsx no
// web-professional). O conteúdo de "Resumo" é o EmpresaDetailView existente,
// sem NENHUMA alteração nele — só passa a viver dentro de uma aba.
import { useState } from "react";
import { CalendarDays, Wallet, Package, Megaphone, ScrollText, Building2 } from "lucide-react";
import { EmpresaDetailView, type EmpresaDetailViewProps } from "./empresa-detail-view";
import { AgendaTab } from "./agenda-tab";
import { FinanceiroTab } from "./financeiro-tab";
import { EstoqueTab } from "./estoque-tab";
import { MarketingTab } from "./marketing-tab";
import { AuditoriaEmpresaTab } from "./auditoria-empresa-tab";

const TABS = [
  { key: "resumo", label: "Resumo", icon: Building2 },
  { key: "agenda", label: "Agenda", icon: CalendarDays },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "estoque", label: "Estoque", icon: Package },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "auditoria", label: "Auditoria", icon: ScrollText },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CentralTabs(props: EmpresaDetailViewProps) {
  const [tab, setTab] = useState<TabKey>("resumo");
  const companyId = props.company.id;

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex gap-1 overflow-x-auto border-b border-border">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cada aba nova mantém o próprio estado montado só quando ativa —
          evita disparar 5 conjuntos de queries de uma vez ao abrir a
          empresa (a maioria dos acessos usa só "Resumo"). */}
      {tab === "resumo" && <EmpresaDetailView {...props} />}
      {tab === "agenda" && <AgendaTab companyId={companyId} professionals={props.professionals} services={props.services} />}
      {tab === "financeiro" && <FinanceiroTab companyId={companyId} professionals={props.professionals} />}
      {tab === "estoque" && <EstoqueTab companyId={companyId} />}
      {tab === "marketing" && <MarketingTab companyId={companyId} />}
      {tab === "auditoria" && <AuditoriaEmpresaTab companyId={companyId} companyName={props.company.name} />}
    </div>
  );
}
