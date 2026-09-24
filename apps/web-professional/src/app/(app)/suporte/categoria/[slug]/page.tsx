import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageSquarePlus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getArticles, getCategory, type HelpCategorySlug } from "@/lib/help";
import { CategoryIcon } from "../../_components/category-icon";
import { ArticleRow } from "../../_components/article-card";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = params;
  return { title: `${getCategory(slug)?.title ?? "Ajuda"} — Central de Ajuda — Impegni` };
}

export default function CategoriaPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const categoria = getCategory(slug);
  if (!categoria) notFound();
  const artigos = getArticles(categoria.slug as HelpCategorySlug);

  return (
    <div>
      <Link href="/suporte" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /> Central de Ajuda</Link>
      <div className="flex items-start gap-4 mt-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><CategoryIcon slug={categoria.slug} className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold">{categoria.title}</h1>
          <p className="text-muted-foreground mt-1">{categoria.description}</p>
        </div>
      </div>

      {categoria.status === "coming_soon" ? (
        <Card className="px-6 py-12 text-center">
          <Sparkles className="w-10 h-10 mx-auto text-primary/60" />
          <p className="font-heading text-lg font-semibold mt-3">Em breve no Impegni</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Este recurso ainda está em desenvolvimento. Os guias passo a passo serão publicados aqui assim que ele estiver disponível para a sua conta.
          </p>
          <Button asChild variant="outline" className="mt-5 gap-2">
            <Link href="/suporte/solicitar?categoria=pacotes"><MessageSquarePlus className="w-4 h-4" /> Tenho interesse / dúvidas</Link>
          </Button>
        </Card>
      ) : artigos.length === 0 ? (
        <Card className="px-6 py-10 text-center text-sm text-muted-foreground">Nenhum artigo publicado nesta categoria ainda.</Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {artigos.map((a) => <ArticleRow key={a.id} article={a} />)}
        </Card>
      )}
    </div>
  );
}
