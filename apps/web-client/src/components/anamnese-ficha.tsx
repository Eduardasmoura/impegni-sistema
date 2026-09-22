"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, History, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Campo = Tables<"anamnesis_fields">;
type Resposta = Tables<"anamnesis_responses"> & {
  anamnesis_response_answers: { value: unknown; field_id: string; field_label_snapshot: string | null; field_type_snapshot: string | null }[];
};

/**
 * Ficha de anamnese preenchida pelo próprio cliente (web-client). O
 * formulário é o mesmo configurado pela empresa no painel profissional
 * (`anamnesis_fields`); no plano Básico são as 5 perguntas padrão,
 * semeadas pelo banco e não editáveis. Cada envio cria uma linha nova em
 * `anamnesis_responses` via a RPC `submit_anamnesis_response_as_client` —
 * histórico nunca é sobrescrito, só cresce.
 */
export function AnamneseFicha({
  companyId,
  companyName,
  appointmentId,
  serviceId,
}: {
  companyId: string;
  companyName: string;
  /** atendimento de onde o cliente abriu a ficha (define o serviço) */
  appointmentId?: string;
  serviceId?: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [respostas, setRespostas] = useState<Record<string, unknown>>({});
  const [salvando, setSalvando] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Uma ficha por segmento de atuação da empresa (Cílios, Unhas...). Com mais
  // de uma, o cliente escolhe qual preencher — nunca é escolhida ao acaso.
  const { data: formularios = [], isLoading: carregandoForm } = useQuery({
    queryKey: ["anamnese-forms", companyId],
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
  const [formIdSelecionado, setFormIdSelecionado] = useState<string | null>(null);

  // Sem atendimento informado, usa o próximo atendimento marcado do cliente
  // nesta empresa (RLS só devolve os agendamentos dele).
  const { data: proximo } = useQuery({
    queryKey: ["anamnese-proximo-atendimento", companyId],
    enabled: !appointmentId,
    queryFn: async () => {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("appointments")
        .select("id, service_id")
        .eq("company_id", companyId)
        .in("status", ["scheduled", "in_progress"])
        .gte("scheduled_at", inicioHoje.toISOString())
        .order("scheduled_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const atendimentoId = appointmentId ?? proximo?.id ?? null;
  const servicoId = serviceId ?? proximo?.service_id ?? null;

  const { data: servicoFicha } = useQuery({
    queryKey: ["anamnese-servico-ficha", servicoId],
    enabled: !!servicoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("anamnesis_form_id").eq("id", servicoId!).maybeSingle();
      if (error) throw error;
      return data?.anamnesis_form_id ?? null;
    },
  });

  // Ordem: ficha vinculada ao serviço do atendimento (sem escolha do cliente) >
  // escolha manual > única ficha ativa. Várias fichas e nada que defina qual →
  // o cliente escolhe; nunca é sorteada. O servidor aplica a mesma regra.
  const fichaDoServico = formularios.find((f) => f.id === servicoFicha) ?? null;
  const formulario =
    fichaDoServico ?? formularios.find((f) => f.id === formIdSelecionado) ?? (formularios.length === 1 ? formularios[0] : null);

  const { data: campos = [], isLoading: carregandoCampos } = useQuery({
    queryKey: ["anamnese-fields", formulario?.id],
    enabled: !!formulario?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis_fields")
        .select("*")
        .eq("form_id", formulario!.id)
        .is("archived_at", null)
        .order("sort_order");
      if (error) throw error;
      return data as Campo[];
    },
  });

  const { data: historico = [], isLoading: carregandoHistorico } = useQuery({
    queryKey: ["anamnese-historico", companyId],
    enabled: mostrarHistorico,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis_responses")
        .select("*, anamnesis_response_answers(value, field_id, field_label_snapshot, field_type_snapshot)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Resposta[];
    },
  });

  const ultimoEnvio = historico[0]?.created_at ?? null;

  function setValor(id: string, value: unknown) {
    setRespostas((r) => ({ ...r, [id]: value }));
  }

  function valorTexto(valor: unknown, tipo: string) {
    if (valor == null || valor === "") return "—";
    if (tipo === "boolean") return valor ? "Sim" : "Não";
    if (Array.isArray(valor)) return valor.join(", ");
    return String(valor);
  }

  async function enviar() {
    if (!formulario) return;
    const faltando = campos.find((c) => c.required && (respostas[c.id] == null || respostas[c.id] === ""));
    if (faltando) {
      toast({ title: `"${faltando.label}" é obrigatória`, variant: "destructive" });
      return;
    }
    setSalvando(true);
    const answers = Object.entries(respostas)
      .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
      .map(([field_id, value]) => ({ field_id, value }));
    const { error } = await supabase.rpc("submit_anamnesis_response_as_client", {
      p_company_id: companyId,
      p_answers: answers as never,
      p_form_id: formulario.id,
      p_appointment_id: atendimentoId ?? undefined,
    });
    setSalvando(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    setRespostas({});
    qc.invalidateQueries({ queryKey: ["anamnese-historico", companyId] });
    toast({ title: "Ficha enviada!", description: `${companyName} vai ver suas respostas no seu cadastro.` });
    setMostrarHistorico(true);
  }

  const carregando = carregandoForm || (!!formulario && carregandoCampos);

  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando ficha...
      </div>
    );
  }

  if (formularios.length === 0 || (formulario && campos.length === 0)) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        {companyName} ainda não disponibilizou uma ficha de anamnese.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {ultimoEnvio && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
          Última ficha enviada em {formatDateTime(ultimoEnvio)}. Você pode enviar uma atualizada abaixo.
        </div>
      )}

      {fichaDoServico && (
        <p className="text-xs text-muted-foreground">
          Ficha do seu atendimento: <strong className="text-foreground">{fichaDoServico.segments?.name ?? fichaDoServico.title}</strong>.
        </p>
      )}
      {formularios.length > 1 && !fichaDoServico && (
        <div className="flex flex-wrap gap-2">
          {formularios.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setFormIdSelecionado(f.id); setRespostas({}); }}
              className={cn(
                "px-4 py-2 rounded-full text-sm border transition-colors",
                formulario?.id === f.id ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 text-primary hover:bg-primary/10",
              )}
            >
              {f.segments?.name ?? f.title}
            </button>
          ))}
        </div>
      )}

      {!formulario ? (
        <p className="text-sm text-muted-foreground">Escolha acima qual ficha você quer preencher.</p>
      ) : (
        <>
          <div className="space-y-3">
            {campos.map((c) => (
              <CampoAnamnese key={c.id} campo={c} valor={respostas[c.id]} onChange={(v) => setValor(c.id, v)} />
            ))}
          </div>

          <Button onClick={enviar} disabled={salvando} className="gap-2 w-full sm:w-auto">
            <ClipboardList className="w-4 h-4" /> {salvando ? "Enviando..." : "Enviar ficha"}
          </Button>
        </>
      )}

      <button
        type="button"
        onClick={() => setMostrarHistorico((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <History className="w-3.5 h-3.5" /> {mostrarHistorico ? "Ocultar histórico" : "Ver fichas anteriores"}
      </button>

      {mostrarHistorico && (
        <div className="space-y-3 border-t border-border pt-3">
          {carregandoHistorico ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : historico.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhuma ficha enviada ainda.</p>
          ) : (
            historico.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1.5">{formatDateTime(r.created_at)}</p>
                {r.anamnesis_response_answers.map((a) => {
                  // rótulo/tipo congelados no envio — mudar a ficha depois não reescreve o histórico
                  const label = a.field_label_snapshot ?? campos.find((c) => c.id === a.field_id)?.label;
                  if (!label) return null;
                  const tipo = a.field_type_snapshot ?? campos.find((c) => c.id === a.field_id)?.field_type ?? "text";
                  return (
                    <p key={a.field_id} className="text-sm">
                      <span className="text-muted-foreground">{label}:</span> {valorTexto(a.value, tipo)}
                    </p>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CampoAnamnese({ campo, valor, onChange }: { campo: Campo; valor: unknown; onChange: (v: unknown) => void }) {
  const opcoes = useMemo(() => (Array.isArray(campo.options) ? (campo.options as string[]) : []), [campo.options]);
  const selecionadas = Array.isArray(valor) ? (valor as string[]) : [];

  return (
    <div>
      <label className="text-sm font-medium">
        {campo.label}
        {campo.required && <span className="text-destructive"> *</span>}
      </label>
      <div className="mt-1">
        {campo.field_type === "text" && (
          <Input value={(valor as string) || ""} onChange={(e) => onChange(e.target.value)} />
        )}
        {campo.field_type === "textarea" && (
          <Textarea rows={3} value={(valor as string) || ""} onChange={(e) => onChange(e.target.value)} />
        )}
        {campo.field_type === "number" && (
          <Input type="number" value={(valor as string) || ""} onChange={(e) => onChange(e.target.value)} />
        )}
        {campo.field_type === "date" && (
          <Input type="date" value={(valor as string) || ""} onChange={(e) => onChange(e.target.value)} />
        )}
        {campo.field_type === "boolean" && (
          <div className="flex gap-2">
            {[
              { v: true, label: "Sim" },
              { v: false, label: "Não" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => onChange(o.v)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm border transition-colors",
                  valor === o.v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-primary/40 text-primary hover:bg-primary/10",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        {campo.field_type === "single_choice" && (
          <div className="flex flex-wrap gap-2">
            {opcoes.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onChange(o)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm border transition-colors",
                  valor === o
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-primary/40 text-primary hover:bg-primary/10",
                )}
              >
                {o}
              </button>
            ))}
          </div>
        )}
        {campo.field_type === "multiple_choice" && (
          <div className="flex flex-wrap gap-2">
            {opcoes.map((o) => {
              const marcada = selecionadas.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => onChange(marcada ? selecionadas.filter((x) => x !== o) : [...selecionadas, o])}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm border transition-colors",
                    marcada
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-primary/40 text-primary hover:bg-primary/10",
                  )}
                >
                  {o}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
