"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { AnamneseFicha } from "@/components/anamnese-ficha";

type EmpresaCliente = {
  company_id: string;
  companies: { name: string; slug: string } | null;
};

export function AnamneseView({ userId }: { userId: string }) {
  const supabase = createClient();
  const [aberta, setAberta] = useState<string | null>(null);

  // Empresas onde a pessoa já é cliente E que têm um formulário de
  // anamnese ativo. As duas consultas passam pelas policies novas
  // (migration anamnesis_client_self_service) — o cliente só enxerga o
  // formulário ativo das empresas onde tem cadastro.
  const { data: empresas = [], isLoading, isError } = useQuery({
    queryKey: ["anamnese-empresas", userId],
    queryFn: async () => {
      const { data: clientes, error: clientesError } = await supabase
        .from("clients")
        .select("company_id, companies(name, slug)")
        .eq("user_id", userId);
      if (clientesError) throw clientesError;

      const rows = (clientes ?? []) as unknown as EmpresaCliente[];
      const companyIds = rows.map((r) => r.company_id);
      if (companyIds.length === 0) return [];

      const { data: forms, error: formsError } = await supabase
        .from("anamnesis_forms")
        .select("company_id")
        .in("company_id", companyIds)
        .eq("active", true);
      if (formsError) throw formsError;

      const comFormulario = new Set((forms ?? []).map((f) => f.company_id));
      return rows
        .filter((r) => comFormulario.has(r.company_id))
        .sort((a, b) => (a.companies?.name ?? "").localeCompare(b.companies?.name ?? ""));
    },
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold mb-1">Ficha de anamnese</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Preencha a ficha de saúde das empresas onde você tem atendimento. Elas veem suas respostas no seu cadastro.
      </p>

      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Carregando...</p>
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-2 text-center text-destructive">
            <AlertCircle className="w-6 h-6" />
            <p className="text-sm">Não foi possível carregar suas fichas. Tente novamente em instantes.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && empresas.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhuma empresa com ficha de anamnese disponível ainda.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {empresas.map((e) => {
          const nome = e.companies?.name ?? "Empresa";
          const open = aberta === e.company_id;
          return (
            <Card key={e.company_id}>
              <button
                onClick={() => setAberta(open ? null : e.company_id)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <span className="flex-1 min-w-0 font-medium text-sm truncate">{nome}</span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <CardContent className="pt-0 pb-4">
                  <AnamneseFicha companyId={e.company_id} companyName={nome} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
