"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { LayoutDashboard, CalendarDays, Users, Wallet, Package, ClipboardList } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

// Capturas de tela reais do produto — nenhuma imagem genérica ou gerada.
// O visitante troca de aba e vê o sistema de verdade antes de se cadastrar.
const MODULOS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    img: "/produto/dashboard.png",
    desc: "Os números do dia, a agenda de hoje e a receita do período numa única tela, com atalhos para o que você mais usa.",
  },
  {
    key: "agenda",
    label: "Agenda",
    icon: CalendarDays,
    img: "/produto/agenda.png",
    desc: "Ocupação do mês e o dia de cada profissional, com bloqueios, folgas, lista de espera e os agendamentos que chegam pela sua página.",
  },
  {
    key: "clientes",
    label: "Clientes",
    icon: Users,
    img: "/produto/clientes.png",
    desc: "Todos os clientes com contato, último atendimento e próximo horário marcado, com acesso rápido à ficha de cada um.",
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: Wallet,
    img: "/produto/financeiro.png",
    desc: "Receita, despesas, lucro líquido, comissões e valores pendentes, com filtro por período, serviço e profissional.",
  },
  {
    key: "estoque",
    label: "Estoque",
    icon: Package,
    img: "/produto/estoque.png",
    desc: "Produtos por categoria, quantidade, valor em estoque e aviso automático quando algo está acabando.",
  },
  {
    key: "anamnese",
    label: "Anamnese",
    icon: ClipboardList,
    img: "/produto/anamnese.png",
    desc: "Monte a ficha de perguntas do seu atendimento e registre as respostas de cada cliente (nos planos com anamnese).",
  },
] as const;

type Key = (typeof MODULOS)[number]["key"];

export function InterfaceProduto() {
  const [active, setActive] = useState<Key>("dashboard");
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const index = MODULOS.findIndex((m) => m.key === active);

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

        <div className="mt-12 sm:mt-14 grid lg:grid-cols-[17rem_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
          <div
            role="tablist"
            aria-label="Módulos do Impegni"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="flex lg:flex-col gap-1.5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 lg:pb-0 [scrollbar-width:none]"
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
                    "shrink-0 text-left rounded-xl transition-colors px-4 py-2.5 lg:py-3.5 border",
                    selected ? "bg-card border-foreground/10 shadow-sm" : "border-transparent text-foreground/65 hover:text-foreground hover:bg-card/60"
                  )}
                >
                  <span className="flex items-center gap-2.5 font-semibold text-[15px]">
                    <Icon className={cn("w-[18px] h-[18px]", selected ? "text-primary" : "text-foreground/40")} aria-hidden="true" />
                    {m.label}
                  </span>
                  <span className={cn("hidden text-[14px] leading-relaxed text-muted-foreground mt-1.5 pl-[1.85rem]", selected && "lg:block")}>{m.desc}</span>
                </button>
              );
            })}
          </div>

          <div id="painel-produto" role="tabpanel" aria-labelledby={`tab-${active}`}>
            <div className="rounded-xl sm:rounded-2xl border border-foreground/10 bg-card shadow-product overflow-hidden">
              <div className="flex items-center gap-3 h-8 sm:h-10 px-3 sm:px-4 border-b border-foreground/[0.07] bg-muted/70" aria-hidden="true">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-foreground/15" />
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-foreground/15" />
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-foreground/15" />
                </div>
                <span className="mx-auto rounded-md bg-card/80 px-3 py-0.5 text-[10px] sm:text-xs text-muted-foreground">app.impegni.com.br/{active}</span>
                <span className="w-10 sm:w-12" />
              </div>
              {/* todas as telas empilhadas na mesma célula: a troca é instantânea */}
              <div className="grid">
                {MODULOS.map((m) => (
                  <Image
                    key={m.key}
                    src={m.img}
                    alt={`Tela de ${m.label.toLowerCase()} do Impegni`}
                    width={1440}
                    height={836}
                    sizes="(min-width: 1280px) 900px, (min-width: 1024px) 70vw, 100vw"
                    aria-hidden={m.key !== active}
                    className={cn(
                      "[grid-area:1/1] block w-full h-auto transition-opacity duration-300",
                      m.key === active ? "opacity-100" : "opacity-0"
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="lg:hidden mt-5 text-[15px] text-muted-foreground leading-relaxed text-pretty">{MODULOS[index].desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
