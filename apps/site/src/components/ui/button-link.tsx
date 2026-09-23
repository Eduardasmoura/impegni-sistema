import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "onDark" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20",
  onDark: "bg-white text-primary hover:bg-white/90",
  outline: "border border-foreground/15 bg-card text-foreground hover:border-foreground/30 hover:bg-muted/60",
  ghost: "text-foreground/80 hover:text-foreground hover:bg-muted",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-[15px]",
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
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
