import Image from "next/image";
import { Check } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

interface FeatureShowcaseProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: { title: string; body: string }[];
  image: { src: string; alt: string; width: number; height: number };
  /** Print à esquerda e texto à direita. */
  reverse?: boolean;
  tint?: "accent" | "muted";
  /** Conteúdo extra sobreposto ao print (ex.: anotação). */
  overlay?: React.ReactNode;
}

// Composição usada nas seções de módulo (Agenda, Financeiro, Clientes):
// texto curto + lista de destaques de um lado, print real grande do outro,
// "sangrando" pra fora de um painel tingido — o produto como protagonista.
export function FeatureShowcase({ id, eyebrow, title, description, bullets, image, reverse, tint = "accent", overlay }: FeatureShowcaseProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div
        className={cn(
          "grid gap-12 lg:gap-16 items-center",
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
              "relative rounded-3xl overflow-hidden pt-8 sm:pt-12",
              reverse ? "pr-8 sm:pr-12" : "pl-8 sm:pl-12",
              tint === "accent" ? "bg-accent" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "border border-foreground/10 bg-card shadow-product overflow-hidden",
                reverse ? "rounded-tr-xl sm:rounded-tr-2xl border-l-0 border-b-0" : "rounded-tl-xl sm:rounded-tl-2xl border-r-0 border-b-0"
              )}
            >
              <Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(min-width: 1024px) 700px, 100vw" className="block w-full h-auto" />
            </div>
          </div>
          {overlay}
        </Reveal>
      </div>
    </section>
  );
}
