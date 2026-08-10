import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Phone, Instagram, CalendarPlus, Scissors } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export default async function CompanyPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("slug", params.slug).eq("status", "active").maybeSingle();
  if (!company) notFound();

  const { data: services } = await supabase.from("services").select("*").eq("company_id", company.id).eq("active", true).order("name");
  const { data: professionals } = await supabase.from("professionals").select("*").eq("company_id", company.id).eq("active", true).order("name");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="h-40 sm:h-56 bg-muted relative">
        {company.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-primary" />
        )}
      </div>

      <main className="max-w-3xl mx-auto px-4 -mt-10 pb-16">
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6 flex flex-wrap items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 border-4 border-card">
              {company.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                <Scissors className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <h1 className="font-heading text-2xl font-semibold">{company.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                {company.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {company.address}</span>}
                {company.whatsapp && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {company.whatsapp}</span>}
                {company.instagram && <span className="flex items-center gap-1"><Instagram className="w-3 h-3" /> {company.instagram}</span>}
              </div>
            </div>
            <Link href={`/${company.slug}/agendar`}>
              <Button className="gap-2"><CalendarPlus className="w-4 h-4" /> Agendar horário</Button>
            </Link>
          </CardContent>
        </Card>

        <h2 className="font-heading text-lg font-semibold mb-3">Serviços</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {(services as Tables<"services">[] | null)?.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {s.duration_min} min</p>
                </div>
                <p className="font-heading font-bold text-primary shrink-0">{formatCurrency(Number(s.price))}</p>
              </CardContent>
            </Card>
          ))}
          {(!services || services.length === 0) && <p className="text-sm text-muted-foreground sm:col-span-2">Nenhum serviço disponível no momento.</p>}
        </div>

        <h2 className="font-heading text-lg font-semibold mb-3">Profissionais</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(professionals as Tables<"professionals">[] | null)?.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden text-lg font-medium">
                  {p.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    p.name[0]
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.role_title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!professionals || professionals.length === 0) && <p className="text-sm text-muted-foreground col-span-full">Nenhum profissional cadastrado.</p>}
        </div>
      </main>
    </div>
  );
}
