"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/** Favoritos e "acessados recentemente" — dado real (tabelas da migration 20260916100000), nunca inventado. */
export function useReportFavorites(companyId: string, profileId: string | null) {
  const supabase = createClient();
  const qc = useQueryClient();

  const favoritesQ = useQuery({
    queryKey: ["report-favorites", companyId, profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase.from("report_favorites").select("report_key").eq("company_id", companyId).eq("profile_id", profileId as string);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.report_key));
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ reportKey, isFavorite }: { reportKey: string; isFavorite: boolean }) => {
      if (!profileId) return;
      if (isFavorite) {
        const { error } = await supabase.from("report_favorites").delete().eq("company_id", companyId).eq("profile_id", profileId).eq("report_key", reportKey);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("report_favorites").insert({ company_id: companyId, profile_id: profileId, report_key: reportKey });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-favorites", companyId, profileId] }),
  });

  return { favoriteKeys: favoritesQ.data ?? new Set<string>(), isLoading: favoritesQ.isLoading, toggleFavorite: toggle.mutate };
}

export function useReportRecents(companyId: string, profileId: string | null) {
  const supabase = createClient();
  const qc = useQueryClient();

  const recentsQ = useQuery({
    queryKey: ["report-recents", companyId, profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_view_history")
        .select("report_key, report_title, viewed_at")
        .eq("company_id", companyId).eq("profile_id", profileId as string)
        .order("viewed_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const registerView = useMutation({
    mutationFn: async ({ reportKey, reportTitle }: { reportKey: string; reportTitle: string }) => {
      if (!profileId) return;
      const { error } = await supabase
        .from("report_view_history")
        .upsert({ company_id: companyId, profile_id: profileId, report_key: reportKey, report_title: reportTitle, viewed_at: new Date().toISOString() }, { onConflict: "profile_id,report_key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-recents", companyId, profileId] }),
  });

  return { recents: recentsQ.data ?? [], isLoading: recentsQ.isLoading, registerView: registerView.mutate };
}
