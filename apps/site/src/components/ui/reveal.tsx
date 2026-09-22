"use client";

import type { ReactNode } from "react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  /** Atraso em ms — usado pra escalonar cards de uma mesma grade. */
  delay?: number;
  className?: string;
}

// Componente cliente fino: recebe conteúdo já renderizado no servidor (as
// seções que buscam dados, como <Planos>, continuam Server Components) e só
// adiciona a classe que dispara a transição definida em globals.css.
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <div ref={ref} className={cn("reveal", visible && "reveal-visible", className)} style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}>
      {children}
    </div>
  );
}
