import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { REGISTER_URL } from "@/lib/format";

export function CtaFinal() {
  return (
    <section aria-labelledby="cta-final-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28">
      <div className="rounded-3xl bg-ink text-white px-6 py-16 sm:px-16 sm:py-24 text-center">
        <h2 id="cta-final-title" className="font-heading text-[2rem] sm:text-[3rem] font-semibold leading-[1.06] tracking-[-0.03em] text-balance max-w-4xl mx-auto">
          Seu negócio já cresceu.
          <br />
          <span className="text-white/65">Sua gestão também precisa crescer.</span>
        </h2>
        <p className="mt-6 text-white/75 text-lg max-w-md mx-auto text-pretty">Organize sua agenda, seus clientes e seu negócio com o Impegni.</p>

        <ButtonLink href={REGISTER_URL} variant="onDark" size="lg" className="mt-10 group">
          Começar grátis
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </ButtonLink>
        <p className="mt-4 text-white/60 text-sm">14 dias grátis • Sem cartão de crédito</p>
      </div>
    </section>
  );
}
