"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Inbox, Loader2, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { SUPPORT_CATEGORIES as CATEGORIAS, supportProtocol } from "@/lib/support";

export function SuporteView({ companyId, userEmail, assuntoInicial = "", categoriaInicial = "" }: { companyId: string; userEmail: string; assuntoInicial?: string; categoriaInicial?: string }) {
  const [assunto, setAssunto] = useState(assuntoInicial);
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [mensagem, setMensagem] = useState("");
  const [erros, setErros] = useState<{ assunto?: string; categoria?: string; mensagem?: string }>({});
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const travado = useRef(false); // impede duplo envio mesmo antes do re-render

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (travado.current) return;
    const novosErros: typeof erros = {};
    if (!assunto.trim()) novosErros.assunto = "Informe o assunto.";
    if (!categoria) novosErros.categoria = "Escolha uma categoria.";
    if (!mensagem.trim()) novosErros.mensagem = "Descreva sua solicitação.";
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    travado.current = true;
    setEnviando(true);
    setErroEnvio("");
    const { data, error } = await createClient().functions.invoke("create-support-ticket", {
      body: { subject: assunto.trim(), category: categoria, message: mensagem.trim(), company_id: companyId },
    });
    setEnviando(false);
    if (error) {
      travado.current = false;
      console.error("[suporte] envio falhou", error.message);
      setErroEnvio("Não foi possível enviar sua solicitação. Tente novamente em instantes.");
      return;
    }
    setProtocolo(typeof data?.ticket_id === "string" ? supportProtocol(data.ticket_id) : null);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardContent className="p-6 sm:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="font-heading text-2xl font-semibold">Solicitação enviada!</h1>
            <p className="text-muted-foreground mt-2">Recebemos sua solicitação e nossa equipe irá analisar o problema.</p>
            {protocolo && (
              <p className="mt-4 text-sm">Protocolo: <span data-testid="protocolo" className="font-mono font-semibold tracking-wider">{protocolo}</span></p>
            )}
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm font-semibold">
              <Clock className="w-4 h-4 text-primary" /> SLA de resposta: até 24 horas.
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Você receberá nossa resposta pelo e-mail cadastrado{userEmail ? <> (<span className="font-medium text-foreground">{userEmail}</span>)</> : null}.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild className="gap-2">
                <Link href="/suporte/solicitacoes"><Inbox className="w-4 h-4" /> Ver minhas solicitações</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/suporte">Voltar à Central de Ajuda</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold">Falar com o suporte</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie sua solicitação para nossa equipe. Respondemos em até 24 horas pelo e-mail cadastrado.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={enviar} className="space-y-5" noValidate>
            {erroEnvio && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{erroEnvio}</div>}

            <div className="space-y-1.5">
              <Label htmlFor="assunto">Assunto *</Label>
              <Input
                id="assunto"
                value={assunto}
                maxLength={150}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Ex.: Problema com meu agendamento"
                aria-invalid={!!erros.assunto}
                className="h-11"
              />
              {erros.assunto && <p className="text-xs text-destructive">{erros.assunto}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger id="categoria" className="h-11" aria-invalid={!!erros.categoria}>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erros.categoria && <p className="text-xs text-destructive">{erros.categoria}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mensagem">Mensagem *</Label>
              <Textarea
                id="mensagem"
                value={mensagem}
                maxLength={5000}
                onChange={(e) => setMensagem(e.target.value)}
                rows={8}
                placeholder="Conte para nós o que está acontecendo..."
                aria-invalid={!!erros.mensagem}
              />
              {erros.mensagem && <p className="text-xs text-destructive">{erros.mensagem}</p>}
            </div>

            <p className="text-xs text-muted-foreground">
              Os dados da sua empresa e da sua conta são enviados automaticamente junto com a solicitação.
            </p>

            <Button type="submit" className="w-full sm:w-auto h-11 gap-2" disabled={enviando}>
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {enviando ? "Enviando..." : "Enviar solicitação"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
