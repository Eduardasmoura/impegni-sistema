import Image from "next/image";

export interface Testimonial {
  quote: string;
  name: string;
  profession: string;
  company?: string;
  /** Caminho em /public (ex.: /depoimentos/nome.jpg). Sem foto, mostra a inicial. */
  photo?: string;
}

// Estrutura pronta pra depoimentos reais (ver DEPOIMENTOS em
// sections/confianca.tsx): foto, nome, profissão, empresa e depoimento.
export function TestimonialCard({ quote, name, profession, company, photo }: Testimonial) {
  return (
    <figure className="h-full rounded-2xl border border-foreground/[0.08] bg-card p-7 flex flex-col">
      <blockquote className="text-[16px] leading-relaxed text-pretty flex-1">“{quote}”</blockquote>
      <figcaption className="flex items-center gap-3 mt-6">
        {photo ? (
          <Image src={photo} alt="" width={44} height={44} className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <span className="w-11 h-11 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm shrink-0" aria-hidden="true">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-[13px] text-muted-foreground">
            {profession}
            {company && ` · ${company}`}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
