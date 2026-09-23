import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

const PUBLICOS = [
  { nome: "Manicure", linha: "Agenda cheia sem ficar presa ao celular." },
  { nome: "Cabeleireira", linha: "Serviços longos sem horário encavalado." },
  { nome: "Barbeiro", linha: "O cliente marca pelo link, você foca no corte." },
  { nome: "Nail designer", linha: "Manutenções e retornos sempre na agenda." },
  { nome: "Esteticista", linha: "Anamnese guardada junto de cada cliente." },
  { nome: "Designer de sobrancelhas", linha: "Atendimentos rápidos, agenda sempre em dia." },
  { nome: "Podóloga", linha: "O histórico do cliente à mão em cada retorno." },
  { nome: "Studio de beleza", linha: "Equipe, repasses e financeiro num só lugar." },
];

export function ParaQuem() {
  return (
    <section id="para-quem" aria-labelledby="para-quem-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 lg:gap-16 items-start">
        <SectionHeading
          id="para-quem-title"
          align="left"
          eyebrow="Para quem é"
          title="Feito para quem transforma talento em negócio."
          description="Do atendimento individual ao studio com equipe: o Impegni acompanha o tamanho do seu negócio."
          className="lg:sticky lg:top-28"
        />

        <Reveal>
          <ul className="grid grid-cols-2 gap-px rounded-2xl border border-foreground/[0.08] bg-foreground/[0.08] overflow-hidden">
            {PUBLICOS.map(({ nome, linha }) => (
              <li key={nome} className="bg-card px-4 py-4 sm:px-6 sm:py-6">
                <p className="font-heading text-[15px] sm:text-[17px] font-semibold tracking-tight">{nome}</p>
                <p className="hidden sm:block mt-1 text-[14.5px] text-muted-foreground">{linha}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
