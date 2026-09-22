"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Detecta quando o elemento cruza a viewport, uma única vez, pra disparar
 * a animação de entrada de <Reveal> sem re-renderizar a cada scroll.
 * `prefers-reduced-motion` já neutraliza a transição em CSS (globals.css),
 * então essa preferência não precisa ser checada aqui de novo.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}
