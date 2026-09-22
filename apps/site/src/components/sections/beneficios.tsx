import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const BENEFICIOS = [
  "Organize sua agenda",
  "Tenha seus clientes em um só lugar",
  "Facilite os agendamentos",
  "Divulgue seu próprio link",
  "Tenha uma rotina mais organizada",
  "Passe uma imagem mais profissional",
];

// Seção deliberadamente diferente das grades de card acima e abaixo — só
// texto e um checklist, num bloco com fundo tintado — pra dar ritmo visual
// à página em vez de repetir sempre o mesmo padrão de seção.
export function Beneficios() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-center">
          <Reveal>
            <h2 className="font-heading text-3xl sm:text-[2.25rem] font-bold tracking-tight text-balance">
              Mais organização para você.
              <br />
              Mais praticidade para seus clientes.
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {BENEFICIOS.map((beneficio) => (
                <li key={beneficio} className="flex items-center gap-3 text-[15px] font-medium">
                  <Check className="w-4.5 h-4.5 shrink-0 text-primary-foreground/80" aria-hidden="true" />
                  {beneficio}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
