import Link from "next/link";
import { CalendarPlus, UserPlus, Scissors, UserCog, Receipt, CalendarDays } from "lucide-react";

const ACOES = [
  { href: "/agenda?novo=1", label: "Novo agendamento", icon: CalendarPlus },
  { href: "/clientes?novo=1", label: "Novo cliente", icon: UserPlus },
  { href: "/servicos?onboarding=1", label: "Novo serviço", icon: Scissors },
  { href: "/equipe?onboarding=1", label: "Novo profissional", icon: UserCog },
  { href: "/financeiro", label: "Registrar pagamento", icon: Receipt },
  { href: "/agenda", label: "Ver agenda", icon: CalendarDays },
];

// "Novo serviço"/"Novo profissional" reaproveitam o MESMO deep link
// ?onboarding=1 que o checklist de primeiro acesso já usa (abre o dialog
// de cadastro direto) — não é um mecanismo novo, é o mesmo já existente.
// "Novo agendamento"/"Novo cliente" usam ?novo=1, adicionado agora nas
// duas telas seguindo esse padrão. "Registrar pagamento" não tem uma ação
// isolada equivalente no Financeiro hoje (pagamento nasce junto de um
// agendamento) — leva pra lá sem forçar abrir um dialog específico.
export function QuickActions() {
  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground mb-2.5">Ações rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {ACOES.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <a.icon className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
