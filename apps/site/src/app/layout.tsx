import type { Metadata, Viewport } from "next";
import { Work_Sans } from "next/font/google";
import { SITE_URL } from "@/lib/format";
import "@/styles/globals.css";

// next/font hospeda a fonte junto com o site — sem o @import bloqueante do
// Google Fonts que havia no CSS antes.
const workSans = Work_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

const TITLE = "Impegni — Gestão profissional para negócios de beleza";
const DESCRIPTION =
  "Agenda, clientes, financeiro, estoque e agendamento online em um só lugar. Para manicures, cabeleireiras, barbeiros, esteticistas e studios. 14 dias grátis, sem cartão de crédito.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  applicationName: "Impegni",
  keywords: [
    "sistema para salão de beleza",
    "agenda para manicure",
    "sistema para barbearia",
    "agendamento online",
    "gestão para esteticista",
    "agenda online para profissionais de beleza",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Impegni",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Início do Impegni com a agenda do dia e a receita do mês" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#BE185D",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Impegni",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: DESCRIPTION,
  inLanguage: "pt-BR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={workSans.variable}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        {children}
      </body>
    </html>
  );
}
