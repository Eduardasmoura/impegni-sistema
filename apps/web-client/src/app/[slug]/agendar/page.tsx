import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarOff } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { AgendarView } from "./agendar-view";

export default async function AgendarPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  // Inclui 'trial' — durante o teste grátis a agenda pública funciona
  // normalmente. suspended/deleted continuam fora (RLS).
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", params.slug)
    .in("status", ["active", "trial"])
    .maybeSingle();
  if (!company) notFound();

  // Regra checada no backend (mesma do painel): trial vencido / assinatura
  // inativa → a empresa não recebe novos agendamentos. A página continua
  // no ar, mas explica em vez de deixar a pessoa tentar e falhar.
  const { data: bookable } = await supabase.rpc("public_company_is_bookable", { p_company_id: company.id });
  if (!bookable) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="max-w-md mx-auto px-4 py-16">
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <CalendarOff className="w-6 h-6 text-muted-foreground" />
              </div>
              <h1 className="font-heading text-xl font-semibold">Agendamentos indisponíveis no momento</h1>
              <p className="text-sm text-muted-foreground">
                {company.name} não está recebendo novos agendamentos online agora. Se você já tem um horário marcado,
                ele continua valendo — entre em contato direto com o estabelecimento.
              </p>
              <Link href={`/${company.slug}`}>
                <Button variant="outline" className="mt-2">Ver página da empresa</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return <AgendarView company={company} />;
}
