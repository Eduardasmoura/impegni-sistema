"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Phone, ShieldCheck, Pencil, Trash2, Eye, Search, UserSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ErrorState } from "@/components/ui/query-state";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import type { Tables } from "@/lib/supabase/database.types";
import { ClienteFormDialog } from "./cliente-form-dialog";

const PAGE_SIZE = 25;

type ClienteLinha = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  birth_date: string | null;
  user_id: string | null;
  active: boolean;
  created_at: string;
  last_appointment_at: string | null;
  next_appointment_at: string | null;
  has_anamnesis: boolean;
  total_count: number;
};

const FILTROS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "upcoming", label: "Com agendamento futuro" },
  { value: "no_upcoming", label: "Sem agendamento futuro" },
  { value: "inactive", label: "Inativos" },
];
const FILTROS_ANAMNESE: { value: string; label: string }[] = [
  { value: "anamnesis_filled", label: "Com ficha de anamnese" },
  { value: "anamnesis_empty", label: "Sem ficha de anamnese" },
];

export function ClientesView({ companyId, anamnesisEnabled }: { companyId: string; anamnesisEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();

  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState(""); // valor com debounce, é o que de fato vai pra query
  const [filtro, setFiltro] = useState("all");
  const [pagina, setPagina] = useState(1);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Tables<"clients"> | null>(null);
  const [excluindo, setExcluindo] = useState<ClienteLinha | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);

  // Debounce simples (300ms) — sem isso, cada tecla digitada dispararia uma
  // ida ao banco. Volta pra página 1 sempre que a busca ou o filtro mudam.
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaInput.trim()), 300);
    return () => clearTimeout(t);
  }, [buscaInput]);
  useEffect(() => setPagina(1), [busca, filtro]);

  // Deep link "Novo cliente" a partir do atalho de Ações rápidas do
  // Dashboard (/clientes?novo=1) — mesmo padrão de /servicos?onboarding=1.
  useEffect(() => {
    if (searchParams.get("novo") === "1") { setEditando(null); setFormAberto(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["clients", companyId, busca, filtro, pagina],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_company_clients", {
        p_company_id: companyId,
        p_search: busca || undefined,
        p_filter: filtro,
        p_page: pagina,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return data as ClienteLinha[];
    },
    placeholderData: (prev) => prev,
  });

  const clientes = data ?? [];
  const total = clientes[0]?.total_count ?? 0;
  const listaVazia = !isLoading && !isError && total === 0 && !busca && filtro === "all";
  const buscaSemResultado = !isLoading && !isError && total === 0 && (!!busca || filtro !== "all");

  async function confirmarExclusao() {
    if (!excluindo) return;
    setExcluindoLoading(true);
    // Soft-delete: nunca DELETE — preserva histórico de agendamentos,
    // anamnese e pacotes já registrados (ver migration
    // 20260914140000_clients_active_soft_delete).
    const { error } = await supabase.from("clients").update({ active: false }).eq("id", excluindo.id);
    setExcluindoLoading(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: friendlyError(error, "excluir o cliente"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients", companyId] });
    toast({ title: "Cliente removido da lista ativa" });
    setExcluindo(null);
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seus clientes, histórico de atendimentos e informações importantes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/clientes/segmentos">
            <Button variant="outline" size="sm" className="gap-1.5">
              <UserSearch className="w-3.5 h-3.5" /> Segmentação
            </Button>
          </Link>
          <Button onClick={() => { setEditando(null); setFormAberto(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Novo cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="pl-9"
            aria-label="Buscar cliente por nome, telefone ou e-mail"
          />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FILTROS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            {anamnesisEnabled && FILTROS_ANAMNESE.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TabelaSkeleton />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar seus clientes. Tente novamente." />
      ) : listaVazia ? (
        <EstadoVazio onNovo={() => { setEditando(null); setFormAberto(true); }} />
      ) : buscaSemResultado ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Search className="w-9 h-9 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground">Não encontramos nenhum cliente.</p>
            <p className="text-sm mt-1">Confira o nome, telefone ou e-mail informado.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop/tablet: tabela */}
          <Card className="hidden md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Último atendimento</TableHead>
                  <TableHead>Próximo agendamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={isFetching ? "opacity-60 transition-opacity" : ""}>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <button onClick={() => router.push(`/clientes/${c.id}`)} className="flex items-center gap-2 text-left hover:underline underline-offset-2 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">{c.name[0]?.toUpperCase()}</span>
                        <span className="font-medium truncate">{c.name}</span>
                        {c.user_id && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" aria-label="Tem conta própria" />}
                        {!c.active && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">Inativo</span>}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[220px]">{c.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.last_appointment_at ? formatDate(c.last_appointment_at) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.next_appointment_at ? formatDate(c.next_appointment_at) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => router.push(`/clientes/${c.id}`)} title="Ver cliente" aria-label={`Ver ficha de ${c.name}`} className="p-1.5 rounded-lg hover:bg-muted">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => { setEditando(c as unknown as Tables<"clients">); setFormAberto(true); }} title="Editar" aria-label={`Editar ${c.name}`} className="p-1.5 rounded-lg hover:bg-muted">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => setExcluindo(c)} title="Excluir" aria-label={`Excluir ${c.name}`} className="p-1.5 rounded-lg hover:bg-muted">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile: cada linha vira um cartão compacto */}
          <div className="md:hidden space-y-2">
            {clientes.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => router.push(`/clientes/${c.id}`)} className="min-w-0 text-left">
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        {c.name}
                        {c.user_id && <ShieldCheck className="w-3 h-3 text-primary shrink-0" aria-label="Tem conta própria" />}
                        {!c.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">Inativo</span>}
                      </p>
                      {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {c.phone}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Último atendimento: {c.last_appointment_at ? formatDate(c.last_appointment_at) : "—"}
                      </p>
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditando(c as unknown as Tables<"clients">); setFormAberto(true); }} title="Editar" aria-label={`Editar ${c.name}`} className="p-1.5 rounded-lg hover:bg-muted">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => setExcluindo(c)} title="Excluir" aria-label={`Excluir ${c.name}`} className="p-1.5 rounded-lg hover:bg-muted">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => router.push(`/clientes/${c.id}`)}>Ver cliente</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <PaginationBar page={pagina} pageSize={PAGE_SIZE} total={total} onPageChange={setPagina} />
        </>
      )}

      <ClienteFormDialog
        open={formAberto}
        onOpenChange={(o) => { setFormAberto(o); if (!o) setEditando(null); }}
        companyId={companyId}
        cliente={editando}
      />

      <ConfirmDeleteDialog
        open={!!excluindo}
        title="Excluir cliente?"
        description={
          excluindo
            ? `"${excluindo.name}" deixará de aparecer na sua lista de clientes ativos. O histórico de agendamentos, anamnese e pacotes desse cliente é preservado — nada é apagado.`
            : ""
        }
        loading={excluindoLoading}
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}

function EstadoVazio({ onNovo }: { onNovo: () => void }) {
  return (
    <Card>
      <CardContent className="py-20 text-center">
        <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="font-medium">Você ainda não possui clientes.</p>
        <Button onClick={onNovo} className="gap-2 mt-4">
          <Plus className="w-4 h-4" /> Adicionar cliente
        </Button>
      </CardContent>
    </Card>
  );
}

function TabelaSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <Skeleton className="h-4 flex-1 max-w-[180px]" />
          <Skeleton className="h-4 flex-1 max-w-[120px] hidden sm:block" />
          <Skeleton className="h-4 flex-1 max-w-[160px] hidden md:block" />
          <Skeleton className="h-4 w-20 hidden lg:block" />
        </div>
      ))}
    </Card>
  );
}
