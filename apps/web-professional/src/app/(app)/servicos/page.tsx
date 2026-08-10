import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { ServicosView } from "./servicos-view";

export default async function ServicosPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <ServicosView companyId={current.company.id} />;
}
