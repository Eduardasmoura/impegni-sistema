import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { AgendaView } from "./agenda-view";

export default async function AgendaPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <AgendaView companyId={current.company.id} />;
}
