interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
}

// Avatar como iniciais coloridas, não uma foto de banco de imagens — evita
// sugerir uma pessoa real específica antes de existirem depoimentos
// verificados de clientes de verdade.
export function TestimonialCard({ quote, name, role }: TestimonialCardProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <figure className="h-full rounded-2xl border border-border bg-card p-7 flex flex-col">
      <blockquote className="text-[15px] text-foreground/85 leading-relaxed text-pretty flex-1">“{quote}”</blockquote>
      <figcaption className="flex items-center gap-3 mt-6">
        <span className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-heading font-semibold text-sm shrink-0" aria-hidden="true">
          {initial}
        </span>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </figcaption>
    </figure>
  );
}
