import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

// Cabeçalho de seção repetido ao longo da página (título + descrição curta),
// extraído aqui pra manter o mesmo ritmo tipográfico sem copiar as mesmas
// três linhas de classes Tailwind em cada seção.
export function SectionHeading({ eyebrow, title, description, align = "center", className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "", className)}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-3">{eyebrow}</p>}
      <h2 className="font-heading text-3xl sm:text-[2.25rem] font-bold tracking-tight text-balance">{title}</h2>
      {description && <p className="mt-3 text-muted-foreground text-lg text-pretty">{description}</p>}
    </div>
  );
}
