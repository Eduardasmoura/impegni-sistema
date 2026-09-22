import { cn } from "@/lib/utils";

// Placeholder de carregamento (shimmer) — usado na tabela de Clientes
// enquanto a página busca no banco, no lugar do spinner genérico de
// `LoadingState` (melhor pra tabela: já sugere o formato do conteúdo real).
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
