import Link from "next/link";
import { Scissors } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/format";

const SUPPORT_EMAIL = "atendimento.inovabi@gmail.com";

const FOOTER_LINKS = [
  {
    heading: "Produto",
    items: [
      { label: "Funcionalidades", href: "#solucao" },
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Planos", href: "#planos" },
    ],
  },
  {
    heading: "Suporte",
    items: [
      { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
      { label: "WhatsApp", href: WHATSAPP_URL, external: true },
      { label: "Perguntas frequentes", href: "#faq" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Scissors className="w-3.5 h-3.5 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="font-heading text-[15px] font-semibold">Impegni</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Agenda, clientes, serviços e financeiro em um só lugar — pra profissionais autônomos que cuidam do próprio negócio.
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">{group.heading}</p>
              <ul className="space-y-2.5 text-sm">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target={"external" in item && item.external ? "_blank" : undefined}
                      rel={"external" in item && item.external ? "noopener noreferrer" : undefined}
                      className="text-muted-foreground hover:text-foreground transition-colors break-all"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">Legal</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/termos" className="text-muted-foreground hover:text-foreground transition-colors">
                  Termos de uso
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-muted-foreground hover:text-foreground transition-colors">
                  Política de privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 justify-between text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Impegni. Todos os direitos reservados.</p>
          <p>Seus dados são tratados de acordo com a Lei Geral de Proteção de Dados (LGPD).</p>
        </div>
      </div>
    </footer>
  );
}
