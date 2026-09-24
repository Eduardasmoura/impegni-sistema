import { Rocket, Store, CalendarDays, Users, Wallet, CreditCard, Repeat, ClipboardList, BarChart3, Megaphone, Bell, UserRound, type LucideIcon } from "lucide-react";

const ICONES: Record<string, LucideIcon> = {
  "primeiros-passos": Rocket,
  "meu-estabelecimento": Store,
  agenda: CalendarDays,
  clientes: Users,
  financeiro: Wallet,
  pagamentos: CreditCard,
  "pacotes-recorrentes": Repeat,
  anamnese: ClipboardList,
  relatorios: BarChart3,
  marketing: Megaphone,
  notificacoes: Bell,
  "minha-conta": UserRound,
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONES[slug] ?? Rocket;
  return <Icon className={className} />;
}
