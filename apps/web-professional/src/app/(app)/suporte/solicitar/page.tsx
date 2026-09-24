import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { SUPPORT_CATEGORIES } from "@/lib/support";
import { SuporteView } from "./suporte-view";

export const metadata = { title: "Falar com o suporte — Impegni" };

export default async function SolicitarSuportePage({ searchParams }: { searchParams: { categoria?: string; assunto?: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  // Pré-preenchimento vindo de um artigo ("Ainda precisa de ajuda?") — só
  // aceita categorias conhecidas e limita o assunto ao tamanho do campo.
  const categoria = SUPPORT_CATEGORIES.some((c) => c.value === searchParams.categoria) ? searchParams.categoria! : "";
  const assunto = (searchParams.assunto ?? "").slice(0, 150);

  // company_id só indica QUAL das empresas do usuário está aberta; a Edge
  // Function confere o vínculo ativo antes de registrar o chamado.
  return <SuporteView companyId={current.company.id} userEmail={user.email ?? ""} assuntoInicial={assunto} categoriaInicial={categoria} />;
}
