"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Mail, UserPlus } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "@/components/ui/wizard-progress";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { onlyDigits } from "@/lib/validators";
import { stagePendingOnboarding } from "@/lib/pending-onboarding";
import { stageTermsAcceptance } from "@/lib/terms";
import type { Tables } from "@/lib/supabase/database.types";
import { EMPTY_WIZARD_DATA, type WizardData } from "./wizard-types";
import { StepAccount, stepAccountIsValid } from "./steps/step-account";
import { StepBusiness, stepBusinessIsValid } from "./steps/step-business";
import { StepSegment, stepSegmentIsValid } from "./steps/step-segment";
import { StepAddress, stepAddressIsValid } from "./steps/step-address";
import { StepPassword, stepPasswordIsValid } from "./steps/step-password";

const STEP_LABELS = ["Seus dados", "Seu negócio", "Segmento e objetivos", "Endereço", "Senha"];

/**
 * Cadastro do trial em 5 etapas. Só a Etapa 1 e a Etapa 5 falam com o
 * Supabase Auth (`signUp`); os dados de negócio/segmento/objetivos/endereço
 * das Etapas 2-4 ficam em memória até o fim e são só então gravados como
 * rascunho *no banco* (`stage_pending_onboarding`, ver
 * `lib/pending-onboarding.ts`) — nunca direto em `companies`, porque este
 * projeto exige confirmação de e-mail antes de abrir sessão, e sem sessão
 * não há `auth.uid()` pra satisfazer a RLS. O rascunho é chaveado por
 * e-mail (não por navegador), então sobrevive a confirmar o link em outro
 * aparelho. Quem aplica de fato é `/onboarding`, no primeiro login após a
 * confirmação — ver `onboarding-form.tsx`.
 */
export function RegisterWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(EMPTY_WIZARD_DATA);
  const [segments, setSegments] = useState<Tables<"segments">[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [draftWarning, setDraftWarning] = useState(false);

  useEffect(() => {
    createClient()
      .from("segments")
      .select("*")
      .eq("active", true)
      .order("name")
      .then(({ data: rows }) => {
        if (rows) setSegments(rows);
      });
  }, []);

  function patch(update: Partial<WizardData>) {
    setData((current) => ({ ...current, ...update }));
  }

  const stepValid = [
    stepAccountIsValid(data),
    stepBusinessIsValid(data),
    stepSegmentIsValid(data, segments),
    stepAddressIsValid(data),
    stepPasswordIsValid(data),
  ][step];

  async function handleFinish() {
    if (loading) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName, phone: onlyDigits(data.phone) },
        // Volta pelo /auth/callback: entra já logada e segue pro onboarding,
        // que cria a empresa a partir do rascunho guardado logo abaixo.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(friendlyError(signUpError, "criar sua conta"));
      return;
    }

    const otherSegmentSelected = segments.find((s) => s.id === data.segmentId)?.slug === "outro";
    const { error: draftError } = await stagePendingOnboarding(supabase, data.email, {
      phone: onlyDigits(data.phone),
      businessName: data.businessName.trim(),
      document: onlyDigits(data.document),
      businessSize: data.businessSize,
      staffSizeRange: data.staffSizeRange,
      segmentId: data.segmentId,
      otherSegment: otherSegmentSelected ? data.otherSegment.trim() : null,
      goals: data.goals,
      zipCode: onlyDigits(data.zipCode),
      street: data.street.trim(),
      neighborhood: data.neighborhood.trim(),
      addressNumber: data.addressNumber.trim(),
      complement: data.complement.trim(),
      city: data.city.trim(),
      state: data.state.trim().toUpperCase(),
    });

    // A conta já foi criada nesse ponto (signUp não é reversível daqui) —
    // se só o rascunho falhar, ainda deixamos a pessoa seguir pra
    // confirmação, avisando que vai precisar preencher negócio/endereço de
    // novo depois. Travar aqui deixaria uma conta órfã sem saída.
    if (draftError) {
      // eslint-disable-next-line no-console
      console.error("[cadastro] falha ao guardar rascunho do onboarding", draftError);
      setDraftWarning(true);
    }

    // Aceite do contrato — registrado no instante real do clique (não na
    // confirmação de e-mail, que pode vir dias depois), mesma mecânica do
    // rascunho. Falhar aqui não deveria travar o cadastro (a conta já
    // existe), mas é grave o suficiente pra logar bem alto: sem essa
    // linha não há evidência auditável do aceite.
    const { error: termsError } = await stageTermsAcceptance(supabase, data.email);
    if (termsError) {
      // eslint-disable-next-line no-console
      console.error("[cadastro] falha ao registrar aceite do contrato", termsError);
    }

    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout icon={Mail} title="Confirme seu e-mail" subtitle={`Enviamos um link de confirmação para ${data.email}.`}>
        <p className="text-sm text-muted-foreground text-center mb-4">
          {draftWarning
            ? "Sua conta foi criada, mas não conseguimos guardar os dados do seu negócio agora — depois de confirmar e entrar, você vai preencher porte, segmento e endereço de novo, rapidinho."
            : "Assim que confirmar, é só entrar — seu espaço e o teste grátis de 14 dias já estarão prontos."}
        </p>
        <Button className="w-full h-12" onClick={() => router.push("/login")}>
          Ir para o login
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Crie sua conta"
      subtitle={step === 0 ? "Vamos começar com algumas informações básicas." : undefined}
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <WizardProgress step={step + 1} totalSteps={STEP_LABELS.length} label={STEP_LABELS[step]} />

      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      {step === 0 && <StepAccount data={data} onChange={patch} />}
      {step === 1 && <StepBusiness data={data} onChange={patch} />}
      {step === 2 && <StepSegment data={data} onChange={patch} segments={segments} />}
      {step === 3 && <StepAddress data={data} onChange={patch} />}
      {step === 4 && <StepPassword data={data} onChange={patch} segments={segments} />}

      <div className="flex items-center gap-2 mt-6">
        {step > 0 && (
          <Button type="button" variant="outline" className="h-12 gap-1.5" onClick={() => setStep((s) => s - 1)} disabled={loading}>
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Button>
        )}
        <Button
          type="button"
          className="flex-1 h-12 font-medium"
          disabled={!stepValid || loading}
          onClick={() => (step === STEP_LABELS.length - 1 ? handleFinish() : setStep((s) => s + 1))}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : step === STEP_LABELS.length - 1 ? (
            "Criar minha conta"
          ) : (
            "Continuar"
          )}
        </Button>
      </div>
    </AuthLayout>
  );
}
