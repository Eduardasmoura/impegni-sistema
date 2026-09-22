import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { AvaliacoesView } from "./avaliacoes-view";

export default async function AvaliacoesPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <AvaliacoesView companyId={current.company.id} />;
}
