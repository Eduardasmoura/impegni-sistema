import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgendarView } from "./agendar-view";

export default async function AgendarPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("*").eq("slug", params.slug).eq("status", "active").maybeSingle();
  if (!company) notFound();

  return <AgendarView company={company} />;
}
