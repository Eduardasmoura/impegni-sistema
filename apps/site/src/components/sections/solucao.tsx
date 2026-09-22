import Image from "next/image";
import { Users, Scissors, CalendarCheck2, Link2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

const TAMBEM_INCLUI = ["Estoque", "Comissões", "Ficha de anamnese", "Programa de fidelidade"];

// Bento assimétrico: os dois módulos com print real (Agenda, Financeiro)
// ganham a coluna larga; os módulos sem tela dedicada ficam empilhados ao
// lado, num par que fecha a mesma altura da imagem. Evita repetir, célula a
// célula, o mesmo cartão ícone+título+texto usado na seção anterior.
function FeatureCard({ icon: Icon, title, body, className = "" }: { icon: typeof Users; title: string; body: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 flex flex-col justify-center ${className}`}>
      <Icon className="w-5 h-5 text-primary mb-4" aria-hidden="true" />
      <h3 className="font-heading text-[16px] font-semibold mb-1.5">{title}</h3>
      <p className="text-[14px] text-muted-foreground leading-relaxed text-pretty">{body}</p>
    </div>
  );
}

function ScreenshotCard({ img, alt, title, body }: { img: string; alt: string; title: string; body: string }) {
  return (
    <div className="h-full rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="p-6 pb-0">
        <h3 className="font-heading text-[16px] font-semibold mb-1.5">{title}</h3>
        <p className="text-[14px] text-muted-foreground leading-relaxed text-pretty">{body}</p>
      </div>
      <div className="mt-5 mx-6 mb-6 rounded-lg border border-border overflow-hidden">
        <Image src={img} alt={alt} width={640} height={400} className="w-full h-auto" />
      </div>
    </div>
  );
}

export function Solucao() {
  return (
    <section id="solucao" className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
      <SectionHeading
        eyebrow="Tudo em um só lugar"
        title="Sua rotina inteira, numa única plataforma."
        description="Menos tarefa manual, mais tempo pra atender. Cada parte do seu dia a dia profissional reunida num só sistema."
      />

      <div className="mt-14 space-y-5">
        <div className="grid lg:grid-cols-3 gap-5 items-stretch">
          <Reveal className="lg:col-span-2">
            <ScreenshotCard
              img="/screenshots/agenda.png"
              alt="Tela de agenda do Impegni com os horários do dia organizados por profissional"
              title="Agenda"
              body="Organize seus horários e visualize seus atendimentos do dia, da semana ou do mês."
            />
          </Reveal>
          <Reveal delay={60} className="flex flex-col gap-5">
            <FeatureCard className="flex-1" icon={Users} title="Clientes" body="Cadastre seus clientes e tenha acesso ao histórico de cada um." />
            <FeatureCard className="flex-1" icon={Scissors} title="Serviços" body="Cadastre preço e duração, pra tudo aparecer certo na hora de agendar." />
          </Reveal>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 items-stretch">
          <Reveal delay={100} className="flex flex-col gap-5 lg:order-1">
            <FeatureCard className="flex-1" icon={CalendarCheck2} title="Agendamentos" body="Facilite o processo de marcação — do primeiro contato à confirmação." />
            <FeatureCard className="flex-1" icon={Link2} title="Link de agendamento" body="Uma página própria pra seus clientes agendarem sozinhos, a qualquer hora." />
          </Reveal>
          <Reveal delay={160} className="lg:col-span-2 lg:order-2">
            <ScreenshotCard
              img="/screenshots/financeiro.png"
              alt="Relatório financeiro do Impegni mostrando receita, despesas e margem de lucro"
              title="Financeiro"
              body="Tenha uma visão mais organizada dos seus recebimentos, sem depender de planilha."
            />
          </Reveal>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground/70">Também inclui:</span>
        {TAMBEM_INCLUI.map((item) => (
          <span key={item} className="rounded-full border border-border bg-card px-3.5 py-1.5">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
