import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsappFloat } from "@/components/layout/whatsapp-float";
import { Hero } from "@/components/sections/hero";
import { Problema } from "@/components/sections/problema";
import { Funcionalidades } from "@/components/sections/funcionalidades";
import { Agenda, Clientes, Financeiro } from "@/components/sections/modulos";
import { AgendamentoOnline } from "@/components/sections/agendamento-online";
import { InterfaceProduto } from "@/components/sections/interface-produto";
import { ParaQuem } from "@/components/sections/para-quem";
import { ComoFunciona } from "@/components/sections/como-funciona";
import { Confianca } from "@/components/sections/confianca";
import { Planos } from "@/components/pricing/planos";
import { Faq } from "@/components/sections/faq";
import { CtaFinal } from "@/components/sections/cta-final";

// Planos vêm do banco (tabela `plans`) — revalida a cada 10 min pra um
// preço alterado no Super Admin aparecer aqui sem precisar de novo deploy.
export const revalidate = 600;

// Narrativa: problema → solução → produto (módulos com print real) →
// funcionalidades → experiência (demo por abas) → para quem → como
// funciona → confiança → preço → FAQ → teste grátis. Um único objetivo de
// conversão (Começar grátis) repetido ao longo da página.
export default function HomePage() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <Problema />
        <Funcionalidades />
        <Agenda />
        <Clientes />
        <Financeiro />
        <AgendamentoOnline />
        <InterfaceProduto />
        <ParaQuem />
        <ComoFunciona />
        <Confianca />
        <Planos />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
      <WhatsappFloat />
    </>
  );
}
