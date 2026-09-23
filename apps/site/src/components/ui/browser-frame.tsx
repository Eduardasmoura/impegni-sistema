import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrowserFrameProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Endereço exibido na barra — só ilustrativo. */
  url?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

// Moldura de janela em volta dos prints reais do produto. Barra discreta,
// sem os três "semáforos" coloridos que denunciam template.
export function BrowserFrame({ src, alt, width, height, url, priority, sizes, className }: BrowserFrameProps) {
  return (
    <div className={cn("rounded-xl sm:rounded-2xl border border-foreground/10 bg-card shadow-product overflow-hidden", className)}>
      <div className="flex items-center gap-3 h-8 sm:h-10 px-3 sm:px-4 border-b border-foreground/[0.07] bg-muted/70">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-foreground/15" />
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-foreground/15" />
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-foreground/15" />
        </div>
        {url && (
          <span className="mx-auto max-w-[70%] truncate rounded-md bg-card/80 px-3 py-0.5 text-[10px] sm:text-xs text-muted-foreground" aria-hidden="true">
            {url}
          </span>
        )}
        {url && <span className="w-10 sm:w-12" aria-hidden="true" />}
      </div>
      <Image src={src} alt={alt} width={width} height={height} priority={priority} sizes={sizes} className="block w-full h-auto" />
    </div>
  );
}
