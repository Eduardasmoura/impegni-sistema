import { ShieldCheck, MonitorSmartphone, MessageCircle, CalendarX2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { TestimonialCard, type Testimonial } from "@/components/testimonials/testimonial-card";

// Só depoimentos REAIS, com autorização do cliente. Enquanto a lista estiver
// vazia, o bloco de depoimentos simplesmente não aparece — nada de nome
// genérico apresentado como cliente de verdade.
const DEPOIMENTOS: Testimonial[] = [];

const GARANTIAS = [
  {
    icon: ShieldCheck,
    title: "Seus dados protegidos",
    body: "Cada negócio só enxerga os próprios dados. Tratamento de acordo com a LGPD.",
  },
  {
    icon: MonitorSmartphone,
    title: "Sem instalar nada",
    body: "Funciona no navegador do computador, do tablet e do celular.",
  },
  {
    icon: MessageCircle,
    title: "Suporte de gente",
    body: "Dúvida no dia a dia? Fale com a nossa equipe pelo WhatsApp.",
  },
  {
    icon: CalendarX2,
    title: "Sem fidelidade",
    body: "Cancele quando quiser, sem multa. Seus dados continuam salvos.",
  },
];

export function Confianca() {
  return (
    <section aria-labelledby="confianca-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <SectionHeading
        id="confianca-title"
        eyebrow="Confiança"
        title="Pensado pra rotina real de quem atende."
        description="Menos tempo com ferramenta, mais tempo com cliente — com segurança e sem letra miúda."
      />

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
        {GARANTIAS.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 60}>
            <div className="border-t border-foreground/15 pt-6">
              <Icon className="w-6 h-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="mt-4 font-heading text-[17px] font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-[15px] text-muted-foreground leading-relaxed text-pretty">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {DEPOIMENTOS.length > 0 && (
        <div className="mt-20 grid md:grid-cols-3 gap-5">
          {DEPOIMENTOS.map((d, i) => (
            <Reveal key={d.name} delay={i * 70}>
              <TestimonialCard {...d} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
