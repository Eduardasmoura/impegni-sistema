import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "onDark" | "outline" | "ghost";
type Size = "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/30",
  onDark: "bg-white text-primary hover:bg-white/90 shadow-lg shadow-black/10",
  outline: "border-2 border-primary text-primary hover:bg-primary/5",
  ghost: "text-foreground/80 hover:text-foreground hover:bg-muted",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-8 text-sm",
};

interface ButtonLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: Variant;
  size?: Size;
}

// CTA único e consistente em todo o site — o mesmo componente aparece na
// navbar, no hero, nos cards de plano e no CTA final, só trocando variant.
export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold uppercase tracking-wide transition-all hover:-translate-y-0.5",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
