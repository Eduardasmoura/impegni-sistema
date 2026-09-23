import { ClipboardList, History, UserRound, CalendarDays } from "lucide-react";
import { FeatureShowcase } from "./feature-showcase";

// Seções de módulo com print real. Os destaques citam só o que existe no
// painel hoje (rotas em apps/web-professional/src/app/(app)).

export function Agenda() {
  return (
    <FeatureShowcase
      id="agenda"
      eyebrow="Agenda"
      title="Sua agenda. Organizada de verdade."
      description="Tenha uma visão clara dos seus atendimentos e organize seu dia sem depender de papel, planilhas ou dezenas de conversas."
      bullets={[
        { title: "Um calendário por profissional", body: "Veja o dia, o mês e quantos atendimentos cada pessoa da equipe tem." },
        { title: "Bloqueios, folgas e férias", body: "Feche horários com antecedência e evite marcar em cima de um compromisso." },
        { title: "Lista de espera", body: "Quando o dia lota, o cliente entra na fila e você sabe quem avisar se abrir vaga." },
      ]}
      image={{
        src: "/produto/agenda-detalhe.png",
        alt: "Agenda do Impegni com calendário de ocupação do mês e os atendimentos do dia de uma profissional",
        width: 1180,
        height: 836,
      }}
    />
  );
}

export function Financeiro() {
  return (
    <FeatureShowcase
      id="financeiro"
      reverse
      tint="muted"
      eyebrow="Financeiro"
      title="Pare de administrar seu negócio no escuro."
      description="Saiba quanto entrou, quanto saiu e quanto sobrou — sem abrir uma planilha."
      bullets={[
        { title: "Receitas, despesas e resultado", body: "Receita total, despesas, lucro líquido e margem do período lado a lado." },
        { title: "Filtros que fazem sentido", body: "Por período, por serviço e por profissional — no mês, no trimestre ou no ano." },
        { title: "Pagamentos e comissões", body: "Acompanhe o que já foi recebido, o que está pendente e o repasse da equipe." },
      ]}
      image={{
        src: "/produto/financeiro-detalhe.png",
        alt: "Financeiro do Impegni com filtros por período, serviço e profissional, e cartões de receita, despesas, lucro líquido, comissões e ticket médio",
        width: 1160,
        height: 600,
      }}
    />
  );
}

const FICHA = [
  { icon: UserRound, label: "Dados pessoais" },
  { icon: History, label: "Histórico" },
  { icon: CalendarDays, label: "Agendamentos" },
  { icon: ClipboardList, label: "Anamnese" },
];

export function Clientes() {
  return (
    <FeatureShowcase
      id="clientes"
      eyebrow="Clientes"
      title="Seus clientes em um só lugar."
      description="Cada cliente com sua ficha: quem é, quando veio, o que fez e o que precisa lembrar no próximo atendimento."
      bullets={[
        { title: "Histórico de atendimentos", body: "Tudo o que o cliente já fez com você, a um clique de distância." },
        { title: "Informações e agendamentos", body: "Contato, dados pessoais e próximos horários na mesma ficha." },
        { title: "Ficha de anamnese", body: "Nos planos com anamnese, as respostas ficam guardadas junto do cliente." },
      ]}
      image={{
        src: "/produto/clientes-detalhe.png",
        alt: "Lista de clientes do Impegni com telefone, e-mail, último atendimento e próximo agendamento",
        width: 1160,
        height: 560,
      }}
      overlay={
        <div className="absolute hidden sm:block -bottom-14 right-4 sm:right-8 rounded-xl border border-foreground/[0.08] bg-card px-4 py-3.5 shadow-float" aria-hidden="true">
          <p className="text-[11.5px] text-muted-foreground mb-2">Na ficha de cada cliente</p>
          <div className="flex flex-wrap gap-1.5">
            {FICHA.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[12.5px] font-medium">
                <Icon className="w-3.5 h-3.5 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>
      }
    />
  );
}
