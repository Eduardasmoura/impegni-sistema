import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SUPPORT_EMAIL } from "@/lib/format";

export const metadata: Metadata = { title: "Política de privacidade — Impegni" };

// Mesma lógica de `termos/page.tsx`: link real, funcionando, pronto pra
// receber o texto definitivo (revisado à luz da LGPD) antes do
// lançamento — sem cláusula fictícia publicada nesta página.
export default function PrivacidadePage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-5 sm:px-6 py-16">
        <h1 className="font-heading text-3xl font-semibold mb-4">Política de privacidade</h1>
        <p className="text-muted-foreground leading-relaxed">
          Este documento está em elaboração e será publicado aqui antes do lançamento oficial, detalhando como os dados de empresas e clientes são tratados no Impegni, em conformidade com a LGPD. Qualquer dúvida pode ser esclarecida diretamente com o{" "}
          <Link href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">suporte</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}
