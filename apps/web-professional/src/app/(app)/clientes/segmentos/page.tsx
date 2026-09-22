import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/company";
import { SegmentosView } from "./segmentos-view";

export default async function SegmentosPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <SegmentosView companyId={current.company.id} />;
}
