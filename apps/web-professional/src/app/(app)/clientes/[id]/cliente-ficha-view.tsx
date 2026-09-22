"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Phone, Mail, Calendar, ShieldCheck, Pencil, Trash2, User, ClipboardList, History, Repeat, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { formatDate, formatCurrency } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";
import { ClienteFormDialog } from "../cliente-form-dialog";
import { AnamneseTab } from "./anamnese-tab";
import { AgendamentosTab } from "./agendamentos-tab";
import { PlanoRecorrenteTab } from "./plano-recorrente-tab";

export type Atendimento = {
  id: string;
  scheduled_at: string;
  status: string;
  price: number;
  services: { name: string } | null;
  professionals: { name: string } | null;
  payments: { amount: number; status: string; method: string | null }[];
};

export function ClienteFichaView({
  companyId,
  cliente,
  anamnesisEnabled,
}: {
  companyId: string;
  cliente: Tables<"clients">;
  anamnesisEnabled: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [excluindoLoading, setExcluindoLoading] = useState(false);

  // Buscado uma vez aqui e compartilhado entre "Visão geral" e
  // "Agendamentos" — evita duas idas ao banco pro mesmo dado. Histórico de
  // UM cliente (não de todos), então não tem o problema de volume que a
  // lista de clientes tinha.
  const { data: atendimentos = [], isLoading: carregandoAtendimentos } = useQuery({
    queryKey: ["client-appointments", cliente.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, price, services(name), professionals(name), payments(amount, status, method)")
        .eq("company_id", companyId)
        .eq("client_id", cliente.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Atendimento[];
    },
  });

  const { data: totalAnamnese = 0 } = useQuery({
    queryKey: ["client-anamnesis-count", cliente.id],
    enabled: anamnesisEnabled,
    queryFn: async () => {
      const { count, error } = await supabase.from("anamnesis_responses").select("*", { count: "exact", head: true }).eq("client_id", cliente.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const agora = new Date();
  const proximos = atendimentos.filter((a) => a.status === "scheduled" && new Date(a.scheduled_at) >= agora);
  const passados = atendimentos.filter((a) => !(a.status === "scheduled" && new Date(a.scheduled_at) >= agora));
  const ultimoAtendimento = atendimentos.find((a) => a.status === "completed");
  const proximoAgendamento = [...proximos].sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))[0];

  async function excluirCliente() {
    setExcluindoLoading(true);
    const { error } = await supabase.from("clients").update({ active: false }).eq("id", cliente.id);
    setExcluindoLoading(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: friendlyError(error, "excluir o cliente"), variant: "destructive" });
      return;
    }
    toast({ title: "Cliente removido da lista ativa" });
    router.push("/clientes");
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <button onClick={() => router.push("/clientes")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-4 h-4" /> Clientes
      </button>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-semibold shrink-0">
            {cliente.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold truncate flex items-center gap-2">
              {cliente.name}
              {cliente.user_id && <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-label="Tem conta própria" />}
              {!cliente.active && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">Inativo</span>}
            </h1>
            <p className="text-sm text-muted-foreground">Cliente desde {formatDate(cliente.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditando(true)}>
            <Pencil className="w-3.5 h-3.5" /> Editar cliente
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setExcluindo(true)}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <ResumoItem icon={Phone} label="Telefone" value={cliente.phone || "—"} />
        <ResumoItem icon={Mail} label="E-mail" value={cliente.email || "—"} />
        <ResumoItem icon={Calendar} label="Último atendimento" value={ultimoAtendimento ? formatDate(ultimoAtendimento.scheduled_at) : "—"} />
        <ResumoItem icon={Calendar} label="Próximo agendamento" value={proximoAgendamento ? formatDate(proximoAgendamento.scheduled_at) : "—"} />
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="visao-geral" className="gap-1.5"><LayoutGrid className="w-3.5 h-3.5" /> Visão geral</TabsTrigger>
          <TabsTrigger value="dados" className="gap-1.5"><User className="w-3.5 h-3.5" /> Dados pessoais</TabsTrigger>
          <TabsTrigger value="anamnese" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Anamnese</TabsTrigger>
          <TabsTrigger value="agendamentos" className="gap-1.5"><History className="w-3.5 h-3.5" /> Agendamentos</TabsTrigger>
          <TabsTrigger value="plano" className="gap-1.5"><Repeat className="w-3.5 h-3.5" /> Plano recorrente</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VisaoGeralTab
            cliente={cliente}
            atendimentos={atendimentos}
            carregando={carregandoAtendimentos}
            anamnesisEnabled={anamnesisEnabled}
            totalAnamnese={totalAnamnese}
          />
        </TabsContent>

        <TabsContent value="dados">
          <DadosPessoaisTab cliente={cliente} onEditar={() => setEditando(true)} />
        </TabsContent>

        <TabsContent value="anamnese">
          <AnamneseTab companyId={companyId} clientId={cliente.id} anamnesisEnabled={anamnesisEnabled} />
        </TabsContent>

        <TabsContent value="agendamentos">
          <AgendamentosTab proximos={proximos} passados={passados} carregando={carregandoAtendimentos} />
        </TabsContent>

        <TabsContent value="plano">
          <PlanoRecorrenteTab companyId={companyId} clientId={cliente.id} />
        </TabsContent>
      </Tabs>

      <ClienteFormDialog open={editando} onOpenChange={setEditando} companyId={companyId} cliente={cliente} />

      <ConfirmDeleteDialog
        open={excluindo}
        title="Excluir cliente?"
        description={`"${cliente.name}" deixará de aparecer na sua lista de clientes ativos. O histórico de agendamentos, anamnese e pacotes desse cliente é preservado — nada é apagado.`}
        loading={excluindoLoading}
        onConfirm={excluirCliente}
        onCancel={() => setExcluindo(false)}
      />
    </div>
  );
}

function ResumoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3.5">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><Icon className="w-3.5 h-3.5" /> {label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

function DadosPessoaisTab({ cliente, onEditar }: { cliente: Tables<"clients">; onEditar: () => void }) {
  return (
    <Card className="mt-3">
      <CardContent className="p-5 space-y-4">
        <Campo label="Nome completo" value={cliente.name} />
        <Campo label="Telefone" value={cliente.phone || "—"} />
        <Campo label="E-mail" value={cliente.email || "—"} />
        <Campo label="Data de nascimento" value={cliente.birth_date ? formatDate(cliente.birth_date) : "—"} />
        <Campo label="Observações" value={cliente.notes || "—"} />
        <Campo label="Data de cadastro" value={formatDate(cliente.created_at)} />
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onEditar}>
          <Pencil className="w-3.5 h-3.5" /> Editar informações
        </Button>
      </CardContent>
    </Card>
  );
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}

function VisaoGeralTab({
  cliente,
  atendimentos,
  carregando,
  anamnesisEnabled,
  totalAnamnese,
}: {
  cliente: Tables<"clients">;
  atendimentos: Atendimento[];
  carregando: boolean;
  anamnesisEnabled: boolean;
  totalAnamnese: number;
}) {
  if (carregando) return <Card className="mt-3"><CardContent className="p-5 text-sm text-muted-foreground">Carregando resumo...</CardContent></Card>;

  const concluidos = atendimentos.filter((a) => a.status === "completed");
  const cancelados = atendimentos.filter((a) => a.status === "canceled" || a.status === "no_show");
  // Só soma o que de fato foi concluído — valor "gasto" de um agendamento
  // cancelado/futuro não é gasto de verdade.
  const totalGasto = concluidos.reduce((soma, a) => soma + Number(a.price || 0), 0);

  return (
    <div className="mt-3 grid sm:grid-cols-2 gap-3">
      <StatCard label="Total de agendamentos" value={String(atendimentos.length)} />
      <StatCard label="Concluídos" value={String(concluidos.length)} />
      <StatCard label="Cancelamentos / não compareceu" value={String(cancelados.length)} />
      <StatCard label="Valor total gasto" value={formatCurrency(totalGasto)} hint="Soma dos atendimentos concluídos" />
      {anamnesisEnabled && (
        <StatCard label="Anamnese" value={totalAnamnese > 0 ? `${totalAnamnese} ficha(s) preenchida(s)` : "Nenhuma ficha preenchida"} />
      )}
      <StatCard label="Plano recorrente" value="Este cliente não possui um plano recorrente ativo." small />
    </div>
  );
}

function StatCard({ label, value, hint, small }: { label: string; value: string; hint?: string; small?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={small ? "text-sm mt-1" : "text-xl font-semibold mt-1"}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}
