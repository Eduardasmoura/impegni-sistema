import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { ConfiguracaoView } from "./configuracao-view";
import { CaucaoCard } from "./caucao-card";

export default async function ConfiguracaoPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  const isManager = current.roleEmpresa === "owner" || current.roleEmpresa === "admin";
  return (
    <>
      <ConfiguracaoView company={current.company} />
      <div className="px-4 sm:px-6 pb-8 max-w-3xl mx-auto">
        <CaucaoCard companyId={current.company.id} isManager={isManager} />
      </div>
    </>
  );
}
