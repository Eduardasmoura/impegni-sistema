"use client";

import { MessageCircle } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/format";

// Botão flutuante fixo — número real informado pelo usuário (55 11
// 98827-5040), nunca um contato inventado. Pulso discreto só pra chamar
// atenção sem competir com o CTA principal; some sozinho se o visitante
// preferir menos movimento (`prefers-reduced-motion`, já tratado
// globalmente em globals.css).
export function WhatsappFloat() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="group fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 hover:shadow-xl transition-shadow"
    >
      <span className="animate-whatsapp-pulse absolute inset-0 rounded-full" aria-hidden="true" />
      <span className="relative w-14 h-14 flex items-center justify-center shrink-0">
        <MessageCircle className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span className="relative max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium group-hover:max-w-[9rem] group-focus-visible:max-w-[9rem] transition-[max-width] duration-300 sm:pr-0 group-hover:sm:pr-5 group-focus-visible:sm:pr-5">
        Fale conosco
      </span>
    </a>
  );
}
