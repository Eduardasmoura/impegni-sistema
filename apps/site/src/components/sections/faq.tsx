import { Plus } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { WHATSAPP_URL } from "@/lib/format";

const PERGUNTAS = [
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. O Impegni funciona direto pelo navegador, no computador, no tablet ou no celular, sem instalar nada.",
  },
  {
    q: "Posso usar no celular?",
    a: "Sim. O sistema se adapta à tela do celular e funciona normalmente pelo navegador. Um aplicativo dedicado para Android e iPhone está em preparação.",
  },
  {
    q: "Meus clientes conseguem agendar sozinhos?",
    a: "Sim. Seu negócio ganha uma página pública de agendamento: é só compartilhar o link pelo WhatsApp ou Instagram. O cliente escolhe o serviço, o profissional e um horário livre.",
  },
  {
    q: "Como funciona o teste grátis?",
    a: "São 14 dias grátis em qualquer plano, com acesso completo ao sistema e sem pedir cartão de crédito no cadastro. Ao fim do teste, você escolhe um plano pra continuar.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa. Quando o teste ou a assinatura terminam, o acesso fica pausado, mas seus dados continuam salvos.",
  },
  {
    q: "Posso cadastrar meus próprios serviços?",
    a: "Sim. Você cadastra nome, preço e duração de cada serviço, e eles aparecem automaticamente na sua página de agendamento.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PERGUNTAS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] gap-10 lg:gap-16">
        <div>
          <SectionHeading id="faq-title" align="left" eyebrow="FAQ" title="Perguntas frequentes" />
          <p className="mt-5 text-[15px] text-muted-foreground">
            Ficou alguma dúvida?{" "}
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4 decoration-foreground/25 hover:decoration-foreground">
              Fale com a gente no WhatsApp
            </a>
            .
          </p>
        </div>

        <div className="divide-y divide-foreground/[0.08] border-y border-foreground/[0.08]">
          {PERGUNTAS.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex items-center justify-between gap-6 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden font-medium text-[16px] hover:text-foreground/80 transition-colors">
                {q}
                <Plus className="w-4 h-4 text-foreground/50 shrink-0 transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="pb-5 -mt-1 pr-10 text-[15px] text-muted-foreground leading-relaxed text-pretty">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
