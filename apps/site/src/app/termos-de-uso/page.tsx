import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { TERMOS_DE_USO } from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Termos de Uso e Serviço | Impegni",
  description: "Confira os Termos de Uso e Serviço da Impegni.",
  alternates: { canonical: "https://impegni.com.br/termos-de-uso" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Termos de Uso e Serviço | Impegni",
    description: "Confira os Termos de Uso e Serviço da Impegni.",
    url: "https://impegni.com.br/termos-de-uso",
    type: "article",
    locale: "pt_BR",
  },
};

const linkClass = "text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary";
const PoliticaLink = () => (
  <Link href="/privacidade" className={linkClass}>
    Política de Privacidade
  </Link>
);

type Bloco = React.ReactNode | { lista: string[] };

// Texto fornecido pela Impegni — só ajustes de formatação/padronização.
// Não acrescentar nem alterar cláusulas sem revisão de quem responde
// juridicamente pelo documento.
const SECOES: { id: string; indice: string; titulo: string; blocos: Bloco[] }[] = [
  {
    id: "aceitacao",
    indice: "Aceitação dos Termos",
    titulo: "1. Aceitação dos termos",
    blocos: [
      "Ao navegar e utilizar o site da Impegni, você concorda com estes Termos de Uso.",
      "A Impegni poderá atualizar estes termos periodicamente para refletir alterações em seus serviços, na legislação aplicável ou em suas práticas.",
      "Quando houver alterações relevantes, a versão atualizada será disponibilizada nesta página.",
      "A continuidade de utilização do site e dos serviços após a publicação das alterações será considerada como concordância com a nova versão dos termos.",
    ],
  },
  {
    id: "como-utilizar",
    indice: "Como Utilizar",
    titulo: "2. Como utilizar o nosso site",
    blocos: [
      "Grande parte do site da Impegni pode ser acessada livremente, sem necessidade de cadastro.",
      "Algumas funcionalidades e serviços poderão exigir a criação de uma conta.",
      "Ao realizar um cadastro, você se compromete a fornecer informações verdadeiras, completas e atualizadas.",
      "Também é sua responsabilidade manter suas credenciais de acesso, como login e senha, em segurança, evitando compartilhá-las com terceiros.",
      "Caso disponibilize qualquer conteúdo à Impegni, incluindo comentários ou outras informações, você deverá fazê-lo de maneira respeitosa, lícita e de acordo com a legislação aplicável.",
    ],
  },
  {
    id: "privacidade",
    indice: "Privacidade",
    titulo: "3. Sua privacidade",
    blocos: [
      "Na Impegni, a privacidade é um valor essencial.",
      <>
        Ao interagir com nosso site e nossos serviços, o tratamento dos seus dados pessoais será realizado de acordo com nossa <PoliticaLink /> e com a
        legislação aplicável.
      </>,
      "Nosso compromisso é atuar com transparência e segurança no tratamento das informações pessoais, explicando como os dados são coletados, utilizados, armazenados e protegidos.",
      "Adotamos medidas de segurança destinadas a proteger as informações contra acessos não autorizados, utilização indevida e compartilhamento irregular.",
      "Quando houver utilização de serviços de terceiros ou compartilhamento de informações, isso ocorrerá de acordo com a legislação aplicável, com as bases legais pertinentes e, quando necessário, mediante autorização do titular.",
    ],
  },
  {
    id: "conteudo",
    indice: "Direitos sobre o Conteúdo",
    titulo: "4. Direitos sobre o conteúdo",
    blocos: [
      "Todo o conteúdo disponível no site da Impegni, incluindo, mas não se limitando a, textos, imagens, ilustrações, designs, elementos gráficos, ícones, fotografias, programas de computador, vídeos e áudios, está protegido pela legislação aplicável de propriedade intelectual.",
      "Esses direitos abrangem tanto os materiais produzidos diretamente pela Impegni quanto aqueles utilizados mediante licença, autorização ou outros direitos concedidos por terceiros.",
      "O acesso ao site concede ao usuário uma licença limitada, não exclusiva e revogável para visualizar e utilizar o conteúdo disponibilizado para fins pessoais e não comerciais.",
      "Não é permitida a reprodução, distribuição, transmissão, publicação, modificação ou exploração comercial do conteúdo do site sem autorização prévia e por escrito da Impegni ou do respectivo titular dos direitos.",
    ],
  },
  {
    id: "cookies",
    indice: "Cookies",
    titulo: "5. Cookies",
    blocos: [
      "A Impegni poderá utilizar cookies e tecnologias semelhantes para melhorar a experiência de navegação, compreender como o site é utilizado, identificar preferências e aprimorar seus serviços.",
      "As informações coletadas poderão incluir dados relacionados à navegação, como páginas acessadas, duração da visita, preferências e informações estatísticas de utilização.",
      "Essas informações podem ser utilizadas para:",
      {
        lista: [
          "melhorar a experiência do usuário;",
          "aprimorar o funcionamento do site;",
          "analisar a utilização dos serviços;",
          "melhorar o design e as funcionalidades;",
          "identificar problemas técnicos;",
          "contribuir para a segurança da plataforma.",
        ],
      },
      "O usuário poderá limitar ou bloquear cookies por meio das configurações do seu navegador.",
      "A desativação de determinados cookies poderá afetar o funcionamento de algumas funcionalidades do site.",
      <>
        Mais informações sobre o tratamento de dados e as tecnologias utilizadas podem ser consultadas na <PoliticaLink /> da Impegni.
      </>,
    ],
  },
  {
    id: "links-externos",
    indice: "Links Externos",
    titulo: "6. Links para sites externos",
    blocos: [
      "O site da Impegni poderá eventualmente disponibilizar links para sites, plataformas ou serviços de terceiros.",
      "Esses links são disponibilizados para conveniência do usuário.",
      "A Impegni não possui controle sobre o conteúdo, as políticas, as práticas de privacidade ou o funcionamento desses sites externos e, portanto, recomenda que o usuário consulte os respectivos termos e políticas antes de utilizá-los.",
    ],
  },
  {
    id: "alteracoes",
    indice: "Alterações",
    titulo: "7. Alterações e atualizações",
    blocos: [
      "A Impegni poderá atualizar estes Termos de Uso sempre que necessário para refletir alterações em seus serviços, funcionalidades, operações ou na legislação aplicável.",
      "A versão mais recente estará sempre disponível nesta página.",
      "Quando houver alterações relevantes, a Impegni poderá comunicar os usuários por meio dos canais de contato disponíveis.",
      "A continuidade de utilização do site e dos serviços após a publicação das alterações significará a concordância com os termos atualizados.",
      "Caso você não concorde com alguma alteração, recomendamos que interrompa a utilização do site e dos serviços.",
    ],
  },
  {
    id: "contato",
    indice: "Dúvidas e Contato",
    titulo: "8. Dúvidas e contato",
    blocos: [
      "Em caso de dúvidas, comentários ou solicitações relacionadas a estes Termos de Uso, entre em contato conosco:",
      <>
        E-mail:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={`${linkClass} break-all`}>
          {SUPPORT_EMAIL}
        </a>
      </>,
    ],
  },
];

function Indice({ onMobile }: { onMobile?: boolean }) {
  return (
    <ol className={onMobile ? "mt-3 space-y-0.5 text-[15px]" : "space-y-0.5 text-[14.5px] border-l border-foreground/10"}>
      {SECOES.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className={
              onMobile
                ? "flex gap-3 py-2 text-foreground/80 hover:text-foreground"
                : "flex gap-2.5 -ml-px border-l border-transparent pl-4 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            }
          >
            <span className="tabular-nums text-foreground/40 w-4 shrink-0">{i + 1}.</span>
            {s.indice}
          </a>
        </li>
      ))}
    </ol>
  );
}

export default function TermosDeUsoPage() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <section className="border-b border-foreground/[0.08] bg-muted/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <p className="text-[13px] font-semibold tracking-wide text-primary/80 mb-4">Documentos legais</p>
            <h1 className="font-heading text-[2.2rem] sm:text-[3rem] font-semibold leading-[1.05] tracking-[-0.03em] text-balance max-w-3xl">
              Termos de Uso e Serviço
            </h1>
            <p className="mt-5 text-[17px] sm:text-lg text-muted-foreground max-w-2xl text-pretty">
              Leia as condições de utilização do site e dos serviços da Impegni.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card px-3 py-1 text-[13px] text-foreground/70">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
              Última atualização: {TERMOS_DE_USO.atualizadoEm}
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 grid lg:grid-cols-[15rem_minmax(0,1fr)] gap-8 lg:gap-16">
          {/* índice: recolhível no celular, fixo na lateral no desktop */}
          <details className="lg:hidden group rounded-xl border border-foreground/10 bg-card px-4 py-3">
            <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden font-semibold text-[15px]">
              Índice
              <ChevronDown className="w-4 h-4 text-foreground/50 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <nav aria-label="Índice dos Termos de Uso">
              <Indice onMobile />
            </nav>
          </details>

          <nav aria-label="Índice dos Termos de Uso" className="hidden lg:block lg:sticky lg:top-24 self-start">
            <p className="text-[13px] font-semibold text-foreground/80 mb-3">Índice</p>
            <Indice />
          </nav>

          <article className="max-w-[68ch] text-[16px] leading-[1.75] text-foreground/85">
            <div className="space-y-5">
              <p className="text-[18px] leading-relaxed text-foreground">Seja bem-vindo ao site da Impegni.</p>
              <p>
                Antes de utilizar nossos serviços, é importante que você conheça e concorde com as regras que regem o uso do nosso site,
                disponível em impegni.com.br, e dos serviços digitais oferecidos pela Impegni.
              </p>
              <p>
                Ao acessar ou utilizar nosso site e serviços, você declara que leu, compreendeu e concorda com estes Termos de Uso. Caso
                não concorde com qualquer uma das condições aqui estabelecidas, recomendamos que não utilize nossos serviços.
              </p>
              <p>Nosso objetivo é proporcionar uma experiência transparente, segura e clara para todos os nossos usuários.</p>
            </div>

            {SECOES.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="mt-12 pt-10 border-t border-foreground/[0.08]">
                <h2 id={`${s.id}-titulo`} className="font-heading text-[1.4rem] sm:text-[1.6rem] font-semibold tracking-[-0.02em] text-foreground">
                  {s.titulo}
                </h2>
                <div className="mt-5 space-y-4">
                  {s.blocos.map((b, i) =>
                    b && typeof b === "object" && "lista" in b ? (
                      <ul key={i} className="space-y-1.5 pl-5 list-disc marker:text-primary/60">
                        {b.lista.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p key={i} className="text-pretty">
                        {b as React.ReactNode}
                      </p>
                    )
                  )}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
