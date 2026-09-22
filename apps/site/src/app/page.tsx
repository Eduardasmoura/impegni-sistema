import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsappFloat } from "@/components/layout/whatsapp-float";
import { Hero } from "@/components/sections/hero";
import { Problema } from "@/components/sections/problema";
import { Solucao } from "@/components/sections/solucao";
import { LinkAgendamento } from "@/components/sections/link-agendamento";
import { ComoFunciona } from "@/components/sections/como-funciona";
import { Beneficios } from "@/components/sections/beneficios";
import { InterfaceProduto } from "@/components/sections/interface-produto";
import { WebMobile } from "@/components/sections/web-mobile";
import { Depoimentos } from "@/components/sections/depoimentos";
import { Planos } from "@/components/pricing/planos";
import { Faq } from "@/components/sections/faq";
import { CtaFinal } from "@/components/sections/cta-final";

// Jornada: Problema → Solução → Link de agendamento → Como funciona →
// Benefícios → Interface do produto → Web/Mobile → Depoimentos → Planos →
// FAQ → CTA final. Um único caminho de conversão (teste grátis) repetido
// no topo, no meio e no fim — nunca um objetivo concorrente.
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problema />
        <Solucao />
        <LinkAgendamento />
        <ComoFunciona />
        <Beneficios />
        <InterfaceProduto />
        <WebMobile />
        <Depoimentos />
        <Planos />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
      <WhatsappFloat />
    </>
  );
}
