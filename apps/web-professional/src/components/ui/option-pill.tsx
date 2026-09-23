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
        // min-w-0: sem isso, o botão (item de grid) nunca encolhe abaixo da
        // largura da palavra mais longa dentro dele — "auto" é o padrão do
        // CSS pra min-width em item de grid/flex, e vence mesmo com a
        // coluna sendo mais estreita. Era a causa real do texto de
        // "Estabelecimento único" invadindo a borda: a palavra
        // "Estabelecimento" sozinha já é mais larga que 1/3 do card no
        // wizard de cadastro (max-w-sm), então o botão empurrava o próprio
        // limite da coluna em vez de quebrar linha.
        "flex items-center justify-between gap-2 px-4 py-3 rounded-lg border text-sm text-left transition-colors min-w-0 w-full",
        selected ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:bg-muted",
        className,
      )}
    >
      {/* min-w-0 de novo aqui: o <span> é filho flex do botão — sem isso,
          mesmo com o botão já do tamanho certo, o próprio texto ainda se
          recusaria a quebrar linha e vazaria por cima da borda. */}
      <span className="font-medium min-w-0">{children}</span>
      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
    </button>
  );
}
