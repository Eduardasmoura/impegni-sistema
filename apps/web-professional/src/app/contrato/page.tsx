import Link from "next/link";
import type { Metadata } from "next";
import { Scissors } from "lucide-react";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

export const metadata: Metadata = { title: "Contrato de Prestação de Serviços — Impegni" };

const SECOES = [
  {
    titulo: "1. Identificação das partes",
    corpo: `De um lado, a Impegni ("Plataforma"), responsável pelo fornecimento do sistema de gestão descrito neste contrato. De outro, a pessoa física ou jurídica que realiza o cadastro ("Cliente" ou "Contratante"), representada pelo responsável identificado no momento da criação da conta.`,
  },
  {
    titulo: "2. Objeto do serviço",
    corpo: `Este contrato regula o uso da plataforma Impegni, disponibilizada como Software as a Service (SaaS) para gestão de agenda, clientes, equipe, serviços, estoque e financeiro de negócios de beleza e estética.`,
  },
  {
    titulo: "3. Descrição geral da plataforma",
    corpo: `A Impegni está disponível hoje na versão Web, acessível por navegador em qualquer computador, tablet ou celular, incluindo uma página pública de agendamento para os clientes do Contratante. Um aplicativo Mobile dedicado está em desenvolvimento e será anunciado quando disponível.`,
  },
  {
    titulo: "4. Criação da conta",
    corpo: `A conta é criada pelo próprio Contratante, mediante cadastro com dados verdadeiros, informando responsável, dados do negócio e definição de senha de acesso. O e-mail informado precisa ser confirmado antes do primeiro acesso.`,
  },
  {
    titulo: "5. Responsabilidade pelas informações cadastradas",
    corpo: `O Contratante é o único responsável pela veracidade, exatidão e atualização dos dados cadastrados — incluindo dados do negócio, endereço, documentos e informações de clientes e profissionais inseridos na plataforma.`,
  },
  {
    titulo: "6. Período de teste gratuito",
    corpo: `Ao criar a conta, o Contratante recebe automaticamente um período de teste gratuito ("Trial"), sem necessidade de informar dados de pagamento antecipadamente.`,
  },
  {
    titulo: "7. Funcionamento do período de 14 dias",
    corpo: `O Trial tem duração de 14 (quatorze) dias corridos, contados a partir do instante exato da criação da empresa na plataforma (registrado como "início do trial"), e não a partir do último acesso ou login. O término ocorre automaticamente ao fim desse período, independentemente de uso.`,
  },
  {
    titulo: "8. Ausência de cobrança durante o teste",
    corpo: `Nenhum valor é cobrado do Contratante durante o período de Trial. Não é exigido cartão de crédito ou qualquer outro dado de pagamento para iniciar ou manter o período de teste.`,
  },
  {
    titulo: "9. Necessidade de contratação de plano após o período de teste",
    corpo: `Para continuar utilizando a plataforma após o encerramento do Trial, o Contratante deverá contratar um dos planos pagos disponíveis, cujos preços, recursos e condições estão descritos na página de planos da plataforma no momento da contratação.`,
  },
  {
    titulo: "10. Bloqueio do sistema após encerramento do trial",
    corpo: `Encerrado o Trial sem a contratação de um plano ativo, o acesso às funcionalidades da plataforma é bloqueado automaticamente. O Contratante é direcionado a uma tela informando o encerramento do teste e oferecendo a contratação de um plano. Nenhum dado cadastrado — empresa, clientes, profissionais, serviços, agenda, financeiro ou configurações — é excluído em razão do bloqueio.`,
  },
  {
    titulo: "11. Reativação mediante contratação de plano",
    corpo: `Ao contratar um plano e ter o pagamento confirmado pelo meio de pagamento utilizado pela Plataforma, o acesso é restabelecido automaticamente, sem necessidade de novo cadastro, preservando todos os dados existentes.`,
  },
  {
    titulo: "12. Responsabilidades do cliente",
    corpo: `Cabe ao Contratante: manter a confidencialidade de sua senha de acesso; utilizar a plataforma em conformidade com a lei e com este contrato; garantir que possui autorização para tratar os dados de clientes e profissionais que cadastrar; e manter seus dados de contato e pagamento atualizados.`,
  },
  {
    titulo: "13. Responsabilidades da plataforma",
    corpo: `Cabe à Impegni: manter a plataforma em funcionamento dentro de padrões razoáveis de disponibilidade; proteger os dados armazenados com controles de acesso e isolamento entre diferentes contas (multi-tenant); e comunicar alterações relevantes nestes termos.`,
  },
  {
    titulo: "14. Disponibilidade do serviço",
    corpo: `A Plataforma envida esforços para manter o serviço disponível de forma contínua, mas não garante disponibilidade ininterrupta, podendo ocorrer interrupções programadas para manutenção ou eventos fora de seu controle razoável.`,
  },
  {
    titulo: "15. Manutenção e atualizações",
    corpo: `A Plataforma pode realizar atualizações, correções e melhorias no sistema a qualquer momento, incluindo em funcionalidades já existentes, buscando sempre preservar a experiência e os dados do Contratante.`,
  },
  {
    titulo: "16. Segurança",
    corpo: `O acesso aos dados de cada Contratante é isolado dos demais clientes da Plataforma por controles técnicos de segurança em nível de banco de dados. Credenciais de acesso administrativo interno da Plataforma nunca são compartilhadas com terceiros.`,
  },
  {
    titulo: "17. Proteção de dados",
    corpo: `O tratamento de dados pessoais pela Plataforma observa a Lei Geral de Proteção de Dados (LGPD). Os detalhes sobre coleta, uso, compartilhamento e retenção de dados estão descritos na Política de Privacidade, documento complementar a este contrato.`,
  },
  {
    titulo: "18. Cancelamento",
    corpo: `O Contratante pode cancelar sua assinatura a qualquer momento pelos meios disponibilizados na plataforma ou pelo suporte. O cancelamento interrompe cobranças futuras; o acesso às funcionalidades pagas permanece até o fim do período já pago, quando aplicável.`,
  },
  {
    titulo: "19. Inadimplência",
    corpo: `Em caso de não confirmação do pagamento de um plano contratado, o acesso poderá ser restringido de forma equivalente ao encerramento do Trial, até a regularização do pagamento, sem exclusão dos dados cadastrados.`,
  },
  {
    titulo: "20. Limitações de responsabilidade",
    corpo: `[Cláusula sujeita a revisão jurídica.] A Plataforma não se responsabiliza por danos indiretos decorrentes do uso do sistema, nem por decisões de negócio tomadas pelo Contratante com base nas informações geradas pela plataforma.`,
  },
  {
    titulo: "21. Alterações dos termos",
    corpo: `Este contrato pode ser atualizado. Quando uma alteração relevante exigir novo aceite, a Plataforma solicitará a confirmação do Contratante antes de dar continuidade ao uso, preservando o registro do aceite às versões anteriores.`,
  },
  {
    titulo: "22. Aceite eletrônico",
    corpo: `A aceitação deste contrato ocorre eletronicamente, no momento da criação da conta, mediante marcação de caixa de confirmação específica. O aceite é registrado com identificação do usuário, data, hora e versão do documento aceito, para fins de comprovação.`,
  },
  {
    titulo: "23. Foro e legislação aplicável",
    corpo: `[Cláusula sujeita a revisão jurídica.] Este contrato é regido pelas leis da República Federativa do Brasil. O foro para dirimir eventuais controvérsias será definido em revisão jurídica antes da publicação da versão final deste documento.`,
  },
] as const;

/**
 * Contrato de Prestação de Serviços / Termos de Uso — ligado ao aceite
 * obrigatório da Etapa 5 do cadastro (ver `step-password.tsx` e
 * `lib/terms.ts`). Página pública, sem autenticação, pra abrir bem em
 * qualquer aparelho a partir do link "Ler contrato completo".
 *
 * As cláusulas descrevem com precisão como o produto realmente funciona
 * hoje (trial de 14 dias, bloqueio sem exclusão de dados, reativação por
 * plano) — nada inventado. As duas marcadas "sujeita a revisão jurídica"
 * são exatamente as que dependem de decisão jurídica (responsabilidade,
 * foro) e não devem ser tratadas como texto definitivo.
 */
export default function ContratoPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 h-16 flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-semibold">Impegni</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
        <h1 className="font-heading text-3xl font-semibold mb-1">Contrato de Prestação de Serviços</h1>
        <p className="text-sm text-muted-foreground mb-6">Termos de Uso da plataforma Impegni — versão {CURRENT_TERMS_VERSION}</p>

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground mb-10">
          Este documento descreve como a plataforma funciona hoje e as condições de uso do período de teste e dos
          planos pagos. As cláusulas indicadas como <strong>sujeitas a revisão jurídica</strong> ainda não passaram
          por análise de um advogado e não devem ser lidas como texto definitivo.
        </div>

        <div className="space-y-8">
          {SECOES.map((secao) => (
            <section key={secao.titulo}>
              <h2 className="font-heading text-lg font-semibold mb-2">{secao.titulo}</h2>
              <p className="text-sm text-foreground/90 leading-relaxed">{secao.corpo}</p>
            </section>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-12 pt-6 border-t border-border">
          Dúvidas sobre este contrato podem ser esclarecidas com o{" "}
          <a href="mailto:atendimento.inovabi@gmail.com" className="text-primary hover:underline">suporte</a>.
        </p>
      </main>
    </div>
  );
}
