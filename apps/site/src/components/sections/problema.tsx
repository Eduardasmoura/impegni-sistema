import { ArrowDown } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

// O "antes e depois" que abre a narrativa: problema → solução, em três
// situações concretas do dia a dia, antes de mostrar qualquer funcionalidade.
const SITUACOES = [
  {
    antes: "Horários anotados no caderno, no Instagram e em dezenas de conversas.",
    depois: "Todos os atendimentos numa agenda só, atualizada na hora.",
  },
  {
    antes: "Cliente pedindo horário às 23h e você respondendo no intervalo do atendimento.",
    depois: "O cliente agenda sozinho pelo seu link, a qualquer hora.",
  },
  {
    antes: "Fim do mês chega e você não sabe quanto entrou nem quanto sobrou.",
    depois: "Receitas, despesas e resultado do período sempre à vista.",
  },
];

export function Problema() {
  return (
    <section aria-labelledby="problema-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <SectionHeading
        id="problema-title"
        eyebrow="Por que o Impegni"
        title="Talento você já tem. Falta a gestão acompanhar."
        description="Quem atende o dia inteiro não pode perder tempo organizando papel, planilha e mensagem."
      />

      <div className="mt-14 grid md:grid-cols-3 gap-4 sm:gap-5">
        {SITUACOES.map(({ antes, depois }, i) => (
          <Reveal key={depois} delay={i * 80}>
            <div className="h-full rounded-2xl border border-foreground/[0.08] bg-card p-6 sm:p-7 flex flex-col">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">Hoje</p>
              <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed text-pretty">{antes}</p>
              <ArrowDown className="my-5 w-4 h-4 text-foreground/25" aria-hidden="true" />
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-primary/80">Com o Impegni</p>
              <p className="mt-2 text-[16.5px] font-medium leading-snug text-pretty">{depois}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
