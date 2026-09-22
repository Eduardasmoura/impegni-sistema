"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, HeartOff, Loader2, MapPin, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type FavoriteRow = {
  id: string;
  company_id: string;
  companies: { name: string; slug: string; address: string | null; logo_url: string | null } | null;
};

export function FavoritosView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const supabase = createClient();

  const { data: favoritos = [], isLoading, isError } = useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, company_id, companies(name, slug, address, logo_url)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as FavoriteRow[];
    },
  });

  async function desfavoritar(id: string) {
    await supabase.from("favorites").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["favorites", userId] });
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold mb-1">Favoritos</h1>
      <p className="text-sm text-muted-foreground mb-6">Empresas que você salvou pra agendar rapidinho</p>

      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Carregando favoritos...</p>
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-2 text-center text-destructive">
            <AlertCircle className="w-6 h-6" />
            <p className="text-sm">Não foi possível carregar seus favoritos.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && favoritos.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Heart className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Você ainda não favoritou nenhuma empresa.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {favoritos.map((f) => (
          <Card key={f.id}>
            <CardContent className="p-4 flex items-center gap-3">
              <Link href={`/${f.companies?.slug}`} className="flex-1 min-w-0 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {f.companies?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.companies.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Heart className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{f.companies?.name}</p>
                  {f.companies?.address && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /> {f.companies.address}
                    </p>
                  )}
                </div>
              </Link>
              <button
                onClick={() => desfavoritar(f.id)}
                title="Remover dos favoritos"
                aria-label="Remover dos favoritos"
                className="p-2 rounded-lg hover:bg-muted text-destructive shrink-0"
              >
                <HeartOff className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
