import Link from "next/link";
import { Instagram } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LOGIN_URL, REGISTER_URL, WHATSAPP_URL } from "@/lib/format";

// Perfil oficial no Instagram.
const INSTAGRAM_URL = "https://www.instagram.com/impegni.app/";

const COLUNAS = [
  {
    heading: "Produto",
    items: [
      { label: "Visão geral", href: "/#produto" },
      { label: "Funcionalidades", href: "/#funcionalidades" },
      { label: "Agendamento online", href: "/#link-agendamento" },
      { label: "Como funciona", href: "/#como-funciona" },
      { label: "Planos", href: "/#planos" },
    ],
  },
  {
    heading: "Ajuda",
    items: [
      { label: "FAQ", href: "/#faq" },
      { label: "Entrar", href: LOGIN_URL },
      { label: "Começar grátis", href: REGISTER_URL },
    ],
  },
  {
    heading: "Institucional",
    items: [
      { label: "Termos de Uso", href: "/termos-de-uso" },
      { label: "Política de Privacidade", href: "/privacidade" },
      { label: "@impegni.app", href: INSTAGRAM_URL, external: true, instagram: true },
      { label: "Contato", href: WHATSAPP_URL, external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-foreground/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-4 text-[15px] text-muted-foreground max-w-xs leading-relaxed">
              Gestão profissional para negócios de beleza: agenda, clientes, financeiro, estoque e agendamento online.
            </p>
          </div>

          {COLUNAS.map((col) => (
            <div key={col.heading}>
              <p className="text-[13px] font-semibold text-foreground/80 mb-4">{col.heading}</p>
              <ul className="space-y-3 text-[14.5px]">
                {col.items.map((item) => (
                  <li key={item.label}>
                    {"instagram" in item ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram do Impegni"
                        className="flex w-fit items-center gap-2 min-h-11 sm:min-h-0 -my-2.5 sm:my-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Instagram className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {item.label}
                      </a>
                    ) : "external" in item ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-foreground/[0.08] flex flex-col sm:flex-row gap-2 justify-between text-[13px] text-muted-foreground">
          <p>© {new Date().getFullYear()} Impegni</p>
          <p>Seus dados são tratados de acordo com a LGPD.</p>
        </div>
      </div>
    </footer>
  );
}
