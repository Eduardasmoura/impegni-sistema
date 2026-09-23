import { CalendarDays, Users, Wallet, Package, Scissors, Link2, ClipboardList, Gift } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

// Só módulos que existem hoje no painel (apps/web-professional). Anamnese e
// fidelidade dependem do plano (plan_features) — por isso a etiqueta.
const MODULOS = [
  { icon: CalendarDays, title: "Agenda", body: "Atendimentos por profissional, com bloqueios, folgas e lista de espera." },
  { icon: Users, title: "Clientes", body: "Cadastro, histórico de atendimentos e ficha completa de cada cliente." },
  { icon: Wallet, title: "Financeiro", body: "Receitas, despesas, resultado e margem do período, com filtros." },
  { icon: Package, title: "Estoque", body: "Produtos, quantidades e aviso quando algo está acabando." },
  { icon: Scissors, title: "Serviços", body: "Preço e duração de cada serviço, prontos pra agenda e pro link." },
  { icon: Link2, title: "Agendamento online", body: "Sua própria página pra clientes marcarem horário sozinhos." },
  { icon: ClipboardList, title: "Ficha de anamnese", body: "Informações importantes do cliente registradas antes do atendimento.", plano: true },
  { icon: Gift, title: "Programa de fidelidade", body: "Recompense quem volta e incentive o retorno dos clientes.", plano: true },
];

export function Funcionalidades() {
  return (
    <section id="funcionalidades" aria-labelledby="funcionalidades-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      {/* âncora antiga (#solucao) mantida pra não quebrar links já divulgados */}
      <span id="solucao" className="block -translate-y-20" aria-hidden="true" />

      <SectionHeading
        id="funcionalidades-title"
        eyebrow="Funcionalidades"
        title="Tudo o que você precisa para cuidar do seu negócio."
        description="Cada parte da rotina num só sistema, conectada: o que acontece na agenda aparece no cliente e no financeiro."
      />

      <Reveal className="mt-14">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl border border-foreground/[0.08] bg-foreground/[0.08] overflow-hidden">
          {MODULOS.map(({ icon: Icon, title, body, plano }) => (
            <li key={title} className="bg-card p-6 sm:p-7">
              <span className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-heading text-[16.5px] font-semibold tracking-tight flex flex-wrap items-center gap-2">
                {title}
                {plano && <span className="text-[11px] font-medium text-muted-foreground border border-foreground/10 rounded-full px-2 py-0.5">conforme o plano</span>}
              </h3>
              <p className="mt-1.5 text-[14.5px] text-muted-foreground leading-relaxed text-pretty">{body}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
