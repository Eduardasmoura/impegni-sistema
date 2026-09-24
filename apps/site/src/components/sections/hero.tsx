import { ArrowRight, CalendarDays, CalendarCheck2, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { BrowserFrame } from "@/components/ui/browser-frame";
import { REGISTER_URL } from "@/lib/format";

const SEGMENTOS = ["Manicures", "Nail designers", "Cabeleireiras", "Barbeiros", "Esteticistas", "Lash designers", "Studios e salões"];

// Os números dos cartões flutuantes são os mesmos do print do Início logo
// atrás (conta de demonstração Taty Beauty, dados fictícios) — destacam o
// que já está na tela, não inventam indicador nenhum.
function FloatCard({ icon: Icon, label, value, className }: { icon: typeof Wallet; label: string; value: string; className: string }) {
  return (
    <div className={`absolute hidden md:flex items-center gap-3 rounded-xl border border-foreground/[0.08] bg-card/95 backdrop-blur px-4 py-3 shadow-float ${className}`}>
      <span className="w-9 h-9 rounded-lg bg-accent text-primary flex items-center justify-center shrink-0">
        <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-[11.5px] text-muted-foreground leading-tight">{label}</span>
        <span className="block text-[15px] font-semibold tracking-tight leading-snug">{value}</span>
      </span>
    </div>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-12 xl:gap-16 items-center">
          <div className="animate-fade-up max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card px-3 py-1 text-[13px] text-foreground/70">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
              Gestão para profissionais de beleza
            </p>

            <h1 id="hero-title" className="mt-6 font-heading text-[2.45rem] sm:text-[3.4rem] lg:text-[3.1rem] xl:text-[3.5rem] font-semibold leading-[1.04] tracking-[-0.035em]">
              Seu negócio merece uma gestão profissional.
            </h1>

            <p className="mt-6 text-lg sm:text-[19px] text-muted-foreground leading-relaxed max-w-[34ch] text-pretty">
              Agenda, clientes, financeiro, estoque e agendamento online em um só lugar.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-3">
              <ButtonLink href={REGISTER_URL} size="lg" className="group">
                Começar grátis
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="#produto" variant="outline" size="lg">
                Conhecer o Impegni
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">14 dias grátis • Sem cartão de crédito</p>
          </div>

          <div className="relative animate-fade-up lg:-mr-6 xl:-mr-20" style={{ animationDelay: "0.12s" }}>
            {/* plano de fundo liso atrás do print — dá profundidade sem gradiente */}
            <div className="absolute -inset-x-6 -bottom-10 top-16 sm:-inset-x-10 rounded-[2rem] bg-accent/70" aria-hidden="true" />

            <BrowserFrame
              desktop={{ src: "/produto/dashboard.webp", width: 1440, height: 836 }}
              mobile={{ src: "/produto/m-dashboard.webp", width: 390, height: 844 }}
              alt="Início do Impegni com os números do dia, a agenda de hoje e o gráfico de receita do mês"
              url="app.impegni.com.br/dashboard"
              priority
              sizes="(min-width: 1280px) 820px, (min-width: 1024px) 60vw, 100vw"
              className="relative"
            />

            <FloatCard icon={Wallet} label="Receita do mês" value="R$ 6.505,00" className="left-3 lg:-left-8 xl:-left-12 top-[30%]" />
            <FloatCard icon={CalendarDays} label="Agenda de hoje" value="6 atendimentos" className="left-3 lg:-left-4 xl:-left-10 -bottom-6" />
            <FloatCard icon={CalendarCheck2} label="Novo agendamento" value="Pela sua página online" className="right-3 lg:right-6 xl:right-16 -bottom-8" />
          </div>
        </div>

        <div className="mt-20 sm:mt-24 pt-8 border-t border-foreground/[0.08] flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <p className="text-sm text-muted-foreground shrink-0">Feito para quem vive de atender:</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-medium text-foreground/75">
            {SEGMENTOS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
