import Link from "next/link";
import { cn } from "@/lib/utils";

// Mesmo símbolo do favicon (src/app/icon.svg): o "check" de algo resolvido,
// organizado — neutro pra qualquer segmento de beleza, não só barbearia.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-8 h-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#BE185D" />
      <path d="M9 17.5 L14 22 L23 11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="Impegni — página inicial" className={cn("flex items-center gap-2.5 shrink-0", className)}>
      <LogoMark className="w-7 h-7" />
      <span className="font-heading text-[18px] font-semibold tracking-[-0.02em]">Impegni</span>
    </Link>
  );
}
