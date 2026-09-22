import type { Metadata } from "next";
import "@/styles/globals.css";

const TITLE = "InovaFlow — Agenda e gestão para profissionais autônomos";
const DESCRIPTION =
  "Agenda, clientes, serviços e financeiro em um só lugar, com sua própria página de agendamento. Teste grátis por 14 dias, sem cartão de crédito.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003"),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
