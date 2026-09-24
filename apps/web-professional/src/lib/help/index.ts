import { HELP_ARTICLES, HELP_CATEGORIES } from "./content";
import type { HelpArticle, HelpCategory, HelpCategorySlug } from "./types";

export type { HelpArticle, HelpCategory, HelpCategorySlug, HelpStep } from "./types";

// Ponto único de acesso ao conteúdo. Quando o Super Admin passar a editar os
// artigos, só estas funções mudam (passam a ler do banco); as telas não.

export function getCategories(): HelpCategory[] {
  return [...HELP_CATEGORIES].sort((x, y) => x.order - y.order);
}

export function getCategory(slug: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((c) => c.slug === slug);
}

export function getArticles(category?: HelpCategorySlug): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.published && (!category || a.category === category)).sort((x, y) => x.order - y.order);
}

export function getArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.published && a.slug === slug);
}

export function getFeaturedArticles(): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.published && a.featured);
}

export function countByCategory(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of HELP_ARTICLES) if (a.published) out[a.category] = (out[a.category] ?? 0) + 1;
  return out;
}

// Busca: sem acento/maiúscula, cada palavra da consulta precisa aparecer em
// algum campo; título e palavras-chave pesam mais que o corpo do artigo.
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const STOPWORDS = new Set(["como", "o", "a", "os", "as", "de", "do", "da", "dos", "das", "um", "uma", "e", "eu", "meu", "minha", "meus", "minhas", "no", "na", "para", "pra", "que", "por", "em"]);

export function searchArticles(query: string): HelpArticle[] {
  const q = norm(query).trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter((t) => t.length > 1 && !STOPWORDS.has(t));
  const terms = tokens.length ? tokens : q.split(/\s+/);
  const results: { a: HelpArticle; score: number }[] = [];
  for (const a of getArticles()) {
    const cat = getCategory(a.category)?.title ?? "";
    const title = norm(a.title);
    const desc = norm(a.description);
    const kw = norm((a.keywords ?? []).join(" ") + " " + cat);
    const body = norm([...a.steps.flatMap((s) => [s.title, s.body]), ...(a.tips ?? []), ...(a.faqs ?? []).flatMap((f) => [f.q, f.a])].join(" "));
    let score = 0;
    let all = true;
    for (const t of terms) {
      // "cancelar" também encontra "cancelamento" / "cancelado"
      const stem = t.length > 5 ? t.slice(0, t.length - 2) : t;
      const hit = (s: string) => s.includes(stem);
      const s = (hit(title) ? 6 : 0) + (hit(kw) ? 4 : 0) + (hit(desc) ? 3 : 0) + (hit(body) ? 1 : 0);
      if (!s) all = false;
      score += s;
    }
    if (all && score > 0) results.push({ a, score });
  }
  return results.sort((x, y) => y.score - x.score).map((r) => r.a);
}
