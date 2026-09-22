import { Check, Clock, Laptop, Smartphone } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

// Comunica com clareza o estágio do produto sem soar incompleto: a versão
// Web já resolve o dia a dia hoje, o app Mobile é a evolução anunciada —
// nunca "em desenvolvimento"/"beta", que passaria a ideia errada de que o
// que já existe não está pronto pra uso real.
export function WebMobile() {
  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <SectionHeading
        title="Você já pode começar pela Web."
        description="Nossa plataforma Web já está disponível para você organizar seu negócio agora. E estamos preparando a experiência Mobile para deixar sua gestão ainda mais prática, de qualquer lugar."
      />

      <div className="mt-12 grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Laptop className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Web</p>
              <p className="font-heading font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" aria-hidden="true" /> Disponível
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Acesse pelo navegador do computador, tablet ou celular — agenda, clientes, financeiro, equipe e a
            página pública de agendamento, tudo funcionando hoje.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Mobile</p>
              <p className="font-heading font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4" aria-hidden="true" /> Em breve
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Um aplicativo dedicado está em preparação para levar a mesma gestão pro bolso, com a praticidade de
            um app nativo.
          </p>
        </div>
      </div>
    </section>
  );
}
