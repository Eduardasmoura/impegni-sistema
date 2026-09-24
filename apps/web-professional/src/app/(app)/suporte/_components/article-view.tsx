"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Lightbulb, Check, ListOrdered, BookOpenText, MessageSquarePlus, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { supportCategoryFromHelp } from "@/lib/support";
import type { HelpArticle, HelpCategory } from "@/lib/help";
import { ArticleRow } from "./article-card";

// Progresso do passo a passo é conveniência local (por navegador): nada
// depende disso, então falha de storage só desliga o "Concluído".
function lerFeitos(slug: string): number[] {
  try { return JSON.parse(localStorage.getItem(`help:done:${slug}`) || "[]"); } catch { return []; }
}
function gravarFeitos(slug: string, v: number[]) {
  try { localStorage.setItem(`help:done:${slug}`, JSON.stringify(v)); } catch { /* sem storage */ }
}

export function ArticleView({ artigo, categoria, relacionados }: { artigo: HelpArticle; categoria: HelpCategory; relacionados: HelpArticle[] }) {
  const [modo, setModo] = useState<"ler" | "guia">("ler");
  const [passo, setPasso] = useState(0);
  const [feitos, setFeitos] = useState<number[]>([]);
  useEffect(() => setFeitos(lerFeitos(artigo.slug)), [artigo.slug]);

  const total = artigo.steps.length;
  const atual = artigo.steps[passo];
  const concluido = feitos.includes(passo);
  const progresso = Math.round((feitos.length / total) * 100);
  const suporteHref = `/suporte/solicitar?${new URLSearchParams({ categoria: supportCategoryFromHelp(artigo.category), assunto: `Dúvida: ${artigo.title}` }).toString()}`;

  function alternarConcluido() {
    const novo = concluido ? feitos.filter((i) => i !== passo) : [...feitos, passo];
    setFeitos(novo);
    gravarFeitos(artigo.slug, novo);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <article className="min-w-0">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap" aria-label="Você está em">
          <Link href="/suporte" className="hover:text-foreground">Central de Ajuda</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/suporte/categoria/${categoria.slug}`} className="hover:text-foreground">{categoria.title}</Link>
        </nav>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold mt-3 leading-tight">{artigo.title}</h1>
        <p className="text-muted-foreground mt-2">{artigo.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {artigo.readingMinutes} min de leitura</span>
          <span>Atualizado em {formatDate(artigo.updatedAt + "T12:00:00")}</span>
        </div>

        {/* Alternância leitura / passo a passo */}
        <div className="inline-flex gap-1 rounded-lg bg-muted p-1 mt-6" role="tablist" aria-label="Modo de leitura">
          {([["ler", "Ler tudo", BookOpenText], ["guia", "Passo a passo", ListOrdered]] as const).map(([k, label, Icon]) => (
            <button key={k} role="tab" aria-selected={modo === k} onClick={() => setModo(k)} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", modo === k ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {modo === "ler" ? (
          <ol className="mt-6 space-y-5">
            {artigo.steps.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0", feitos.includes(i) ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary")}>
                  {feitos.includes(i) ? <Check className="w-4 h-4" /> : i + 1}
                </span>
                <div className="min-w-0 pt-1">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
                  {s.href && (
                    <Link href={s.href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-2">
                      {s.cta ?? "Abrir"} <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Card className="mt-6 p-5 sm:p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Passo {passo + 1} de {total}</span>
              <span className="text-muted-foreground">{feitos.length} de {total} concluídos</span>
            </div>
            <div className="flex gap-1.5 mt-3" role="progressbar" aria-label="Progresso do passo a passo" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100}>
              {artigo.steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPasso(i)}
                  aria-label={`Ir para o passo ${i + 1}`}
                  className={cn("h-2 flex-1 rounded-full transition-colors", feitos.includes(i) ? "bg-emerald-500" : i === passo ? "bg-primary" : "bg-muted hover:bg-muted-foreground/20", i === passo && feitos.includes(i) && "ring-2 ring-primary/40 ring-offset-1")}
                />
              ))}
            </div>

            <p className="font-heading text-xl font-semibold mt-6">{atual.title}</p>
            <p className="text-muted-foreground mt-2 leading-relaxed">{atual.body}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              {atual.href && (
                <Button asChild variant="outline" className="gap-1.5">
                  <Link href={atual.href}>{atual.cta ?? "Abrir"} <ArrowUpRight className="w-4 h-4" /></Link>
                </Button>
              )}
              <Button variant={concluido ? "outline" : "default"} onClick={alternarConcluido} aria-pressed={concluido} className={cn("gap-1.5", concluido && "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100")}>
                <Check className="w-4 h-4" /> {concluido ? "Concluído" : "Marcar como concluído"}
              </Button>
            </div>
            <div className="flex items-center justify-between border-t border-border mt-6 pt-4">
              <Button variant="ghost" onClick={() => setPasso((p) => Math.max(0, p - 1))} disabled={passo === 0} className="gap-1"><ChevronLeft className="w-4 h-4" /> Anterior</Button>
              {passo < total - 1 ? (
                <Button onClick={() => setPasso((p) => p + 1)} className="gap-1">Próximo passo <ChevronRight className="w-4 h-4" /></Button>
              ) : (
                <span className="text-sm text-muted-foreground">Último passo</span>
              )}
            </div>
          </Card>
        )}

        {artigo.tips && artigo.tips.length > 0 && (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4">
            <p className="font-medium text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-600" /> Dicas importantes</p>
            <ul className="mt-2 space-y-1.5 text-sm text-foreground/80 list-disc pl-5">
              {artigo.tips.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        )}

        {artigo.faqs && artigo.faqs.length > 0 && (
          <section className="mt-8">
            <h2 className="font-heading text-lg font-semibold">Perguntas frequentes</h2>
            <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {artigo.faqs.map((f) => (
                <details key={f.q} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-medium text-sm">
                    {f.q}<ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                  </summary>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <Card className="mt-10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/40">
          <div className="flex-1">
            <p className="font-heading font-semibold">Ainda precisa de ajuda?</p>
            <p className="text-sm text-muted-foreground mt-0.5">Nossa equipe responde em até 24 horas, pelo e-mail cadastrado.</p>
          </div>
          <Button asChild className="gap-2 shrink-0"><Link href={suporteHref}><MessageSquarePlus className="w-4 h-4" /> Abrir solicitação de suporte</Link></Button>
        </Card>
      </article>

      {relacionados.length > 0 && (
        <aside className="lg:pt-24">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Nesta categoria</p>
          <Card className="divide-y divide-border overflow-hidden">
            {relacionados.map((a) => <ArticleRow key={a.id} article={a} compact />)}
          </Card>
        </aside>
      )}
    </div>
  );
}
