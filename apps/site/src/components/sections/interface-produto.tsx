"use client";

import { useState } from "react";
import Image from "next/image";
import { SectionHeading } from "@/components/ui/section-heading";

// Capturas de tela reais do produto — nenhuma imagem genérica ou gerada.
// O visitante troca de aba e vê o sistema de verdade antes de se cadastrar.
const MODULOS = [
  { key: "dashboard", label: "Dashboard", img: "/screenshots/dashboard.png", desc: "Visão geral do negócio: faturamento do período, atendimentos e formas de pagamento, numa única tela." },
  { key: "agenda", label: "Agenda", img: "/screenshots/agenda.png", desc: "Horários organizados por profissional, com bloqueios, folgas e agendamento vindo da sua página pública." },
  { key: "clientes", label: "Clientes", img: "/screenshots/clientes.png", desc: "Histórico e ficha de cada cliente, acessível a qualquer momento pra consultar o que já foi combinado." },
  { key: "financeiro", label: "Financeiro", img: "/screenshots/financeiro.png", desc: "Receita, despesas e resultado do período, com filtro por serviço e por profissional." },
  { key: "estoque", label: "Estoque", img: "/screenshots/estoque.png", desc: "Produtos, quantidade disponível e alerta automático quando algo está acabando." },
] as const;

export function InterfaceProduto() {
  const [active, setActive] = useState<(typeof MODULOS)[number]["key"]>("dashboard");
  const modulo = MODULOS.find((m) => m.key === active)!;

  return (
    <section id="produto" className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <SectionHeading title="Veja o sistema por dentro" description="Sem surpresa depois do cadastro — o produto real, do jeito que ele é." />

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {MODULOS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setActive(m.key)}
            aria-pressed={active === m.key}
            className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors ${
              active === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-8 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/[0.06] overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-chart-4/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-chart-2/50" />
            <span className="ml-3 text-xs text-muted-foreground">app.impegni.com.br/{modulo.key}</span>
          </div>
          <Image
            key={modulo.key}
            src={modulo.img}
            alt={`Tela de ${modulo.label.toLowerCase()} do Impegni`}
            width={1440}
            height={900}
            className="w-full h-auto"
          />
        </div>
        <p className="mt-5 text-center text-muted-foreground text-[15px] max-w-lg mx-auto text-pretty">{modulo.desc}</p>
      </div>
    </section>
  );
}
