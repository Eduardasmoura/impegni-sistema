import { AlertTriangle, Ban, Clock, Mail, Scissors, ShieldOff, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { AccessStatus } from "@/lib/access";
import type { Tables } from "@/lib/supabase/database.types";
import { SignOutButton } from "./sign-out-button";
import { PlanPicker } from "./plan-picker";

const SUPPORT_EMAIL = "atendimento.inovabi@gmail.com";

// `reassurance` só existe pros 3 motivos onde a frase é verdadeira e
// verificável: acesso pausado (trial/pagamento/assinatura), mas nada foi
// apagado. Em `company_suspended`/`company_deleted` a situação pode
// envolver revisão humana — não prometo "seus dados estão salvos" onde eu
// não teria como garantir isso.
const REASON_COPY: Record<
  string,
  { icon: typeof Clock; title: string; subtitle: string; reassurance?: string; showPlans: boolean }
> = {
  trial_expired: {
    icon: Clock,
    title: "Seu período de teste terminou",
    subtitle: "Continue usando todos os recursos do InovaFlow escolhendo o plano ideal para o seu negócio.",
    reassurance: "Seus dados, clientes e agendamentos continuam salvos.",
    showPlans: true,
  },
  payment_overdue: {
    icon: AlertTriangle,
    title: "Seu pagamento está atrasado",
    subtitle: "Não conseguimos confirmar o pagamento da sua assinatura. Regularize abaixo para voltar a usar o InovaFlow.",
    reassurance: "Seus dados, clientes e agendamentos continuam salvos.",
    showPlans: true,
  },
  subscription_canceled: {
    icon: XCircle,
    title: "Sua assinatura não está mais ativa",
    subtitle: "O acesso ao painel fica pausado enquanto não houver uma assinatura ativa. Escolha um plano abaixo para reativar.",
    reassurance: "Seus dados, clientes e agendamentos continuam salvos.",
    showPlans: true,
  },
  subscription_suspended: {
    icon: ShieldOff,
    title: "Sua assinatura está suspensa",
    subtitle: "Entre em contato com o suporte para entender o motivo e reativar o acesso.",
    showPlans: false,
  },
  company_suspended: {
    icon: Ban,
    title: "Esta conta está suspensa",
    subtitle: "O acesso da sua empresa foi suspenso. Fale com o suporte para regularizar.",
    showPlans: false,
  },
  company_deleted: {
    icon: AlertTriangle,
    title: "Esta conta não está mais disponível",
    subtitle: "Fale com o suporte se você acredita que isso é um engano.",
    showPlans: false,
  },
};

export function AccessBlockedScreen({
  access,
  company,
  isManager,
  plans,
  plansError,
  allFeatures,
  currentPlanId,
  promoEndsAt,
}: {
  access: AccessStatus;
  company: Tables<"companies">;
  isManager: boolean;
  plans: Tables<"plans">[];
  plansError: boolean;
  allFeatures: Tables<"plan_features">[];
  currentPlanId: string | null;
  promoEndsAt: string | null;
}) {
  const copy = REASON_COPY[access.reason] ?? REASON_COPY.subscription_canceled;
  const Icon = copy.icon;
  // Só quem pode de fato contratar (owner/admin — a própria Edge Function
  // recusa qualquer outro papel) vê a escolha de planos. Pra quem não é
  // manager, mostrar cards de "Contratar" seria oferecer uma ação que vai
  // falhar no backend — melhor pedir pra avisar o responsável.
  const mostrarEscolhaDePlanos = copy.showPlans && isManager;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 py-8 sm:py-12">
      <div className={mostrarEscolhaDePlanos ? "w-full max-w-4xl" : "w-full max-w-lg"}>
        {/* Wordmark — mesmo bloco (marca + "InovaFlow") usado no topo das
            telas de autenticação (`auth-layout.tsx`), pra essa tela não
            parecer um estado de erro solto, e sim uma etapa do próprio
            produto. */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading text-base font-semibold">InovaFlow</span>
        </div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Icon className="w-7 h-7 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold mb-3 text-balance">{copy.title}</h1>

          {/* Metadados discretos — empresa e data separados do texto
              explicativo, não misturados numa frase corrida. */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-3">
            <span>{company.name}</span>
            {access.reason === "trial_expired" && access.trialEndsAt && (
              <>
                <span aria-hidden="true">•</span>
                <span>teste terminou em {formatDate(access.trialEndsAt)}</span>
              </>
            )}
          </div>

          <p className="text-sm text-muted-foreground max-w-md mx-auto text-balance">
            {copy.subtitle} {copy.showPlans && !isManager && "Peça para o dono ou administrador da empresa regularizar o acesso."}
          </p>
          {copy.reassurance && <p className="text-sm text-muted-foreground/80 mt-1">{copy.reassurance}</p>}
        </div>

        {mostrarEscolhaDePlanos && (
          <div className="mb-6">
            <PlanPicker
              plans={plans}
              plansError={plansError}
              allFeatures={allFeatures}
              company={company}
              currentPlanId={currentPlanId}
              subscriptionStatus={access.subscriptionStatus}
              promoEndsAt={promoEndsAt}
              context="blocked"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" asChild className="gap-2">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Ajuda com minha conta — ${company.name}`)}`}>
              <Mail className="w-4 h-4" aria-hidden="true" /> Falar com o suporte
            </a>
          </Button>
          <SignOutButton />
        </div>
        {!mostrarEscolhaDePlanos && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Já resolveu o pagamento? A liberação acontece automaticamente assim que a confirmação chegar — não precisa fazer nada aqui, só recarregar a página em alguns instantes.
          </p>
        )}
      </div>
    </div>
  );
}
