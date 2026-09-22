"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { resolveReportPeriodRange, type RelatoriosFilters } from "./filters";

// Teto defensivo por consulta (regra de escala: nunca carregar "tudo") —
// pra uma empresa real (salão/barbearia) isso cobre até ~8 atendimentos/dia
// durante um ano inteiro; se bater no teto, os relatórios avisam que o
// resultado pode estar incompleto em vez de fingir que é tudo.
const ROW_CAP = 3000;

export type RelatoriosRawData = {
  isLoading: boolean;
  isError: boolean;
  periodo: { start: Date; end: Date };
  payments: (Tables<"payments"> & { clients: { name: string } | null })[];
  expenses: Tables<"expenses">[];
  appointments: (Tables<"appointments"> & {
    clients: { name: string } | null;
    services: { name: string; category: string | null } | null;
    professionals: { name: string } | null;
  })[];
  services: Tables<"services">[];
  professionals: Tables<"professionals">[];
  clients: Tables<"clients">[];
  products: Tables<"products">[];
  reviews: (Tables<"reviews"> & { professionals: { name: string } | null })[];
  couponRedemptions: (Tables<"coupon_redemptions"> & { coupons: { code: string } | null })[];
  campaignSends: Tables<"campaign_sends">[];
  truncated: { key: string; count: number }[];
};

/**
 * Uma única fonte de dados por trás de TODOS os relatórios prontos e do
 * construtor personalizado — evita ter 20 lugares refazendo a mesma busca
 * (é literalmente o pedido de "reaproveitamento" da Etapa anterior). Cada
 * relatório/fonte do construtor só recorta/agrupa o que já veio aqui.
 */
export function useRelatoriosRawData(companyId: string, filters: RelatoriosFilters): RelatoriosRawData {
  const supabase = createClient();
  // MEMOIZADO: `resolveReportPeriodRange` usa `new Date()` como "agora"
  // quando não recebe um valor — sem o useMemo, cada render calculava um
  // "agora" nanosegundos mais novo, mudava `endISO`, mudava a queryKey e
  // disparava um refetch, que causava um novo render... um loop infinito
  // de requisições ao banco (visto na prática: a mesma query repetindo com
  // o timestamp final avançando a cada render). Recalcula só quando o
  // período selecionado de fato muda.
  const periodo = useMemo(
    () => resolveReportPeriodRange(filters.periodo, { start: filters.customStart, end: filters.customEnd }),
    [filters.periodo, filters.customStart, filters.customEnd]
  );
  const startISO = periodo.start.toISOString();
  const endISO = periodo.end.toISOString();

  const paymentsQ = useQuery({
    queryKey: ["rel-payments", companyId, startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, clients(name)")
        .eq("company_id", companyId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false })
        .limit(ROW_CAP);
      if (error) throw error;
      return data as RelatoriosRawData["payments"];
    },
  });

  const expensesQ = useQuery({
    queryKey: ["rel-expenses", companyId, startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("company_id", companyId)
        .gte("expense_date", startISO.slice(0, 10))
        .lte("expense_date", endISO.slice(0, 10))
        .limit(ROW_CAP);
      if (error) throw error;
      return data as Tables<"expenses">[];
    },
  });

  const appointmentsQ = useQuery({
    queryKey: ["rel-appointments", companyId, startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, clients(name), services(name, category), professionals(name)")
        .eq("company_id", companyId)
        .gte("scheduled_at", startISO)
        .lte("scheduled_at", endISO)
        .order("scheduled_at", { ascending: false })
        .limit(ROW_CAP);
      if (error) throw error;
      return data as RelatoriosRawData["appointments"];
    },
  });

  const servicesQ = useQuery({
    queryKey: ["rel-services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"services">[];
    },
  });

  const professionalsQ = useQuery({
    queryKey: ["rel-professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });

  // Clientes: só o necessário pra "novos clientes" contar sem depender de
  // RPC (created_at já é o dado real de aquisição) — recorrência/inatividade/
  // aniversariantes usam as RPCs de segmentação (não este array).
  const clientsQ = useQuery({
    queryKey: ["rel-clients", companyId, startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("company_id", companyId)
        .eq("active", true)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .limit(ROW_CAP);
      if (error) throw error;
      return data as Tables<"clients">[];
    },
  });

  // Estoque é "foto atual" — não filtra por período de propósito.
  const productsQ = useQuery({
    queryKey: ["rel-products", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"products">[];
    },
  });

  const reviewsQ = useQuery({
    queryKey: ["rel-reviews", companyId, startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, professionals(name)")
        .eq("company_id", companyId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .limit(ROW_CAP);
      if (error) throw error;
      return data as RelatoriosRawData["reviews"];
    },
  });

  const couponsQ = useQuery({
    queryKey: ["rel-coupon-redemptions", companyId, startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupon_redemptions")
        .select("*, coupons(code)")
        .eq("company_id", companyId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .limit(ROW_CAP);
      if (error) throw error;
      return data as RelatoriosRawData["couponRedemptions"];
    },
  });

  const campaignsQ = useQuery({
    queryKey: ["rel-campaign-sends", companyId, startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_sends")
        .select("*")
        .eq("company_id", companyId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .limit(ROW_CAP);
      if (error) throw error;
      return data as Tables<"campaign_sends">[];
    },
  });

  const queries = [paymentsQ, expensesQ, appointmentsQ, servicesQ, professionalsQ, clientsQ, productsQ, reviewsQ, couponsQ, campaignsQ];
  const truncated: { key: string; count: number }[] = [];
  const flag = (key: string, arr: unknown[] | undefined) => { if (arr && arr.length >= ROW_CAP) truncated.push({ key, count: arr.length }); };
  flag("payments", paymentsQ.data); flag("expenses", expensesQ.data); flag("appointments", appointmentsQ.data);
  flag("clients", clientsQ.data); flag("reviews", reviewsQ.data); flag("coupon_redemptions", couponsQ.data); flag("campaign_sends", campaignsQ.data);

  return {
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    periodo,
    payments: paymentsQ.data ?? [],
    expenses: expensesQ.data ?? [],
    appointments: appointmentsQ.data ?? [],
    services: servicesQ.data ?? [],
    professionals: professionalsQ.data ?? [],
    clients: clientsQ.data ?? [],
    products: productsQ.data ?? [],
    reviews: reviewsQ.data ?? [],
    couponRedemptions: couponsQ.data ?? [],
    campaignSends: campaignsQ.data ?? [],
    truncated,
  };
}

/**
 * Filtra `appointments` pelos avançados (profissional/serviço/status/forma
 * de pagamento) — `appointments` é a única tabela que carrega os 4 campos
 * ao mesmo tempo, por isso os relatórios que precisam filtrar `payments`
 * por profissional/serviço primeiro recortam os `appointment_id`
 * correspondentes aqui e depois filtram os pagamentos por esse conjunto
 * (mesma técnica já usada no Financeiro — não inventa uma segunda regra).
 */
export function filterAppointments(rows: RelatoriosRawData["appointments"], filters: RelatoriosFilters): RelatoriosRawData["appointments"] {
  return rows.filter((a) => {
    if (filters.professionalIds.length && !filters.professionalIds.includes(a.professional_id)) return false;
    if (filters.serviceIds.length && !filters.serviceIds.includes(a.service_id)) return false;
    if (filters.status.length && !filters.status.includes(a.status)) return false;
    if (filters.paymentMethods.length && !(a.payment_method && filters.paymentMethods.includes(a.payment_method))) return false;
    return true;
  });
}
