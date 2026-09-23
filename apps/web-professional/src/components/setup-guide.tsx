"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Image as ImageIcon, Clock, Scissors, UserCog, CalendarCheck2, Link2, Users, CalendarPlus,
  Check, ChevronDown, ChevronUp, Copy, X, PartyPopper,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { BOOKING_DOMAIN } from "@/lib/format";

const COLLAPSE_KEY = "setup-guide:collapsed";
const DISMISS_KEY = "setup-guide:dismissed-complete";

export type SetupProgress = {
  perfilCompleto: boolean;
  horarioConfigurado: boolean;
  servicoCadastrado: boolean;
  profissionalCadastrado: boolean;
  primeiroCliente: boolean;
  primeiroAtendimento: boolean;
  companySlug: string;
};

/**
 * FASE 6 (Section 2/3) — onboarding guiado + checklist do dashboard, num
 * componente só: o mesmo progresso real vira "wizard" (expandido, passo a
 * passo) ou "checklist" compacta (recolhida), trocando só de aparência —
 * nunca de dado. Nenhum item aqui é uma flag "marcado como feito" salva no
 * banco: os 8 itens são sempre calculados a partir do dado real da empresa
 * (`companies.logo_url`/`business_hours`, contagem de services/
 * professionals/clients/appointments) — impossível o checklist "mentir"
 * dizendo que algo foi feito quando não foi. A única preferência salva
 * (localStorage, como o colapso da sidebar) é se o usuário prefere ver
 * recolhido ou não — puramente de exibição, nunca afeta o progresso.
 */
export function SetupGuide(progress: SetupProgress) {
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissedComplete, setDismissedComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    setDismissedComplete(localStorage.getItem(DISMISS_KEY) === "1");
    setHydrated(true);
  }, []);

  const itens = [
    {
      key: "perfil",
      Icon: ImageIcon,
      label: "Perfil completo",
      descricao: "Adicione a logo do seu negócio — é a primeira coisa que o cliente vê na página de agendamento.",
      done: progress.perfilCompleto,
      cta: { label: "Adicionar logo", href: "/configuracao" },
    },
    {
      key: "horario",
      Icon: Clock,
      label: "Horário configurado",
      descricao: "Defina o horário de funcionamento do seu negócio.",
      done: progress.horarioConfigurado,
      cta: { label: "Configurar horário", href: "/configuracao" },
    },
    {
      key: "servico",
      Icon: Scissors,
      label: "Serviço cadastrado",
      descricao: "Cadastre seu primeiro serviço, com preço e duração.",
      done: progress.servicoCadastrado,
      cta: { label: "Adicionar serviço", href: "/servicos?onboarding=1" },
    },
    {
      key: "profissional",
      Icon: UserCog,
      label: "Profissional cadastrado",
      descricao: "Adicione você mesmo (ou sua equipe) como profissional — sem isso, ninguém aparece pra ser escolhido no agendamento.",
      done: progress.profissionalCadastrado,
      cta: { label: "Adicionar profissional", href: "/equipe?onboarding=1" },
    },
    {
      key: "agenda",
      Icon: CalendarCheck2,
      label: "Agenda configurada",
      descricao: "Automático: assim que horário, serviço e profissional estiverem prontos, sua agenda já está pronta pra receber agendamento.",
      done: progress.horarioConfigurado && progress.servicoCadastrado && progress.profissionalCadastrado,
      cta: { label: "Ver agenda", href: "/agenda" },
    },
    {
      key: "link",
      Icon: Link2,
      label: "Link de agendamento",
      descricao: "Esse é o link que você compartilha com clientes — já está pronto desde que sua empresa foi criada.",
      done: true,
      cta: null,
    },
    {
      key: "cliente",
      Icon: Users,
      label: "Primeiro cliente",
      descricao: "Cadastre seu primeiro cliente (ou espere alguém agendar pelo link público).",
      done: progress.primeiroCliente,
      cta: { label: "Adicionar cliente", href: "/clientes" },
    },
    {
      key: "atendimento",
      Icon: CalendarPlus,
      label: "Primeiro atendimento",
      descricao: "Registre o primeiro agendamento — seu ou de um cliente.",
      done: progress.primeiroAtendimento,
      cta: { label: "Ir pra agenda", href: "/agenda" },
    },
  ];

  const concluidos = itens.filter((i) => i.done).length;
  const total = itens.length;
  const completo = concluidos === total;
  const link = `${progress.companySlug}.${BOOKING_DOMAIN}`;

  function alternarCollapsed() {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      return !v;
    });
  }

  function dispensarCompleto() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissedComplete(true);
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
      toast({ title: "Link copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar", description: `Copie manualmente: ${link}`, variant: "destructive" });
    }
  }

  // Evita flash de conteúdo errado no primeiro render (servidor não sabe a
  // preferência de colapso, que só existe no localStorage do navegador).
  if (!hydrated) return null;

  if (completo && dismissedComplete) return null;

  if (completo) {
    return (
      <Card className="mb-6 border-chart-2/40 bg-chart-2/5">
        <CardContent className="p-4 flex items-center gap-3">
          <PartyPopper className="w-5 h-5 text-chart-2 shrink-0" />
          <p className="text-sm flex-1">
            <span className="font-medium">Configuração completa!</span> Seu negócio está pronto pra receber clientes.
          </p>
          <button onClick={dispensarCompleto} aria-label="Dispensar" title="Dispensar" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </CardContent>
      </Card>
    );
  }

  if (collapsed) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <button onClick={alternarCollapsed} className="w-full flex items-center gap-3 text-left">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Complete seu estabelecimento</p>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(concluidos / total) * 100}%` }} />
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{concluidos}/{total}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-heading font-semibold">Complete seu estabelecimento</p>
          <button onClick={alternarCollapsed} aria-label="Recolher" title="Recolher" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0">
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(concluidos / total) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{concluidos}/{total}</span>
        </div>

        <div className="space-y-1">
          {itens.map((item) => (
            <div key={item.key} className={cn("flex items-center gap-3 p-2.5 rounded-lg", item.done ? "opacity-60" : "bg-muted/40")}>
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", item.done ? "bg-chart-2/15 text-chart-2" : "bg-muted text-muted-foreground")}>
                {item.done ? <Check className="w-4 h-4" /> : <item.Icon className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", item.done && "line-through decoration-muted-foreground/50")}>{item.label}</p>
                {!item.done && <p className="text-xs text-muted-foreground">{item.descricao}</p>}
              </div>
              {!item.done && item.cta && (
                <Link href={item.cta.href} className="shrink-0">
                  <Button size="sm" variant="outline">{item.cta.label}</Button>
                </Link>
              )}
              {item.key === "link" && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-muted-foreground hidden sm:inline">{link}</span>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={copiarLink}>
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
