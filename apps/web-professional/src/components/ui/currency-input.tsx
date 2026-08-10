"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  id?: string;
  /** Valor em reais como string simples (ex.: "45" ou "45.5") — mesmo
   *  formato que `Number(value)` já espera no resto do código. */
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Campo de valor monetário que formata em R$ (milhar com ponto, centavos com
 * vírgula) conforme o usuário digita — só números importam, o cursor sempre
 * entra pela direita (padrão de caixa eletrônico/maquininha, mais previsível
 * que deixar editar o texto formatado livremente).
 */
export function CurrencyInput({ id, value, onValueChange, placeholder, className, disabled }: CurrencyInputProps) {
  const cents = Math.round((parseFloat(value || "0") || 0) * 100);
  const display = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    const newCents = raw === "" ? 0 : parseInt(raw, 10);
    onValueChange((newCents / 100).toFixed(2));
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
      <Input
        id={id}
        inputMode="numeric"
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pl-9", className)}
        value={display}
        onChange={handleChange}
      />
    </div>
  );
}
