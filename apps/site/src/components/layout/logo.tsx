import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Logo oficial "impegni." (grafite #1C1B21 + ponto roxo #6D3FD6), com fundo
// transparente — public/logo-impegni.png, proporção 720x175.
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" aria-label="Impegni — página inicial" className={cn("flex items-center shrink-0", className)}>
      <Image src="/logo-impegni.png" alt="Impegni" width={720} height={175} priority={priority} className="h-7 w-auto" />
    </Link>
  );
}
