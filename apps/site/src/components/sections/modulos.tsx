import Image from "next/image";
import { FeatureShowcase } from "./feature-showcase";

// Seções de módulo: o benefício vem antes da tela. Todos os prints são do
// produto real (conta de demonstração Taty Beauty, dados fictícios) e os
// destaques citam só o que existe no painel hoje.

export function Agenda() {
  return (
    <FeatureShowcase
      id="agenda"
      eyebrow="Agenda"
      title="Sua agenda. Organizada de verdade."
      description="Veja seu dia inteiro de relance e pare de depender de papel, planilha ou dezenas de conversas."
      bullets={[
        { title: "Cada horário no lugar certo", body: "Cliente, serviço e duração de cada atendimento, na linha do tempo do dia." },
        { title: "O mês inteiro de relance", body: "Um calendário mostra a ocupação de cada dia, por profissional da equipe." },
        { title: "Bloqueios, folgas e lista de espera", body: "Feche horários com antecedência e saiba quem avisar se abrir uma vaga." },
      ]}
      image={{
        src: "/produto/agenda-detalhe.webp",
        width: 1180,
        height: 836,
        alt: "Agenda do Impegni: calendário de ocupação do mês e o dia de uma profissional com seis atendimentos marcados",
      }}
      mobileImage={{ src: "/produto/m-agenda.webp", width: 390, height: 844 }}
    />
  );
}

export function Clientes() {
  return (
    <FeatureShowcase
      id="clientes"
      reverse
      tint="muted"
      eyebrow="Clientes"
      title="Tenha o histórico dos seus clientes sempre à mão."
      description="Contato, último atendimento, próximo horário e as fichas de cada cliente, a um clique."
      bullets={[
        { title: "Contato sem procurar no celular", body: "Telefone e e-mail de cada cliente, direto na ficha." },
        { title: "Histórico que você não perde", body: "Quantos atendimentos, quando foi o último, o próximo e quanto a cliente já investiu." },
        { title: "Anamnese guardada com a cliente", body: "As respostas ficam salvas na ficha, nos planos com anamnese." },
      ]}
      image={{
        src: "/produto/cliente-ficha-detalhe.webp",
        width: 870,
        height: 565,
        alt: "Ficha de uma cliente no Impegni com telefone, e-mail, último atendimento, próximo agendamento e resumo dos atendimentos",
      }}
      mobileImage={{ src: "/produto/m-clientes.webp", width: 390, height: 844 }}
      overlay={
        <div className="absolute -bottom-10 right-4 lg:-right-6 w-[78%] rounded-xl border border-foreground/[0.08] bg-card shadow-float overflow-hidden">
          <Image
            src="/produto/cliente-anamnese-historico.webp"
            alt="Histórico de fichas de anamnese da cliente, com as respostas registradas"
            width={870}
            height={186}
            sizes="(min-width: 1024px) 540px, 70vw"
            className="block w-full h-auto"
          />
        </div>
      }
    />
  );
}

export function Financeiro() {
  return (
    <FeatureShowcase
      id="financeiro"
      eyebrow="Financeiro"
      title="Entenda quanto seu negócio está faturando."
      description="Receita, despesas e lucro do período lado a lado, sem abrir uma planilha."
      bullets={[
        { title: "Quanto entrou, saiu e sobrou", body: "Receita bruta, despesas e lucro líquido do mês, do trimestre ou do ano." },
        { title: "O que ainda falta receber", body: "Receita já confirmada, valores pendentes, comissões da equipe e ticket médio." },
        { title: "Filtros que respondem perguntas", body: "Por período, por serviço e por profissional." },
      ]}
      image={{
        src: "/produto/financeiro-detalhe.webp",
        width: 1160,
        height: 600,
        alt: "Financeiro do Impegni com receita bruta, despesas, lucro líquido, receita recebida, comissões, ticket médio e valores pendentes",
      }}
      mobileImage={{ src: "/produto/m-financeiro.webp", width: 390, height: 844 }}
    />
  );
}
