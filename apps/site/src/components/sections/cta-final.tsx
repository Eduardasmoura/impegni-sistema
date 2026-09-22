import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { REGISTER_URL } from "@/lib/format";

export function CtaFinal() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 pb-16 sm:pb-24">
      <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground px-8 py-14 sm:py-20 text-center">
        <div className="pointer-events-none absolute -top-24 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />

        <h2 className="relative font-heading text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-balance max-w-xl mx-auto">
          Sua agenda merece ser tão profissional quanto o seu trabalho.
        </h2>
        <p className="relative mt-3 text-primary-foreground/80 text-lg max-w-md mx-auto text-pretty">
          Organize seus atendimentos, facilite seus agendamentos e tenha mais controle da sua rotina.
        </p>

        <ButtonLink href={REGISTER_URL} variant="onDark" size="lg" className="relative mt-8 group">
          Começar teste grátis
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </ButtonLink>
        <p className="relative mt-4 text-primary-foreground/70 text-sm">14 dias grátis • Sem cartão de crédito</p>
      </div>
    </section>
  );
}
