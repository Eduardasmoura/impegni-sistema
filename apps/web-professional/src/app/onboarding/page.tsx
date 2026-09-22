import { ShieldOff } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { AuthLayout } from "@/components/auth-layout";
import { SignOutButton } from "@/components/sign-out-button";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentCompany();
  if (current) redirect("/dashboard");

  // Auditoria ETAPA 2: quem chega aqui sem empresa pode ser (a) alguém que
  // nunca criou uma — mostra o formulário normal — ou (b) alguém que foi
  // desativado de uma empresa que já existia — mostrar o formulário de
  // "criar empresa" pra essa pessoa seria confuso (ela não perdeu a
  // empresa, ela perdeu o acesso a ela). `get_my_inactive_membership` só
  // revela a PRÓPRIA membership do usuário logado (nunca de terceiros).
  const { data: inactiveMembership } = await supabase.rpc("get_my_inactive_membership").maybeSingle();

  if (inactiveMembership) {
    return (
      <AuthLayout
        icon={ShieldOff}
        title="Acesso desativado"
        subtitle={`Sua conta foi desativada em "${inactiveMembership.company_name}". Fale com o administrador da empresa para reativar seu acesso.`}
      >
        <SignOutButton />
      </AuthLayout>
    );
  }

  return <OnboardingForm userEmail={user.email ?? ""} />;
}
