import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { Reveal } from "@/components/ui/reveal";
import { REGISTER_URL } from "@/lib/format";
import { BookingMockup } from "./booking-mockup";

// Mesmo fluxo do web-client: link → profissional/serviço → dia/horário
// livres → agendamento criado, que aparece na agenda do painel.
const PASSOS = [
  { title: "Você compartilha o link", body: "Pelo WhatsApp, pelo Instagram ou onde vocês já conversam." },
  { title: "Escolhe o serviço e o profissional", body: "Com preço e duração de cada serviço à vista." },
  { title: "Escolhe o dia e o horário", body: "Só aparecem horários realmente livres na sua agenda." },
  { title: "O agendamento entra no sistema", body: "Aparece direto na sua agenda, sem troca de mensagem." },
];

// A única seção escura da página — é o diferencial mais fácil de entender
// ("meu cliente marca sozinho"), então ganha o maior contraste.
export function AgendamentoOnline() {
  return (
    <section id="link-agendamento" aria-labelledby="agendamento-title" className="bg-ink text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-14 lg:gap-16 items-center">
          <div>
            <SectionHeading
              id="agendamento-title"
              align="left"
              inverted
              eyebrow="Agendamento online"
              title="Deixe seus clientes agendarem mesmo quando você estiver atendendo."
              description="Você compartilha o link da sua página. O cliente escolhe o serviço e o horário, e o agendamento entra direto na sua agenda — a qualquer hora."
            />

            <ol className="mt-10 space-y-0">
              {PASSOS.map((p, i) => (
                <li key={p.title} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < PASSOS.length - 1 && <span className="absolute left-[15px] top-9 bottom-1 w-px bg-white/15" aria-hidden="true" />}
                  <span className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center text-[13px] font-semibold shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-1">
                    <span className="block font-semibold text-[15.5px]">{p.title}</span>
                    <span className="block text-[15px] text-white/70 leading-relaxed">{p.body}</span>
                  </span>
                </li>
              ))}
            </ol>

            <ButtonLink href={REGISTER_URL} variant="onDark" size="lg" className="mt-10 group">
              Criar minha página de agendamento
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </ButtonLink>
          </div>

          <Reveal>
            <BookingMockup />
            <p className="mt-4 sm:mt-6 text-[13px] text-white/55">Telas reais da página de agendamento, na conta de demonstração Taty Beauty (dados fictícios).</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
