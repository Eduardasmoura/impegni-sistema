import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  /** Texto claro, pra seções com fundo escuro. */
  inverted?: boolean;
  id?: string;
  className?: string;
}

// Cabeçalho de seção repetido ao longo da página — mesmo ritmo tipográfico
// em todas as seções, sem copiar as classes em cada uma.
export function SectionHeading({ eyebrow, title, description, align = "center", inverted, id, className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className={cn("text-[13px] font-semibold tracking-wide mb-4", inverted ? "text-white/70" : "text-primary/80")}>{eyebrow}</p>
      )}
      <h2 id={id} className="font-heading text-[2rem] sm:text-[2.6rem] leading-[1.08] font-semibold tracking-[-0.025em] text-balance">
        {title}
      </h2>
      {description && (
        <p className={cn("mt-5 text-[17px] sm:text-lg leading-relaxed text-pretty", inverted ? "text-white/75" : "text-muted-foreground")}>
          {description}
        </p>
      )}
    </div>
  );
}
