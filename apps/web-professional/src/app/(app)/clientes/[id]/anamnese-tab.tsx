"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Lock, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

type Resposta = Tables<"anamnesis_responses"> & {
  anamnesis_response_answers: { value: unknown; field_id: string; field_label_snapshot: string | null; field_type_snapshot: string | null }[];
};

/**
 * Aba "Anamnese" da ficha do cliente — mesma arquitetura já existente
 * (formulário dinâmico definido pela empresa em `anamnesis_fields`,
 * salvo via RPC `submit_anamnesis_response`), só que embutida na ficha
 * como aba, não mais um dialog separado. `anamnesisEnabled` já vem
 * calculado via `company_has_feature` (considera o plano, não só o
 * campo manual) — se a empresa não tem o recurso, mostra aviso e não
 * consulta nem formulário nem respostas.
 */
export function AnamneseTab({ companyId, clientId, anamnesisEnabled }: { companyId: string; clientId: string; anamnesisEnabled: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [respostas, setRespostas] = useState<Record<string, unknown>>({});
  const [salvando, setSalvando] = useState(false);

  // Fichas ativas da empresa — uma por segmento de atuação. Com mais de
  // uma, o profissional escolhe qual preencher (nunca é escolhida ao acaso).
  const { data: formularios = [] } = useQuery({
    queryKey: ["anamnesis-forms", companyId],
    enabled: anamnesisEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis_forms")
        .select("*, segments(name)")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("created_at");
      if (error) throw error;
      return data as unknown as (Tables<"anamnesis_forms"> & { segments: { name: string } | null })[];
    },
  });
  // Serviço do atendimento: define a ficha automaticamente (services.anamnesis_form_id).
  // Padrão = serviço do próximo atendimento marcado do cliente; dá pra trocar.
  const { data: servicos = [] } = useQuery({
    queryKey: ["anamnesis-services", companyId],
    enabled: anamnesisEnabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id, name, anamnesis_form_id").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
  const { data: proximoAtendimento } = useQuery({
    queryKey: ["anamnesis-next-appointment", clientId],
    enabled: anamnesisEnabled,
    queryFn: async () => {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("appointments")
        .select("service_id")
        .eq("client_id", clientId)
        .in("status", ["scheduled", "in_progress"])
        .gte("scheduled_at", inicioHoje.toISOString())
        .order("scheduled_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [servicoEscolhido, setServicoEscolhido] = useState<string | null>(null); // "" = "nenhum" escolhido de propósito
  const [formIdManual, setFormIdManual] = useState<string | null>(null);
  const servicoId = servicoEscolhido ?? proximoAtendimento?.service_id ?? "";
  const servico = servicos.find((sv) => sv.id === servicoId) ?? null;
  const fichaDoServico = formularios.find((f) => f.id === servico?.anamnesis_form_id) ?? null;
  // Ordem: escolha manual > ficha do serviço > única ficha ativa. Com várias
  // fichas e nada que defina qual, NÃO escolhe — exige seleção.
  const formulario =
    formularios.find((f) => f.id === formIdManual) ?? fichaDoServico ?? (formularios.length === 1 ? formularios[0] : null);

  const { data: campos = [] } = useQuery({
    queryKey: ["anamnesis-fields", formulario?.id],
    enabled: anamnesisEnabled && !!formulario?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis_fields")
        .select("*")
        .eq("form_id", formulario!.id)
        .is("archived_at", null)
        .order("sort_order");
      if (error) throw error;
      return data as Tables<"anamnesis_fields">[];
    },
  });

  const { data: historico = [], isLoading: carregandoHistorico } = useQuery({
    queryKey: ["anamnesis-responses", clientId],
    enabled: anamnesisEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis_responses")
        .select("*, anamnesis_response_answers(value, field_id, field_label_snapshot, field_type_snapshot)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Resposta[];
    },
  });

  function valorTexto(valor: unknown, tipo: string) {
    if (valor == null) return "—";
    if (tipo === "boolean") return valor ? "Sim" : "Não";
    if (Array.isArray(valor)) return valor.join(", ");
    return String(valor);
  }

  async function salvar() {
    if (!formulario) return;
    const faltando = campos.find((c) => c.required && (respostas[c.id] == null || respostas[c.id] === ""));
    if (faltando) {
      toast({ title: `"${faltando.label}" é obrigatória`, variant: "destructive" });
      return;
    }
    setSalvando(true);
    const answers = Object.entries(respostas)
      .filter(([, v]) => v != null && v !== "")
      .map(([field_id, value]) => ({ field_id, value: value as never }));
    const { error } = await supabase.rpc("submit_anamnesis_response", { p_client_id: clientId, p_answers: answers, p_form_id: formulario.id, p_service_id: servicoId || undefined });
    setSalvando(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: friendlyError(error, "salvar a ficha de anamnese"), variant: "destructive" });
      return;
    }
    setRespostas({});
    qc.invalidateQueries({ queryKey: ["anamnesis-responses", clientId] });
    qc.invalidateQueries({ queryKey: ["client-anamnesis-count", clientId] });
    toast({ title: "Ficha salva" });
  }

  if (!anamnesisEnabled) {
    return (
      <Card className="mt-3">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Lock className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">Anamnese não disponível no seu plano</p>
          <p className="text-sm mt-1">Fale com o suporte pra saber como liberar esse recurso.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-3 space-y-5">
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold flex items-center gap-1.5 mb-3"><ClipboardList className="w-4 h-4" /> Nova ficha</p>
          {servicos.length > 0 && formularios.length > 1 && (
            <div className="mb-3">
              <Label>Serviço do atendimento</Label>
              <Select value={servicoId || "__nenhum__"} onValueChange={(v) => { setServicoEscolhido(v === "__nenhum__" ? "" : v); setFormIdManual(null); setRespostas({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__nenhum__">Nenhum / outro</SelectItem>
                  {servicos.map((sv) => <SelectItem key={sv.id} value={sv.id}>{sv.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {fichaDoServico && !formIdManual && (
                <p className="text-xs text-muted-foreground mt-1">Ficha definida pelo serviço: {fichaDoServico.segments?.name ?? fichaDoServico.title}.</p>
              )}
            </div>
          )}
          {formularios.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {formularios.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setFormIdManual(f.id); setRespostas({}); }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    formulario?.id === f.id ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.segments?.name ?? f.title}
                </button>
              ))}
            </div>
          )}
          {!formulario ? (
            <p className="text-sm text-muted-foreground py-4">
              {formularios.length > 1 ? "Selecione a ficha a preencher (o serviço escolhido não tem ficha vinculada)." : "Nenhuma ficha de anamnese ativa. Ative em Configurações > Anamnese."}
            </p>
          ) : campos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma pergunta configurada ainda em Configurações &gt; Anamnese.</p>
          ) : (
            <div className="space-y-3">
              {campos.map((c) => (
                <div key={c.id}>
                  <Label>{c.label}{c.required && <span className="text-destructive"> *</span>}</Label>
                  {c.field_type === "text" && <Input value={(respostas[c.id] as string) || ""} onChange={(e) => setRespostas({ ...respostas, [c.id]: e.target.value })} />}
                  {c.field_type === "textarea" && <Textarea rows={2} value={(respostas[c.id] as string) || ""} onChange={(e) => setRespostas({ ...respostas, [c.id]: e.target.value })} />}
                  {c.field_type === "number" && <Input type="number" value={(respostas[c.id] as string) || ""} onChange={(e) => setRespostas({ ...respostas, [c.id]: e.target.value })} />}
                  {c.field_type === "date" && <Input type="date" value={(respostas[c.id] as string) || ""} onChange={(e) => setRespostas({ ...respostas, [c.id]: e.target.value })} />}
                  {c.field_type === "boolean" && (
                    <div className="flex items-center gap-2 mt-1">
                      <Switch checked={!!respostas[c.id]} onCheckedChange={(v) => setRespostas({ ...respostas, [c.id]: v })} />
                      <span className="text-sm text-muted-foreground">{respostas[c.id] ? "Sim" : "Não"}</span>
                    </div>
                  )}
                  {c.field_type === "single_choice" && (
                    <Select value={(respostas[c.id] as string) || ""} onValueChange={(v) => setRespostas({ ...respostas, [c.id]: v })}>
                      <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                      <SelectContent>{((c.options as string[]) || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {c.field_type === "multiple_choice" && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {((c.options as string[]) || []).map((o) => {
                        const atual = (respostas[c.id] as string[]) || [];
                        return (
                          <label key={o} className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-2 py-1 cursor-pointer">
                            <Checkbox checked={atual.includes(o)} onCheckedChange={() => setRespostas({ ...respostas, [c.id]: atual.includes(o) ? atual.filter((x) => x !== o) : [...atual, o] })} />
                            {o}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              <Button onClick={salvar} disabled={salvando} className="gap-2">
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar ficha
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-2"><History className="w-4 h-4" /> Histórico de fichas</p>
        {carregandoHistorico ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ficha preenchida ainda.</p>
        ) : (
          <div className="space-y-2">
            {historico.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3.5">
                  <p className="text-xs text-muted-foreground mb-1.5">{formatDateTime(r.created_at)}</p>
                  {r.anamnesis_response_answers.map((a) => {
                    // rótulo/tipo congelados no envio (`field_*_snapshot`) — editar ou
                    // arquivar a pergunta depois não reescreve o histórico
                    const label = a.field_label_snapshot ?? campos.find((c) => c.id === a.field_id)?.label;
                    if (!label) return null;
                    const tipo = a.field_type_snapshot ?? campos.find((c) => c.id === a.field_id)?.field_type ?? "text";
                    return (
                      <p key={a.field_id} className="text-sm">
                        <span className="text-muted-foreground">{label}:</span> {valorTexto(a.value, tipo)}
                      </p>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
