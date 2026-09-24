import { getImageProps } from "next/image";
import { cn } from "@/lib/utils";

export type Shot = { src: string; width: number; height: number };

interface ProductShotProps {
  desktop: Shot;
  /** Mesma tela real capturada no celular — usada até 639px de largura. */
  mobile?: Shot;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

// Print real do produto com "art direction": no celular entra a captura
// mobile da mesma tela (legível), do tablet pra cima a captura desktop.
// Um único <img> via <picture> — o browser baixa só a versão que vai usar.
// width/height no <source> reservam a proporção certa (sem salto de layout).
export function ProductShot({ desktop, mobile, alt, sizes, priority, className }: ProductShotProps) {
  const d = getImageProps({ src: desktop.src, width: desktop.width, height: desktop.height, alt, sizes, priority });
  if (!mobile) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...d.props} className={cn("block w-full h-auto", className)} />;
  }
  const m = getImageProps({ src: mobile.src, width: mobile.width, height: mobile.height, alt, sizes: "92vw", priority });
  return (
    <picture>
      <source media="(max-width: 639px)" srcSet={m.props.srcSet} sizes="92vw" width={mobile.width} height={mobile.height} />
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img {...d.props} className={cn("block w-full h-auto", className)} />
    </picture>
  );
}
