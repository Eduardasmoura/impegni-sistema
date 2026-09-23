import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { Reveal } from "@/components/ui/reveal";
import { REGISTER_URL } from "@/lib/format";

const PASSOS = [
  { title: "Crie sua conta", body: "Cadastro em poucos minutos, sem cartão de crédito." },
  { title: "Configure seu negócio", body: "Cadastre seus serviços, preços, horários e sua equipe." },
  { title: "Comece a atender", body: "Compartilhe seu link e acompanhe tudo pela agenda." },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="bg-muted/60 border-y border-foreground/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <SectionHeading id="como-funciona-title" eyebrow="Como funciona" title="Do cadastro ao primeiro atendimento em três passos." />

        <div className="relative mt-16">
          {/* linha que conecta as etapas (desktop) */}
          <span className="hidden md:block absolute top-5 left-[calc(16.66%+1.25rem)] right-[calc(16.66%+1.25rem)] h-px bg-foreground/15" aria-hidden="true" />
          <ol className="grid md:grid-cols-3 gap-10 md:gap-8">
            {PASSOS.map((p, i) => (
              <li key={p.title}>
                <Reveal delay={i * 90} className="relative flex md:flex-col md:items-center md:text-center gap-5 md:gap-0">
                  <span className="relative z-10 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[14px] font-semibold shrink-0 ring-8 ring-[hsl(var(--muted))]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block font-heading text-[18px] font-semibold tracking-tight md:mt-6">{p.title}</span>
                    <span className="block mt-1.5 text-[15px] text-muted-foreground leading-relaxed max-w-[26ch] md:mx-auto">{p.body}</span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-14 text-center">
          <ButtonLink href={REGISTER_URL} size="lg" className="group">
            Começar grátis
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
