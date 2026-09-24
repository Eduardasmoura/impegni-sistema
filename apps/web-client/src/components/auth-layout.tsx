import Image from "next/image";
import Link from "next/link";
import { Scissors, type LucideIcon } from "lucide-react";

export function AuthLayout({
  icon: Icon = Scissors,
  title,
  subtitle,
  footer,
  children,
}: {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo oficial — mesmo arquivo do site (apps/site/public/logo-impegni.png, 720x175). */}
        <Link href="/" aria-label="Impegni" className="flex items-center justify-center mb-8">
          <Image src="/logo-impegni.png" alt="Impegni" width={720} height={175} priority className="h-8 sm:h-9 w-auto" />
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            {title && <h1 className="font-heading text-xl font-semibold">{title}</h1>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>}
      </div>
    </div>
  );
}
