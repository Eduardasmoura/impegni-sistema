"use client";

// Comunicação = avisos pra base de empresas (manutenção, novidade, aviso de
// cobrança etc). Todo aviso nasce rascunho; "Enviar para o painel" muda para
// status 'sent' e ele passa a aparecer nas Notificações (sino) do painel das
// empresas do público escolhido — entrega feita pelas funções
// get_my_notifications/mark_notification_read (migration 20260925000000).
// Não há e-mail/SMS/push: "Copiar texto" continua pra outros canais.
import { useState } from "react";
import { Plus, Megaphone, Copy, Check, Send, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const AUDIENCE_LABEL: Record<string, string> = { all: "Todas as empresas", plan: "Por plano", segment: "Por segmento", status: "Por status de assinatura", company: "Uma empresa específica" };
const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = { trial: "Em teste", active: "Ativa", past_due: "Pagamento pendente", suspended: "Suspensa", canceled: "Cancelada", expired: "Expirada" };

type AnnouncementRow = Tables<"platform_announcements"> & {
  plans: { id: string; name: string } | null; segments: { id: string; name: string } | null; companies: { id: string; name: string } | null;
};

const NOVO: { title: string; message: string; audience_type: string; audience_plan_id: string; audience_segment_id: string; audience_status: string; audience_company_id: string } = {
  title: "", message: "", audience_type: "all", audience_plan_id: "", audience_segment_id: "", audience_status: "", audience_company_id: "",
};

export function ComunicacaoView({ announcements: initial, plans, segments, companies, loadError, currentUserId }: {
  announcements: AnnouncementRow[]; plans: { id: string; name: string }[]; segments: { id: string; name: string }[]; companies: { id: string; name: string }[];
  loadError?: string; currentUserId: string;
}) {
  const { toast } = useToast();
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState(initial);
  const [novo, setNovo] = useState(NOVO);
  const [criando, setCriando] = useState(false);
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function audienciaResumo(a: AnnouncementRow) {
    if (a.audience_type === "plan") return `Plano: ${a.plans?.name ?? "—"}`;
    if (a.audience_type === "segment") return `Segmento: ${a.segments?.name ?? "—"}`;
    if (a.audience_type === "status") return `Status: ${SUBSCRIPTION_STATUS_LABEL[a.audience_status ?? ""] ?? a.audience_status}`;
    if (a.audience_type === "company") return `Empresa: ${a.companies?.name ?? "—"}`;
    return "Todas as empresas";
  }

  async function criarAviso() {
    if (!novo.title.trim() || !novo.message.trim()) {
      toast({ title: "Preencha título e mensagem", variant: "destructive" });
      return;
    }
    if (novo.audience_type === "plan" && !novo.audience_plan_id) return toast({ title: "Selecione o plano", variant: "destructive" });
    if (novo.audience_type === "segment" && !novo.audience_segment_id) return toast({ title: "Selecione o segmento", variant: "destructive" });
    if (novo.audience_type === "status" && !novo.audience_status) return toast({ title: "Selecione o status", variant: "destructive" });
    if (novo.audience_type === "company" && !novo.audience_company_id) return toast({ title: "Selecione a empresa", variant: "destructive" });

    setCriando(true);
    const { data, error } = await supabase
      .from("platform_announcements")
      .insert({
        title: novo.title.trim(), message: novo.message.trim(), audience_type: novo.audience_type, created_by: currentUserId,
        audience_plan_id: novo.audience_type === "plan" ? novo.audience_plan_id : null,
        audience_segment_id: novo.audience_type === "segment" ? novo.audience_segment_id : null,
        audience_status: novo.audience_type === "status" ? novo.audience_status : null,
        audience_company_id: novo.audience_type === "company" ? novo.audience_company_id : null,
      })
      .select("*, plans:audience_plan_id(id, name), segments:audience_segment_id(id, name), companies:audience_company_id(id, name)")
      .single();
    setCriando(false);
    if (error || !data) {
      toast({ title: "Erro ao criar aviso", description: error?.message, variant: "destructive" });
      return;
    }
    setAnnouncements((prev) => [data, ...prev]);
    setNovo(NOVO);
    setOpen(false);
    toast({ title: "Rascunho criado" });
  }

  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  async function enviarParaPainel(a: AnnouncementRow) {
    if (!window.confirm(`Enviar "${a.title}" para o painel de: ${audienciaResumo(a)}?`)) return;
    setEnviandoId(a.id);
    const { data, error } = await supabase
      .from("platform_announcements")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", a.id)
      .eq("status", "draft")
      .select("*, plans:audience_plan_id(id, name), segments:audience_segment_id(id, name), companies:audience_company_id(id, name)")
      .single();
    setEnviandoId(null);
    if (error || !data) {
      console.error("[comunicacao] envio falhou", error?.message);
      toast({ title: "Não foi possível enviar o aviso", description: "Tente novamente.", variant: "destructive" });
      return;
    }
    setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? data : x)));
    toast({ title: "Aviso enviado", description: "Ele já aparece nas Notificações do painel das empresas do público escolhido." });
  }

  function copiarTexto(a: AnnouncementRow) {
    navigator.clipboard.writeText(`${a.title}\n\n${a.message}`);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Comunicação</h1>
          <p className="text-sm text-muted-foreground">Avisos para as Notificações do painel das empresas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> Novo aviso</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo aviso</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Título</Label><Input value={novo.title} onChange={(e) => setNovo({ ...novo, title: e.target.value })} placeholder="Ex: Manutenção programada" /></div>
              <div className="space-y-1.5"><Label>Mensagem</Label><Textarea value={novo.message} onChange={(e) => setNovo({ ...novo, message: e.target.value })} rows={5} /></div>
              <div className="space-y-1.5">
                <Label>Público-alvo</Label>
                <Select value={novo.audience_type} onValueChange={(v) => setNovo({ ...NOVO, title: novo.title, message: novo.message, audience_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(AUDIENCE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {novo.audience_type === "plan" && (
                <Select value={novo.audience_plan_id} onValueChange={(v) => setNovo({ ...novo, audience_plan_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                  <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {novo.audience_type === "segment" && (
                <Select value={novo.audience_segment_id} onValueChange={(v) => setNovo({ ...novo, audience_segment_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                  <SelectContent>{segments.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {novo.audience_type === "status" && (
                <Select value={novo.audience_status} onValueChange={(v) => setNovo({ ...novo, audience_status: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                  <SelectContent>{Object.entries(SUBSCRIPTION_STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {novo.audience_type === "company" && (
                <Select value={novo.audience_company_id} onValueChange={(v) => setNovo({ ...novo, audience_company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter><Button onClick={criarAviso} disabled={criando}>Salvar rascunho</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        Todo aviso nasce como rascunho. Use &quot;Enviar para o painel&quot; para ele aparecer nas Notificações (sino) do painel das empresas do público escolhido. Não há envio por e-mail/SMS — &quot;Copiar texto&quot; serve para outros canais.
      </div>

      {loadError && <Card className="mb-4 border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Erro ao carregar avisos: {loadError}</CardContent></Card>}

      <div className="space-y-2">
        {announcements.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {a.status === "sent" ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">Enviado{a.sent_at ? ` em ${formatDateTime(a.sent_at)}` : ""}</span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">Rascunho</span>
                )}
                <span className="text-xs text-muted-foreground">{audienciaResumo(a)}</span>
                <span className="text-xs text-muted-foreground ml-auto">{formatDateTime(a.created_at)}</span>
              </div>
              <p className="font-medium">{a.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{a.message}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {a.status === "draft" && (
                  <Button size="sm" onClick={() => enviarParaPainel(a)} disabled={enviandoId === a.id}>
                    {enviandoId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Enviar para o painel
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => copiarTexto(a)}>
                  {copiedId === a.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === a.id ? "Copiado" : "Copiar texto"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {announcements.length === 0 && !loadError && (
          <Card><CardContent className="py-16 text-center text-muted-foreground"><Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />Nenhum aviso criado ainda.</CardContent></Card>
        )}
      </div>
    </main>
  );
}
