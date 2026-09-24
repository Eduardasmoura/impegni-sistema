// Modelo da Central de Ajuda. Hoje o conteúdo mora em `content.ts` (versionado
// com o código); os campos espelham a futura tabela que o Super Admin vai
// editar (help_categories / help_articles), então trocar a fonte depois é só
// reimplementar `getCategories`/`getArticles` em `index.ts`.

export type HelpCategorySlug =
  | "primeiros-passos"
  | "meu-estabelecimento"
  | "agenda"
  | "clientes"
  | "financeiro"
  | "pagamentos"
  | "pacotes-recorrentes"
  | "anamnese"
  | "relatorios"
  | "marketing"
  | "notificacoes"
  | "minha-conta";

export type HelpCategory = {
  slug: HelpCategorySlug;
  title: string;
  description: string;
  /** "coming_soon": a funcionalidade ainda não existe no produto — a categoria aparece, mas sem artigos. */
  status: "available" | "coming_soon";
  order: number;
};

export type HelpStep = {
  title: string;
  body: string;
  /** Link real do painel para executar o passo (nunca um link falso). */
  href?: string;
  cta?: string;
};

export type HelpArticle = {
  id: string;
  category: HelpCategorySlug;
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
  steps: HelpStep[];
  tips?: string[];
  faqs?: { q: string; a: string }[];
  keywords?: string[];
  order: number;
  published: boolean;
  featured?: boolean;
  updatedAt: string;
};
