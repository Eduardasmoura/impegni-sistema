import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/company";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { BloqueiosView } from "./bloqueios-view";

export default async function BloqueiosPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <BloqueiosView companyId={current.company.id} companyTimezone={current.company.timezone ?? DEFAULT_TIMEZONE} />;
}
