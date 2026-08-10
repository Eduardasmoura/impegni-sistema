import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { ConfiguracaoView } from "./configuracao-view";

export default async function ConfiguracaoPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <ConfiguracaoView company={current.company} />;
}
