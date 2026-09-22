import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/company";
import { BloqueiosView } from "./bloqueios-view";

export default async function BloqueiosPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <BloqueiosView companyId={current.company.id} />;
}
