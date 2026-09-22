"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquareText, Send, EyeOff, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  professional_id: string;
  clients: { name: string } | null;
  professionals: { name: string } | null;
  services: { name: string } | null;
};

export function AvaliacoesView({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [filtroNota, setFiltroNota] = useState("all");
  const [filtroProfissionalId, setFiltroProfissionalId] = useState("all");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);

  const { data: avaliacoes = [], isLoading, isError } = useQuery({
    queryKey: ["reviews", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, status, response, responded_at, created_at, professional_id, clients(name), professionals(name), services(name)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReviewRow[];
    },
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("id, name").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const filtradas = useMemo(
    () =>
      avaliacoes.filter(
        (a) =>
          (filtroNota === "all" || a.rating === Number(filtroNota)) &&
          (filtroProfissionalId === "all" || a.professional_id === filtroProfissionalId)
      ),
    [avaliacoes, filtroNota, filtroProfissionalId]
  );

  const media = avaliacoes.length > 0 ? avaliacoes.reduce((s, a) => s + a.rating, 0) / avaliacoes.length : 0;

  async function enviarResposta(review: ReviewRow) {
    const texto = respostas[review.id]?.trim();
    if (!texto) return;
    setEnviando(review.id);
    const { error } = await supabase.from("reviews").update({ response: texto, responded_at: new Date().toISOString() }).eq("id", review.id);
    setEnviando(null);
    if (error) {
      toast({ title: "Erro ao responder", description: friendlyError(error, "enviar a resposta"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["reviews", companyId] });
    toast({ title: "Resposta enviada" });
  }

  async function alternarVisibilidade(review: ReviewRow) {
    const novoStatus = review.status === "published" ? "hidden" : "published";
    const { error } = await supabase.from("reviews").update({ status: novoStatus }).eq("id", review.id);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "atualizar a avaliação"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["reviews", companyId] });
    toast({ title: novoStatus === "hidden" ? "Avaliação ocultada" : "Avaliação publicada de novo" });
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Avaliações</h1>
          <p className="text-sm text-muted-foreground">O que seus clientes estão dizendo</p>
        </div>
        {avaliacoes.length > 0 && (
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="font-heading text-lg font-bold">{media.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({avaliacoes.length})</span>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Select value={filtroNota} onValueChange={setFiltroNota}>
          <SelectTrigger><SelectValue placeholder="Todas as notas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as notas</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} estrela{n > 1 ? "s" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroProfissionalId} onValueChange={setFiltroProfissionalId}>
          <SelectTrigger><SelectValue placeholder="Todos os profissionais" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {profissionais.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState text="Carregando avaliações..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar as avaliações." />
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <MessageSquareText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhuma avaliação por aqui ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map((a) => (
            <Card key={a.id} className={cn(a.status === "hidden" && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("w-3.5 h-3.5", n <= a.rating ? "fill-primary text-primary" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                    <p className="text-sm font-medium mt-1">{a.clients?.name || "Cliente"} · {a.services?.name}</p>
                    <p className="text-xs text-muted-foreground">{a.professionals?.name} · {formatDate(a.created_at)}{a.status === "hidden" && " · oculta"}</p>
                  </div>
                  <button
                    onClick={() => alternarVisibilidade(a)}
                    title={a.status === "hidden" ? "Publicar de novo" : "Ocultar avaliação"}
                    aria-label={a.status === "hidden" ? "Publicar de novo" : "Ocultar avaliação"}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0"
                  >
                    {a.status === "hidden" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {a.comment && <p className="text-sm mt-3">{a.comment}</p>}

                {a.response ? (
                  <div className="mt-3 pl-3 border-l-2 border-primary/40">
                    <p className="text-xs font-medium text-primary">Sua resposta</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{a.response}</p>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      rows={1}
                      placeholder="Responder essa avaliação..."
                      value={respostas[a.id] || ""}
                      onChange={(e) => setRespostas({ ...respostas, [a.id]: e.target.value })}
                      className="text-sm min-h-0"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      disabled={!respostas[a.id]?.trim() || enviando === a.id}
                      onClick={() => enviarResposta(a)}
                    >
                      <Send className="w-3.5 h-3.5" /> Responder
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
