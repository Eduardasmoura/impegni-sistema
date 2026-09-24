import { cn } from "@/lib/utils";
import { ProductShot, type Shot } from "./product-shot";

interface BrowserFrameProps {
  desktop: Shot;
  mobile?: Shot;
  alt: string;
  /** Endereço exibido na barra — só ilustrativo. */
  url?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

// Moldura discreta em volta dos prints reais do produto. A barra de
// navegador só aparece do tablet pra cima; no celular o print mobile entra
// num cartão limpo, recortado no topo da tela pra não ficar gigante.
export function BrowserFrame({ desktop, mobile, alt, url, priority, sizes = "100vw", className }: BrowserFrameProps) {
  return (
    <div className={cn("rounded-2xl border border-foreground/10 bg-card shadow-product overflow-hidden", className)}>
      <div className="hidden sm:flex items-center gap-3 h-10 px-4 border-b border-foreground/[0.07] bg-muted/70">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
        </div>
        {url && (
          <span className="mx-auto max-w-[70%] truncate rounded-md bg-card/80 px-3 py-0.5 text-xs text-muted-foreground" aria-hidden="true">
            {url}
          </span>
        )}
        {url && <span className="w-12" aria-hidden="true" />}
      </div>
      <div className={cn(mobile && "max-sm:aspect-[390/600] max-sm:overflow-hidden")}>
        <ProductShot
          desktop={desktop}
          mobile={mobile}
          alt={alt}
          sizes={sizes}
          priority={priority}
          className={cn(mobile && "max-sm:h-full max-sm:object-cover max-sm:object-top")}
        />
      </div>
    </div>
  );
}
