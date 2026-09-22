import { UserPlus, Settings2, Share2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

const PASSOS = [
  { icon: UserPlus, title: "Crie sua conta", body: "Cadastro rápido, sem cartão de crédito — comece a configurar seu perfil em minutos." },
  { icon: Settings2, title: "Configure seus serviços", body: "Adicione seus serviços, preços, horários de atendimento e as informações do seu negócio." },
  { icon: Share2, title: "Compartilhe seu link", body: "Envie sua página de agendamento pros seus clientes e deixe que eles marquem sozinhos." },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <SectionHeading title="Como funciona" description="Do cadastro ao primeiro agendamento, em três passos." />

      <div className="mt-14 grid sm:grid-cols-3 gap-x-6 gap-y-10 relative">
        <div className="hidden sm:block absolute top-7 left-[16.5%] right-[16.5%] h-px bg-border" aria-hidden="true" />

        {PASSOS.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 90}>
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
                <span className="relative z-10 w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-heading text-lg font-bold shrink-0 mx-auto sm:mx-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon className="w-5 h-5 text-primary sm:mt-3" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-[16.5px] font-semibold mt-4 mb-1.5 text-balance">{title}</h3>
              <p className="text-[14.5px] text-muted-foreground leading-relaxed text-pretty max-w-xs mx-auto sm:mx-0">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
