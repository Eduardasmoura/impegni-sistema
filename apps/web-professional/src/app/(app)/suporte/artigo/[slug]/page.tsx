import { notFound } from "next/navigation";
import { getArticle, getArticles, getCategory } from "@/lib/help";
import { ArticleView } from "../../_components/article-view";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = params;
  return { title: `${getArticle(slug)?.title ?? "Artigo"} — Central de Ajuda — Impegni` };
}

export default function ArtigoPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const artigo = getArticle(slug);
  if (!artigo) notFound();
  const categoria = getCategory(artigo.category)!;
  const relacionados = getArticles(artigo.category).filter((a) => a.slug !== artigo.slug).slice(0, 4);
  return <ArticleView artigo={artigo} categoria={categoria} relacionados={relacionados} />;
}
