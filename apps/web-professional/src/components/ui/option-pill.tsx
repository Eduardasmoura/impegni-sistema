import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Opção selecionável usada nas etapas do cadastro (porte do negócio,
 * quantidade de profissionais, objetivos) — um único componente pros três
 * lugares em vez de repetir o mesmo botão com leve variação cada vez.
 */
export function OptionPill({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center justify-between gap-2 px-4 py-3 rounded-lg border text-sm text-left transition-colors",
        selected ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:bg-muted",
        className,
      )}
    >
      <span className="font-medium">{children}</span>
      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
    </button>
  );
}
