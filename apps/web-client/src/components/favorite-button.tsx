"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/use-supabase-user";

/**
 * Coração de favoritar/desfavoritar a empresa — some se ninguém está
 * logado (favoritar exige conta, mas não bloqueia ver a página).
 */
export function FavoriteButton({ companyId }: { companyId: string }) {
  const { user } = useSupabaseUser();
  const supabase = createClient();
  const [favoritoId, setFavoritoId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data }) => setFavoritoId(data?.id ?? null));
  }, [user, companyId, supabase]);

  if (!user || favoritoId === undefined) return null;

  async function alternar() {
    if (favoritoId) {
      await supabase.from("favorites").delete().eq("id", favoritoId);
      setFavoritoId(null);
    } else {
      const { data } = await supabase.from("favorites").insert({ user_id: user!.id, company_id: companyId }).select("id").single();
      setFavoritoId(data?.id ?? null);
    }
  }

  return (
    <Button variant="outline" size="icon" onClick={alternar} title={favoritoId ? "Remover dos favoritos" : "Favoritar"} aria-label={favoritoId ? "Remover dos favoritos" : "Favoritar"}>
      <Heart className={cn("w-4 h-4", favoritoId && "fill-destructive text-destructive")} />
    </Button>
  );
}
