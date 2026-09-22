import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

const SITUACOES = [
  {
    title: "Agenda espalhada",
    body: "Agendamentos pelo WhatsApp, Instagram e anotações soltas acabam dificultando sua organização.",
  },
  {
    title: "Clientes sem histórico",
    body: "Informações importantes ficam espalhadas e você perde tempo procurando o que já foi combinado.",
  },
  {
    title: "Horários esquecidos",
    body: "Sem uma agenda centralizada, fica mais difícil acompanhar seus próximos atendimentos.",
  },
  {
    title: "Muito trabalho manual",
    body: "Você deveria estar atendendo seus clientes, não gastando horas organizando sua agenda.",
  },
];

// Lista editorial, sem cards nem ícones em caixa — de propósito diferente
// do formato de grade usado em "Solução" logo abaixo, pra a página não
// repetir o mesmo componente duas vezes seguidas.
export function Problema() {
  return (
    <section className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <SectionHeading title="Sua rotina não precisa ser uma bagunça." align="left" className="mb-4 max-w-none" />

      <div className="mt-10 divide-y divide-border border-t border-border">
        {SITUACOES.map(({ title, body }, i) => (
          <Reveal key={title} delay={i * 60}>
            <div className="py-6 flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-8">
              <span className="font-heading text-sm font-semibold text-primary shrink-0 sm:w-8">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="sm:flex-1 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-8">
                <h3 className="font-heading text-[17px] font-semibold">{title}</h3>
                <p className="mt-1.5 sm:mt-0 text-[15px] text-muted-foreground leading-relaxed text-pretty">{body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
