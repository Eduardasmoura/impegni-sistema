"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { LayoutDashboard, CalendarDays, Users, Wallet, Package, ClipboardList, Check } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

// Telas reais do produto (conta de demonstração Taty Beauty, dados
// fictícios). Cada aba responde "por que eu deveria me importar com esta
// tela?" antes de mostrá-la — e só cita o que a tela realmente tem.
const MODULOS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    title: "Tenha uma visão completa do seu negócio.",
    benefits: ["Agendamentos, atendimentos e receita do dia", "A agenda de hoje na mesma tela", "Gráfico da receita do período"],
    img: "/produto/dashboard.webp",
    mobile: "/produto/m-dashboard.webp",
  },
  {
    key: "agenda",
    label: "Agenda",
    icon: CalendarDays,
    title: "Controle seu dia inteiro por aqui.",
    benefits: ["Horário, cliente e serviço de cada atendimento", "Calendário com a ocupação de cada dia", "Visão por profissional da equipe"],
    img: "/produto/agenda.webp",
    mobile: "/produto/m-agenda.webp",
  },
  {
    key: "clientes",
    label: "Clientes",
    icon: Users,
    title: "Saiba quem são seus clientes.",
    benefits: ["Telefone e e-mail sempre à mão", "Último atendimento e próximo horário", "Busca por nome, telefone ou e-mail"],
    img: "/produto/clientes.webp",
    mobile: "/produto/m-clientes.webp",
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: Wallet,
    title: "Entenda como seu negócio está financeiramente.",
    benefits: ["Receita, despesas e lucro líquido", "Comissões, ticket médio e valores pendentes", "Filtros por período, serviço e profissional"],
    img: "/produto/financeiro.webp",
    mobile: "/produto/m-financeiro.webp",
  },
  {
    key: "estoque",
    label: "Estoque",
    icon: Package,
    title: "Saiba o que você tem e o que precisa repor.",
    benefits: ["Produtos por categoria, com preço e quantidade", "Valor total do estoque", "Aviso automático de estoque baixo"],
    img: "/produto/estoque.webp",
    mobile: "/produto/m-estoque.webp",
  },
  {
    key: "anamnese",
    label: "Anamnese",
    icon: ClipboardList,
    title: "Uma ficha feita para o seu atendimento.",
    benefits: ["Crie suas próprias perguntas", "Respostas guardadas na ficha de cada cliente", "Disponível nos planos com anamnese"],
    img: "/produto/anamnese.webp",
    mobile: "/produto/m-anamnese.webp",
  },
] as const;

type Key = (typeof MODULOS)[number]["key"];

export function InterfaceProduto() {
  const [active, setActive] = useState<Key>("dashboard");
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const index = MODULOS.findIndex((m) => m.key === active);
  const modulo = MODULOS[index];

  function onKeyDown(e: React.KeyboardEvent) {
    const last = MODULOS.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(MODULOS[next].key);
    tabsRef.current[next]?.focus();
  }

  return (
    <section id="produto" aria-labelledby="produto-title" className="bg-muted/60 border-y border-foreground/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <SectionHeading
          id="produto-title"
          eyebrow="Produto"
          title="Veja o Impegni por dentro."
          description="Sem surpresa depois do cadastro: estas são as telas reais do sistema."
        />

        <div
          role="tablist"
          aria-label="Telas do Impegni"
          onKeyDown={onKeyDown}
          className="mt-12 flex sm:justify-center gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none]"
        >
          {MODULOS.map((m, i) => {
            const selected = m.key === active;
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                ref={(el) => {
                  tabsRef.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${m.key}`}
                aria-selected={selected}
                aria-controls="painel-produto"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(m.key)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full text-[14.5px] font-semibold border transition-colors",
                  selected ? "bg-card border-foreground/10 shadow-sm text-foreground" : "border-transparent text-foreground/60 hover:text-foreground hover:bg-card/60"
                )}
              >
                <Icon className={cn("w-4 h-4", selected ? "text-primary" : "text-foreground/40")} aria-hidden="true" />
                {m.label}
              </button>
            );
          })}
        </div>

        <div
          id="painel-produto"
          role="tabpanel"
          aria-labelledby={`tab-${active}`}
          className="mt-10 grid lg:grid-cols-[minmax(0,4fr)_minmax(0,9fr)] gap-8 lg:gap-12 items-center"
        >
          <div key={active} className="animate-fade-in">
            <h3 className="font-heading text-[1.6rem] sm:text-[1.9rem] leading-tight font-semibold tracking-[-0.02em] text-balance">{modulo.title}</h3>
            <ul className="mt-6 space-y-3.5">
              {modulo.benefits.map((b) => (
                <li key={b} className="flex gap-3 text-[15.5px]">
                  <Check className="w-[18px] h-[18px] mt-0.5 text-primary shrink-0" strokeWidth={2.5} aria-hidden="true" />
                  <span className="text-foreground/85">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* desktop/tablet: telas empilhadas na mesma célula, troca instantânea */}
          <div className="hidden sm:block rounded-2xl border border-foreground/10 bg-card shadow-product overflow-hidden">
            <div className="flex items-center gap-3 h-10 px-4 border-b border-foreground/[0.07] bg-muted/70" aria-hidden="true">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
              </div>
              <span className="mx-auto rounded-md bg-card/80 px-3 py-0.5 text-xs text-muted-foreground">app.impegni.com.br/{active}</span>
              <span className="w-12" />
            </div>
            <div className="grid">
              {MODULOS.map((m) => (
                <Image
                  key={m.key}
                  src={m.img}
                  alt={m.key === active ? `Tela de ${m.label.toLowerCase()} do Impegni` : ""}
                  aria-hidden={m.key !== active}
                  width={1440}
                  height={836}
                  sizes="(min-width: 1280px) 860px, (min-width: 1024px) 66vw, 92vw"
                  className={cn("[grid-area:1/1] block w-full h-auto transition-opacity duration-300", m.key === active ? "opacity-100" : "opacity-0")}
                />
              ))}
            </div>
          </div>

          {/* celular: só a tela ativa, na versão mobile (legível) */}
          <div className="sm:hidden rounded-2xl border border-foreground/10 bg-card shadow-product overflow-hidden aspect-[390/620]">
            <Image
              key={modulo.mobile}
              src={modulo.mobile}
              alt={`Tela de ${modulo.label.toLowerCase()} do Impegni no celular`}
              width={390}
              height={844}
              sizes="92vw"
              className="block w-full h-full object-cover object-top animate-fade-in"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
