import { Check } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { ProductShot, type Shot } from "@/components/ui/product-shot";
import { cn } from "@/lib/utils";

interface FeatureShowcaseProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: { title: string; body: string }[];
  image: Shot & { alt: string };
  /** Mesma tela capturada no celular — evita print minúsculo no mobile. */
  mobileImage?: Shot;
  /** Print à esquerda e texto à direita. */
  reverse?: boolean;
  tint?: "accent" | "muted";
  /** Recorte real extra sobreposto ao print (só do tablet pra cima). */
  overlay?: React.ReactNode;
}

// Composição das seções de módulo (Agenda, Clientes, Financeiro): o
// benefício primeiro (título + texto curto + 3 destaques), o print real
// grande ao lado — "sangrando" pra fora de um painel tingido no desktop.
export function FeatureShowcase({ id, eyebrow, title, description, bullets, image, mobileImage, reverse, tint = "accent", overlay }: FeatureShowcaseProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div
        className={cn(
          "grid gap-10 lg:gap-16 items-center",
          reverse ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        )}
      >
        <div className={cn(reverse && "lg:order-2")}>
          <SectionHeading id={`${id}-title`} align="left" eyebrow={eyebrow} title={title} description={description} />
          <ul className="mt-9 space-y-5">
            {bullets.map((b) => (
              <li key={b.title} className="flex gap-3.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-[15.5px]">{b.title}</span>
                  <span className="block text-[15px] text-muted-foreground leading-relaxed text-pretty">{b.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Reveal className={cn("relative", reverse && "lg:order-1")}>
          <div
            className={cn(
              "relative rounded-3xl overflow-hidden",
              "max-sm:p-4 sm:pt-12",
              reverse ? "sm:pr-12" : "sm:pl-12",
              tint === "accent" ? "bg-accent" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "border border-foreground/10 bg-card shadow-product overflow-hidden max-sm:rounded-2xl",
                reverse ? "sm:rounded-tr-2xl sm:border-l-0 sm:border-b-0" : "sm:rounded-tl-2xl sm:border-r-0 sm:border-b-0",
                mobileImage && "max-sm:aspect-[390/600]"
              )}
            >
              <ProductShot
                desktop={image}
                mobile={mobileImage}
                alt={image.alt}
                sizes="(min-width: 1024px) 700px, (min-width: 640px) 90vw, 92vw"
                className={cn(mobileImage && "max-sm:h-full max-sm:object-cover max-sm:object-top")}
              />
            </div>
          </div>
          {overlay && <div className="hidden sm:block">{overlay}</div>}
        </Reveal>
      </div>
    </section>
  );
}
