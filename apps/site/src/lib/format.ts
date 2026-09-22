export function formatCurrency(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Domínio do painel do profissional — todo CTA do site aponta pra lá.
// Em produção, configurar via `NEXT_PUBLIC_APP_URL` (ex.: https://app.impegni.com.br).
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const REGISTER_URL = `${APP_URL}/register`;
export const LOGIN_URL = `${APP_URL}/login`;

// Domínio raiz de agendamento público — cada empresa tem seu próprio
// subdomínio (`{slug}.inova.app`, resolvido em apps/web-client/src/lib/
// subdomain.ts). Usado só pra ilustrar a página pública de agendamento na
// seção "link-agendamento"; nunca aponta pra um tenant real.
export const BOOKING_ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "inova.app";

// Número real de suporte informado pelo usuário (55 11 98827-5040) — único
// canal usado no botão flutuante e no rodapé. Formato wa.me exige só
// dígitos, sem espaço/traço/sinal de +.
export const WHATSAPP_NUMBER = "5511988275040";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá! Vim pelo site do Impegni e queria tirar uma dúvida."
)}`;
