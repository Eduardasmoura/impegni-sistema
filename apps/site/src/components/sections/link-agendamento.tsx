import Image from "next/image";
import { Check } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { BOOKING_ROOT_DOMAIN } from "@/lib/format";

const VANTAGENS = [
  "Seu cliente escolhe o horário sem trocar mensagem",
  "Funciona a qualquer hora, mesmo fora do seu expediente",
  "Reforça uma imagem mais profissional do seu trabalho",
];

// Print real da página pública de uma empresa demo (barbearia-vintage-demo,
// mesma usada nos outros prints do site) — não é uma tela inventada.
export function LinkAgendamento() {
  return (
    <section id="link-agendamento" className="bg-muted/40 border-y border-border/70">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Sua página de agendamento"
              title="Seu cliente recebe seu link e agenda sozinho."
              description="Cada profissional tem sua própria página pública, com seus serviços e horários — é só compartilhar."
            />
            <ul className="mt-8 space-y-3.5">
              {VANTAGENS.map((vantagem) => (
                <li key={vantagem} className="flex items-start gap-3 text-[15px]">
                  <Check className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-foreground/85">{vantagem}</span>
                </li>
              ))}
            </ul>
          </div>

          <Reveal>
            <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/[0.08] overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-chart-4/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-chart-2/50" />
                <span className="ml-3 text-xs text-muted-foreground">barbearia-vintage-demo.{BOOKING_ROOT_DOMAIN}</span>
              </div>
              <Image
                src="/screenshots/agendamento-publico.png"
                alt="Página pública de agendamento da Barbearia Vintage, com serviços, preços e botão de agendar"
                width={900}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
