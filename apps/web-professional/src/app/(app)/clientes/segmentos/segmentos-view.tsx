"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { UserX, Repeat, UserPlus, RotateCcw, Phone, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Candidato = { client_id: string; name: string; phone: string | null; [key: string]: unknown };

const PERIODOS = [7, 15, 30, 60, 90, 180];

/**
 * Segmentação de clientes — 4 recortes sobre a mesma base de agendamentos,
 * todos já calculados no servidor (RPCs da Fase 4/5, `security definer`,
 * mesma checagem de manager/super_admin que qualquer outra tela de
 * gestão). Nenhuma tabela nova aqui — é 100% leitura reaproveitando dado
 * que já existe.
 */
export function SegmentosView({ companyId }: { companyId: string }) {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar pra Clientes
      </Link>
      <h1 className="font-heading text-3xl font-semibold mb-1">Segmentação de clientes</h1>
      <p className="text-sm text-muted-foreground mb-6">Listas prontas pra ação — quem parou de vir, quem é fiel, quem é novo.</p>

      <Tabs defaultValue="inativos">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="inativos">Inativos</TabsTrigger>
          <TabsTrigger value="recorrentes">Recorrentes</TabsTrigger>
          <TabsTrigger value="novos">Novos</TabsTrigger>
          <TabsTrigger value="nao_retornaram">Não retornaram</TabsTrigger>
        </TabsList>

        <TabsContent value="inativos">
          <InativosTab companyId={companyId} />
        </TabsContent>
        <TabsContent value="recorrentes">
          <RecorrentesTab companyId={companyId} />
        </TabsContent>
        <TabsContent value="novos">
          <NovosTab companyId={companyId} />
        </TabsContent>
        <TabsContent value="nao_retornaram">
          <NaoRetornaramTab companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ListaCandidatos({
  itens,
  isLoading,
  isError,
  icon: Icon,
  vazio,
  render,
}: {
  itens: Candidato[];
  isLoading: boolean;
  isError: boolean;
  icon: typeof UserX;
  vazio: string;
  render: (c: Candidato) => React.ReactNode;
}) {
  if (isLoading) return <LoadingState text="Carregando..." />;
  if (isError) return <ErrorState message="Não foi possível carregar essa lista." />;
  if (itens.length === 0) {
    return (
      <Card className="mt-3">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Icon className="w-9 h-9 mx-auto mb-3 opacity-40" />
          {vazio}
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {itens.map((c) => (
        <Card key={c.client_id}>
          <CardContent className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">{c.name[0]}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</p>}
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-right shrink-0">{render(c)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PeriodoSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        {PERIODOS.map((p) => <SelectItem key={p} value={String(p)}>{p} dias</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function InativosTab({ companyId }: { companyId: string }) {
  const [dias, setDias] = useState(30);
  const supabase = createClient();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["segmento-inativos", companyId, dias],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_inactive_client_candidates", { p_company_id: companyId, p_days_inactive: dias });
      if (error) throw error;
      return data as Candidato[];
    },
  });
  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
        <p className="text-sm text-muted-foreground">Sem atendimento concluído há mais de:</p>
        <PeriodoSelect value={dias} onChange={setDias} />
      </div>
      <ListaCandidatos
        itens={data}
        isLoading={isLoading}
        isError={isError}
        icon={UserX}
        vazio="Nenhum cliente inativo nesse período."
        render={(c) => <>último atendimento em<br /><span className="font-medium text-foreground">{formatDate(c.last_appointment_at as string)}</span></>}
      />
    </div>
  );
}

function RecorrentesTab({ companyId }: { companyId: string }) {
  const [dias, setDias] = useState(90);
  const [minAtendimentos, setMinAtendimentos] = useState(3);
  const supabase = createClient();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["segmento-recorrentes", companyId, dias, minAtendimentos],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recurring_client_candidates", {
        p_company_id: companyId,
        p_min_appointments: minAtendimentos,
        p_period_days: dias,
      });
      if (error) throw error;
      return data as Candidato[];
    },
  });
  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
        <p className="text-sm text-muted-foreground">{minAtendimentos}+ atendimentos concluídos nos últimos:</p>
        <div className="flex items-center gap-2">
          <Select value={String(minAtendimentos)} onValueChange={(v) => setMinAtendimentos(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{[2, 3, 4, 5, 8].map((n) => <SelectItem key={n} value={String(n)}>{n}+ vezes</SelectItem>)}</SelectContent>
          </Select>
          <PeriodoSelect value={dias} onChange={setDias} />
        </div>
      </div>
      <ListaCandidatos
        itens={data}
        isLoading={isLoading}
        isError={isError}
        icon={Repeat}
        vazio="Nenhum cliente recorrente nesse critério."
        render={(c) => <><span className="font-medium text-foreground">{c.appointments_count as number}x</span> no período<br />última em {formatDate(c.last_appointment_at as string)}</>}
      />
    </div>
  );
}

function NovosTab({ companyId }: { companyId: string }) {
  const [dias, setDias] = useState(30);
  const supabase = createClient();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["segmento-novos", companyId, dias],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_new_client_candidates", { p_company_id: companyId, p_days: dias });
      if (error) throw error;
      return data as Candidato[];
    },
  });
  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
        <p className="text-sm text-muted-foreground">Primeiro atendimento concluído nos últimos:</p>
        <PeriodoSelect value={dias} onChange={setDias} />
      </div>
      <ListaCandidatos
        itens={data}
        isLoading={isLoading}
        isError={isError}
        icon={UserPlus}
        vazio="Nenhum cliente novo nesse período."
        render={(c) => <>desde<br /><span className="font-medium text-foreground">{formatDate(c.first_appointment_at as string)}</span></>}
      />
    </div>
  );
}

function NaoRetornaramTab({ companyId }: { companyId: string }) {
  // Mesma base de dado de "Inativos" (o próprio backend trata os dois
  // como o mesmo conceito — get_recovery_candidates é literalmente
  // get_inactive_client_candidates com outro período padrão), só que aqui
  // com uma janela mais longa por padrão: o recorte que importa pra
  // recuperação é "sumiu de vez", não "está um pouco atrasado".
  const [dias, setDias] = useState(90);
  const supabase = createClient();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["segmento-nao-retornaram", companyId, dias],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recovery_candidates", { p_company_id: companyId, p_days_since_last: dias });
      if (error) throw error;
      return data as Candidato[];
    },
  });
  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
        <p className="text-sm text-muted-foreground">Sumiu há mais de:</p>
        <PeriodoSelect value={dias} onChange={setDias} />
      </div>
      <ListaCandidatos
        itens={data}
        isLoading={isLoading}
        isError={isError}
        icon={RotateCcw}
        vazio="Nenhum cliente nesse recorte."
        render={(c) => <>último atendimento em<br /><span className="font-medium text-foreground">{formatDate(c.last_appointment_at as string)}</span></>}
      />
    </div>
  );
}
