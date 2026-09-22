import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = { title: "Termos de uso — InovaFlow" };

// Estrutura pronta pro link funcionar desde já (obrigatório pras lojas de
// app na Fase 2) — o texto jurídico definitivo entra aqui depois, revisado
// por quem de direito. Nada de cláusula inventada nesta página.
export default function TermosPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-5 sm:px-6 py-16">
        <h1 className="font-heading text-3xl font-semibold mb-4">Termos de uso</h1>
        <p className="text-muted-foreground leading-relaxed">
          Este documento está em elaboração e será publicado aqui antes do lançamento oficial. Enquanto isso, qualquer dúvida sobre o uso do InovaFlow pode ser esclarecida diretamente com o{" "}
          <Link href="mailto:atendimento.inovabi@gmail.com" className="text-primary hover:underline">suporte</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}
