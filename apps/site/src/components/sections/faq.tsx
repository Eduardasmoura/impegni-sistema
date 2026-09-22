import { ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

const PERGUNTAS = [
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. O InovaFlow funciona direto pelo navegador, no computador ou no celular, sem precisar instalar nada.",
  },
  {
    q: "Posso usar pelo celular?",
    a: "Sim — a interface se adapta ao celular normalmente. Um aplicativo dedicado para Android e iPhone chega em breve.",
  },
  {
    q: "Meus clientes conseguem agendar sozinhos?",
    a: "Sim. Cada empresa tem sua própria página pública de agendamento — é só compartilhar o link, sem o cliente precisar criar conta ou instalar nada.",
  },
  {
    q: "Como meus clientes recebem o link de agendamento?",
    a: "Do jeito que for mais prático pra você: pelo WhatsApp, Instagram ou onde já conversa com eles. É um link fixo, o mesmo sempre.",
  },
  {
    q: "Existe período de teste?",
    a: "Sim — 14 dias grátis em qualquer plano, com acesso completo ao sistema, sem pedir cartão de crédito no cadastro.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa. Quando o teste ou a assinatura terminam, o acesso fica pausado, mas seus dados continuam salvos.",
  },
  {
    q: "Posso cadastrar meus próprios serviços?",
    a: "Sim. Você cadastra nome, preço e duração de cada serviço, e eles aparecem automaticamente na sua página de agendamento.",
  },
  {
    q: "Dá pra controlar o financeiro do meu negócio?",
    a: "Sim. O painel mostra receitas, despesas e resultado do período, com filtro por serviço e por profissional.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <SectionHeading title="Perguntas frequentes" description="O que costuma pesar na hora de decidir." className="mb-12" />

      <div className="divide-y divide-border border-y border-border">
        {PERGUNTAS.map(({ q, a }) => (
          <details key={q} className="group py-5">
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-medium text-[15px] marker:content-none">
              {q}
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-3 text-[14.5px] text-muted-foreground leading-relaxed text-pretty">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
