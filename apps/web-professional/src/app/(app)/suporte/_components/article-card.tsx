import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import type { HelpArticle } from "@/lib/help";
import { getCategory } from "@/lib/help";

export function ArticleRow({ article, showCategory = false, compact = false }: { article: HelpArticle; showCategory?: boolean; compact?: boolean }) {
  return (
    <Link
      href={`/suporte/artigo/${article.slug}`}
      className={`group flex items-center gap-4 hover:bg-muted/60 ${compact ? "px-4 py-3" : "px-4 sm:px-5 py-4"} transition-colors focus-visible:outline-none focus-visible:bg-muted/60`}
    >
      <div className="min-w-0 flex-1">
        {showCategory && <p className="text-[11px] font-medium uppercase tracking-wide text-primary mb-0.5">{getCategory(article.category)?.title}</p>}
        <p className={`font-medium group-hover:text-primary transition-colors ${compact ? "text-sm" : "text-sm sm:text-[15px]"}`}>{article.title}</p>
        {!compact && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">{article.description}</p>}
      </div>
      <span className={`${compact ? "hidden" : "hidden sm:inline-flex"} items-center gap-1 text-xs text-muted-foreground shrink-0`}><Clock className="w-3.5 h-3.5" /> {article.readingMinutes} min</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
