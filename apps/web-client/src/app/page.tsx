import Link from "next/link";
import { Scissors, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export default async function HomePage() {
  const supabase = await createClient();
  // Lista só quem está aceitando agendamento agora (ativo ou trial dentro
  // dos 14 dias) — a RPC aplica a mesma regra de acesso do resto do
  // sistema. Empresa com trial vencido some daqui, mas a página dela por
  // link direto continua abrindo (com aviso).
  const { data: companies } = await supabase.rpc("public_directory_companies");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-heading text-3xl font-semibold mb-1">Encontre seu salão</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Escolha uma empresa para ver serviços e agendar, ou acesse direto pelo link que ela te passou (<code>/&lt;empresa&gt;</code>).
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {(companies as Tables<"companies">[] | null)?.map((company) => (
            <Link key={company.id} href={`/${company.slug}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {company.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                    ) : (
                      <Scissors className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{company.name}</p>
                    {company.address && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {company.address}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!companies || companies.length === 0) && (
            <Card className="sm:col-span-2">
              <CardContent className="py-16 text-center text-muted-foreground">Nenhuma empresa disponível ainda.</CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
