import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { REGISTER_URL } from "@/lib/format";

// O produto real é o protagonista do hero — sem foto de banco de imagens
// nem card flutuando sobre uma foto (o combo mais repetido em landing pages
// genéricas de SaaS). Um único print grande e reto do dashboard, do jeito
// que ele aparece pro usuário.
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative max-w-4xl mx-auto px-5 sm:px-6 pt-14 sm:pt-20 text-center animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-5">
          Feito para quem atende por conta própria
        </p>

        <h1 className="font-heading text-[2.5rem] sm:text-[3.2rem] font-extrabold leading-[1.06] tracking-tight text-balance">
          Sua agenda organizada.
          <br />
          <span className="text-primary">Seu negócio sob controle.</span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-[52ch] mx-auto text-pretty">
          Tenha uma agenda profissional, organize seus clientes e facilite seus agendamentos em um só lugar — sem
          precisar de planilha, papel ou várias conversas soltas no WhatsApp.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
          <ButtonLink href={REGISTER_URL} size="lg" className="group">
            Começar teste grátis
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </ButtonLink>
          <a href="#solucao" className="text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors">
            Conhecer a plataforma
          </a>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">14 dias grátis • Sem cartão de crédito</p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="text-primary">✓</span> Versão Web disponível</span>
          <span className="flex items-center gap-1.5">📱 Aplicativo Mobile em breve</span>
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto px-5 sm:px-6 mt-14 sm:mt-16 pb-20 sm:pb-28 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="rounded-2xl border border-border bg-card shadow-[0_30px_60px_-25px_rgba(23,7,25,0.25)] overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-chart-4/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-chart-2/50" />
            <span className="ml-3 text-xs text-muted-foreground">app.impegni.com.br/dashboard</span>
          </div>
          <Image
            src="/screenshots/dashboard.png"
            alt="Painel do Impegni mostrando faturamento, próximos atendimentos e agenda do dia"
            width={1600}
            height={1000}
            priority
            sizes="(min-width: 1024px) 960px, 100vw"
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
}
