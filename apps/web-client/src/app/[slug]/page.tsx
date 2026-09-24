import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Phone, Instagram, CalendarPlus, CalendarOff, Scissors, Image as ImageIcon, Star } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/favorite-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { PUBLIC_COMPANY_COLUMNS } from "@/lib/public-company";

export default async function CompanyPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select(PUBLIC_COMPANY_COLUMNS)
    .eq("slug", params.slug)
    .in("status", ["active", "trial"])
    .maybeSingle();
  if (!company) notFound();

  // Mesma regra do backend: trial vencido / assinatura inativa → a empresa
  // fica visível mas não recebe novos agendamentos.
  const { data: bookable } = await supabase.rpc("public_company_is_bookable", { p_company_id: company.id });

  const { data: services } = await supabase.from("services").select("*").eq("company_id", company.id).eq("active", true).order("name");
  const { data: professionals } = await supabase.from("professionals").select("*").eq("company_id", company.id).eq("active", true).order("name");
  // Só as publicadas (RLS já filtra `status='published'` pra quem não é da
  // empresa) — a policy reviews_select_public_published cobre isso.
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, response, created_at, clients(name)")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const listaReviews = (reviews as unknown as { id: string; rating: number; comment: string | null; response: string | null; created_at: string; clients: { name: string } | null }[]) || [];
  // Fase 4: média calculada no servidor sobre TODAS as avaliações publicadas
  // (a lista acima é limitada a 20 pra exibição — calcular a média a partir
  // dela sozinha divergiria do real assim que a empresa passar de 20
  // avaliações). Mesma regra de visibilidade pública da policy
  // reviews_select_public_published.
  const { data: ratingRows } = await supabase.rpc("get_company_rating_summary", { p_company_id: company.id });
  const mediaAvaliacoes = Number(ratingRows?.[0]?.average ?? 0);
  const totalAvaliacoes = ratingRows?.[0]?.total ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="h-40 sm:h-56 bg-muted relative overflow-hidden">
        {company.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          // Sem capa cadastrada: placeholder na cor da marca (não uma área vazia) —
          // padrão de pontos + ícone sinalizam que é um estado intencional.
          <div className="w-full h-full bg-gradient-to-br from-secondary to-primary relative flex items-center justify-center">
            <div
              className="absolute inset-0 opacity-25"
              style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
            />
            <ImageIcon className="w-9 h-9 sm:w-11 sm:h-11 text-white/35 relative" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* pb-24 pra sobrar espaço acima da barra fixa "Agendar horário" no mobile */}
      <main className="relative max-w-3xl mx-auto px-4 -mt-10 pb-24 sm:pb-16">
        {!bookable && (
          <div className="mb-6 rounded-lg border border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-4 flex items-start gap-3">
            <CalendarOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">Agendamentos online indisponíveis no momento</p>
              <p className="text-amber-800/80 dark:text-amber-200/70 mt-0.5">
                {company.name} não está recebendo novos agendamentos por aqui agora. Horários já marcados continuam
                valendo — fale direto com o estabelecimento.
              </p>
            </div>
          </div>
        )}
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
                {totalAvaliacoes > 0 && (
                  <span className="flex items-center gap-1 text-foreground font-medium">
                    <Star className="w-3.5 h-3.5 fill-primary text-primary" /> {mediaAvaliacoes.toFixed(1)} ({totalAvaliacoes})
                  </span>
                )}
                {company.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {company.address}</span>}
                {company.whatsapp && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {company.whatsapp}</span>}
                {company.instagram && <span className="flex items-center gap-1"><Instagram className="w-3 h-3" /> {company.instagram}</span>}
                {company.business_hours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {company.business_hours}</span>}
              </div>
            </div>
            <FavoriteButton companyId={company.id} />
            {bookable && (
              <Link href={`/${company.slug}/agendar`} className="hidden sm:block">
                <Button className="gap-2"><CalendarPlus className="w-4 h-4" /> Agendar horário</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <h2 className="font-heading text-lg font-semibold mb-3">Serviços</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {(services as Tables<"services">[] | null)?.map((s) => {
            const card = (
              <Card className={bookable ? "transition-colors hover:border-primary/50 active:bg-muted/50" : ""}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {s.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Scissors className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.name}</p>
                    {s.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.description}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {s.duration_min} min</p>
                  </div>
                  <p className="font-heading font-bold text-primary shrink-0">{formatCurrency(Number(s.price))}</p>
                </CardContent>
              </Card>
            );
            return bookable ? (
              <Link key={s.id} href={`/${company.slug}/agendar?service=${s.id}`}>{card}</Link>
            ) : (
              <div key={s.id}>{card}</div>
            );
          })}
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

        {listaReviews.length > 0 && (
          <>
            <h2 className="font-heading text-lg font-semibold mb-3 mt-8 flex items-center gap-2">
              Avaliações
              <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-primary text-primary" /> {mediaAvaliacoes.toFixed(1)} · {totalAvaliacoes} avaliação(ões)
              </span>
            </h2>
            <div className="space-y-3">
              {listaReviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{r.clients?.name || "Cliente"}</p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-3 h-3 ${n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(r.created_at)}</p>
                    {r.comment && <p className="text-sm mt-2">{r.comment}</p>}
                    {r.response && (
                      <div className="mt-2 pl-3 border-l-2 border-primary/40">
                        <p className="text-xs font-medium text-primary">Resposta do estabelecimento</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.response}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Barra fixa no mobile — o CTA principal continua acessível rolando a
          página (pensado pra quem abre o link pelo WhatsApp/Instagram). No
          desktop o botão do card do topo já basta. */}
      {bookable && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur p-3">
          <Link href={`/${company.slug}/agendar`}>
            <Button className="w-full h-12 gap-2 font-medium"><CalendarPlus className="w-4 h-4" /> Agendar horário</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
