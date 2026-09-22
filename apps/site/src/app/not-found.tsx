import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = { title: "Página não encontrada — Impegni" };

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-5 sm:px-6 py-24 text-center">
        <Compass className="w-10 h-10 mx-auto text-primary" aria-hidden="true" />
        <h1 className="font-heading text-3xl font-semibold mt-4 mb-3">Página não encontrada</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          O endereço que você tentou acessar não existe ou foi movido. Volte para a página inicial ou fale com o suporte se acha que isso é um engano.
        </p>
        <ButtonLink href="/">Voltar para o início</ButtonLink>
      </main>
      <Footer />
    </>
  );
}
