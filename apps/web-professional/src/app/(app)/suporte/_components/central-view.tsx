"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, BookOpen, MessageSquarePlus, Inbox, ArrowRight, X, SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCategories, getFeaturedArticles, searchArticles, countByCategory } from "@/lib/help";
import { CategoryIcon } from "./category-icon";
import { ArticleRow } from "./article-card";

const ATALHOS = [
  { href: "#categorias", titulo: "Central de Ajuda", texto: "Encontre respostas e veja passo a passo para utilizar o Impegni.", botao: "Ver tutoriais", icon: BookOpen },
  { href: "/suporte/solicitar", titulo: "Falar com o suporte", texto: "Não encontrou o que precisava? Envie uma mensagem para nossa equipe.", botao: "Abrir solicitação", icon: MessageSquarePlus },
  { href: "/suporte/solicitacoes", titulo: "Minhas solicitações", texto: "Acompanhe os chamados que você já enviou para nossa equipe.", botao: "Ver solicitações", icon: Inbox },
];

export function CentralView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [busca, setBusca] = useState(params.get("q") ?? "");
  const q = busca.trim();

  // Mantém a busca na URL (voltar do artigo reabre os mesmos resultados).
  useEffect(() => {
    const t = setTimeout(() => {
      const url = q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname;
      router.replace(url, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [q, pathname, router]);

  const resultados = useMemo(() => (q ? searchArticles(q) : []), [q]);
  const categorias = getCategories();
  const contagem = countByCategory();
  const destaques = getFeaturedArticles();

  return (
    <div>
      {/* Cabeçalho + busca */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-8 sm:px-10 sm:py-12">
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight">Central de Ajuda</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">Encontre respostas rápidas, veja passo a passo e fale com nossa equipe sempre que precisar.</p>
        <div className="relative mt-6 max-w-2xl">
          <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="O que você precisa saber?"
            aria-label="Buscar na Central de Ajuda"
            className="w-full h-12 sm:h-14 rounded-xl border border-input bg-card pl-12 pr-11 text-[15px] shadow-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          {busca && (
            <button onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {q ? (
        <section className="mt-8" aria-live="polite">
          {resultados.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Encontramos <strong className="text-foreground">{resultados.length}</strong> {resultados.length === 1 ? "resultado" : "resultados"} para “{q}”.
              </p>
              <Card className="divide-y divide-border overflow-hidden">
                {resultados.map((a) => <ArticleRow key={a.id} article={a} showCategory />)}
              </Card>
            </>
          ) : (
            <Card className="px-6 py-12 text-center">
              <SearchX className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p className="font-heading text-lg font-semibold mt-3">Não encontramos o que você procura.</p>
              <p className="text-sm text-muted-foreground mt-1">Tente outras palavras ou fale com a nossa equipe.</p>
              <Button asChild className="mt-5 gap-2">
                <Link href="/suporte/solicitar"><MessageSquarePlus className="w-4 h-4" /> Falar com suporte</Link>
              </Button>
            </Card>
          )}
        </section>
      ) : (
        <>
          {/* Três caminhos */}
          <section className="grid gap-3 sm:grid-cols-3 mt-6">
            {ATALHOS.map((c) => (
              <Card key={c.titulo} className="p-5 flex flex-col hover:border-primary/40 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><c.icon className="w-5 h-5 text-primary" /></div>
                <p className="font-heading font-semibold mt-4">{c.titulo}</p>
                <p className="text-sm text-muted-foreground mt-1 flex-1">{c.texto}</p>
                <Link href={c.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  {c.botao} <ArrowRight className="w-4 h-4" />
                </Link>
              </Card>
            ))}
          </section>

          {/* Categorias */}
          <section id="categorias" className="mt-10 scroll-mt-6">
            <h2 className="font-heading text-xl font-semibold">Navegue por assunto</h2>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {categorias.map((c) => (
                <Link key={c.slug} href={`/suporte/categoria/${c.slug}`} className="group rounded-xl border border-border bg-card p-4 flex items-start gap-3 hover:border-primary/40 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <CategoryIcon slug={c.slug} className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm flex items-center gap-2">
                      {c.title}
                      {c.status === "coming_soon" && <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-primary/10 text-primary px-2 py-0.5">Em breve</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    {c.status === "available" && <p className="text-[11px] text-muted-foreground mt-1.5">{contagem[c.slug] ?? 0} {contagem[c.slug] === 1 ? "artigo" : "artigos"}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Destaques */}
          {destaques.length > 0 && (
            <section className="mt-10">
              <h2 className="font-heading text-xl font-semibold">Mais acessados</h2>
              <Card className="divide-y divide-border overflow-hidden mt-4">
                {destaques.map((a) => <ArticleRow key={a.id} article={a} showCategory />)}
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
