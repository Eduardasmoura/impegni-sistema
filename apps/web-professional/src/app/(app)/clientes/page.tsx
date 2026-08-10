import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { ClientesView } from "./clientes-view";

export default async function ClientesPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <ClientesView companyId={current.company.id} />;
}
