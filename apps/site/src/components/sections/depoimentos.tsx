import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { TestimonialCard } from "@/components/testimonials/testimonial-card";

// Exemplos ilustrativos de como um depoimento aparece no layout — sem
// números, avaliações ou estatísticas inventadas (ver §13 do briefing).
// Serão substituídos por depoimentos reais assim que existirem.
const DEPOIMENTOS = [
  {
    quote: "Antes eu controlava tudo pelo WhatsApp. Hoje consigo ver minha semana inteira em poucos segundos.",
    name: "Marina",
    role: "Manicure",
  },
  {
    quote: "Meus clientes agendam sozinhos pelo link e eu paro de perder tempo confirmando horário por mensagem.",
    name: "Diego",
    role: "Barbeiro",
  },
  {
    quote: "Consigo ver o que entrou e o que saiu no mês sem precisar abrir uma planilha separada.",
    name: "Fernanda",
    role: "Esteticista",
  },
];

export function Depoimentos() {
  return (
    <section id="depoimentos" className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <SectionHeading title="Quem organiza a rotina assim" description="Como o dia a dia muda pra quem centraliza a agenda e os clientes num só lugar." />

      <div className="mt-14 grid sm:grid-cols-3 gap-5">
        {DEPOIMENTOS.map((depoimento, i) => (
          <Reveal key={depoimento.name} delay={i * 70}>
            <TestimonialCard {...depoimento} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
