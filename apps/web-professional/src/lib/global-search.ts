// Catálogo da busca global (⌘K). Só rotas que existem no painel; cada item
// pode exigir a mesma permissão que o menu/página já exige, para a busca
// nunca oferecer um lugar que o usuário não pode usar.

export type SearchRequirement = "equipe" | "manager" | "assinatura";

export type SearchEntry = {
  id: string;
  title: string;
  description: string;
  href: string;
  group: "Páginas" | "Recursos";
  icon: string;
  keywords?: string[];
  requires?: SearchRequirement;
};

export const SEARCH_CATALOG: SearchEntry[] = [
  // Páginas (mesmas do menu lateral e do menu do perfil)
  { id: "inicio", title: "Início", description: "Resumo do dia, indicadores e guia de configuração", href: "/dashboard", group: "Páginas", icon: "home", keywords: ["dashboard", "painel", "home", "hoje", "metricas"] },
  { id: "agenda", title: "Agenda", description: "Atendimentos do dia, calendário e novos agendamentos", href: "/agenda", group: "Páginas", icon: "agenda", keywords: ["agendamentos", "horarios", "calendario", "marcar"] },
  { id: "espera", title: "Lista de espera", description: "Clientes aguardando vaga", href: "/agenda/espera", group: "Páginas", icon: "espera", keywords: ["fila", "espera", "vaga"] },
  { id: "bloqueios", title: "Bloqueios, folgas e férias", description: "Períodos em que não há atendimento", href: "/agenda/bloqueios", group: "Páginas", icon: "bloqueio", keywords: ["folga", "ferias", "bloquear horario", "ausencia"] },
  { id: "clientes", title: "Clientes", description: "Cadastro, histórico e ficha dos clientes", href: "/clientes", group: "Páginas", icon: "clientes", keywords: ["cliente", "cadastro", "contatos"] },
  { id: "segmentacao", title: "Segmentação", description: "Clientes inativos, recorrentes, novos e que não retornaram", href: "/clientes/segmentos", group: "Páginas", icon: "segmentos", keywords: ["inativos", "recorrentes", "sumidos", "listas"] },
  { id: "servicos", title: "Serviços", description: "Catálogo com preço e duração", href: "/servicos", group: "Páginas", icon: "servicos", keywords: ["servico", "preco", "catalogo", "duracao"] },
  { id: "estoque", title: "Estoque", description: "Produtos e estoque mínimo", href: "/estoque", group: "Páginas", icon: "estoque", keywords: ["produtos", "reposicao"] },
  { id: "financeiro", title: "Financeiro", description: "Receitas, despesas, pagamentos e comissões", href: "/financeiro", group: "Páginas", icon: "financeiro", keywords: ["dinheiro", "receita", "despesa", "lucro", "caixa", "comissoes", "recebimentos"] },
  { id: "relatorios", title: "Relatórios", description: "Indicadores do negócio e exportação em PDF/Excel", href: "/relatorios", group: "Páginas", icon: "relatorios", keywords: ["relatorio", "indicadores", "pdf", "excel", "exportar"] },
  { id: "anamnese", title: "Anamnese", description: "Perguntas da ficha de anamnese", href: "/anamnese", group: "Páginas", icon: "anamnese", keywords: ["ficha", "perguntas", "formulario"] },
  { id: "avaliacoes", title: "Avaliações", description: "Avaliações dos seus clientes", href: "/avaliacoes", group: "Páginas", icon: "avaliacoes", keywords: ["notas", "reviews", "estrelas"] },
  { id: "cupons", title: "Cupons", description: "Descontos e promoções", href: "/cupons", group: "Páginas", icon: "cupons", keywords: ["desconto", "promocao", "cupom", "marketing"] },
  { id: "campanhas", title: "Campanhas", description: "Aniversários, datas comemorativas e ações de marketing", href: "/marketing", group: "Páginas", icon: "marketing", keywords: ["marketing", "campanha", "whatsapp", "aniversario", "promocao"], requires: "manager" },
  { id: "equipe", title: "Equipe", description: "Profissionais, expediente e comissões", href: "/equipe", group: "Páginas", icon: "equipe", keywords: ["profissionais", "funcionarios", "expediente"], requires: "equipe" },
  { id: "estabelecimento", title: "Meu estabelecimento", description: "Identidade visual, informações e link público", href: "/configuracao", group: "Páginas", icon: "estabelecimento", keywords: ["negocio", "salao", "logo", "cores", "empresa", "estabelecimento"] },
  { id: "configuracoes", title: "Configurações", description: "Negócio, anamnese, conta, notificações e segurança", href: "/configuracoes", group: "Páginas", icon: "configuracoes", keywords: ["ajustes", "preferencias", "configuracao"] },
  { id: "conta", title: "Minha conta", description: "Seu nome, foto, telefone, e-mail e senha", href: "/perfil", group: "Páginas", icon: "conta", keywords: ["perfil", "meus dados", "foto", "usuario"] },
  { id: "notificacoes", title: "Notificações", description: "Avisos e novidades da equipe Impegni", href: "/avisos", group: "Páginas", icon: "notificacoes", keywords: ["avisos", "novidades", "sino"] },
  { id: "lembretes", title: "Lembretes aos clientes", description: "Lembrete automático por WhatsApp", href: "/notificacoes", group: "Páginas", icon: "lembretes", keywords: ["whatsapp", "lembrete", "aviso ao cliente"] },
  { id: "seguranca", title: "Segurança", description: "Trocar senha e sair da conta", href: "/seguranca", group: "Páginas", icon: "seguranca", keywords: ["senha", "sair", "logout"] },
  { id: "plano", title: "Meu plano", description: "Plano contratado e troca de plano", href: "/meu-plano", group: "Páginas", icon: "plano", keywords: ["assinatura", "plano", "upgrade"], requires: "assinatura" },
  { id: "pagamentos-assinatura", title: "Pagamentos da assinatura", description: "Histórico de cobranças do seu plano", href: "/pagamentos", group: "Páginas", icon: "pagamentos", keywords: ["cobrancas", "faturas", "assinatura"], requires: "assinatura" },
  { id: "ajuda", title: "Ajuda e Suporte", description: "Central de Ajuda com tutoriais e busca", href: "/suporte", group: "Páginas", icon: "ajuda", keywords: ["ajuda", "suporte", "tutoriais", "duvidas", "central"] },

  // Recursos com rota própria (ou âncora) dentro das páginas acima
  { id: "novo-agendamento", title: "Novo agendamento", description: "Abre a Agenda com o formulário de agendamento", href: "/agenda?novo=1", group: "Recursos", icon: "agenda", keywords: ["agendar", "marcar horario", "criar agendamento"] },
  { id: "caucao", title: "Caução de agendamento", description: "Meu estabelecimento → Recebimentos / Caução", href: "/configuracao#caucao", group: "Recursos", icon: "caucao", keywords: ["caucao", "sinal", "pix", "link de pagamento", "recebimentos"], requires: "manager" },
  { id: "link-publico", title: "Link de agendamento", description: "Seu endereço público para os clientes agendarem", href: "/configuracao", group: "Recursos", icon: "link", keywords: ["link", "pagina publica", "compartilhar", "agendamento online"] },
  { id: "falar-suporte", title: "Falar com o suporte", description: "Abrir uma solicitação para a nossa equipe", href: "/suporte/solicitar", group: "Recursos", icon: "suporte", keywords: ["suporte", "chamado", "contato", "ajuda", "problema"] },
  { id: "minhas-solicitacoes", title: "Minhas solicitações", description: "Acompanhe os chamados enviados", href: "/suporte/solicitacoes", group: "Recursos", icon: "solicitacoes", keywords: ["chamados", "tickets", "suporte", "protocolo"] },
];

export type SearchPermissions = { equipe: boolean; manager: boolean; assinatura: boolean };

export function allowedEntries(perm: SearchPermissions): SearchEntry[] {
  return SEARCH_CATALOG.filter((e) => !e.requires || perm[e.requires]);
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function searchCatalog(query: string, entries: SearchEntry[]): SearchEntry[] {
  const q = norm(query).trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored: { e: SearchEntry; s: number }[] = [];
  for (const e of entries) {
    const title = norm(e.title);
    const desc = norm(e.description);
    const kw = norm((e.keywords ?? []).join(" "));
    let s = 0;
    let all = true;
    for (const t of terms) {
      const stem = t.length > 5 ? t.slice(0, -2) : t;
      const ts = title.startsWith(stem) ? 10 : title.includes(stem) ? 6 : 0;
      const k = kw.includes(stem) ? 4 : 0;
      const d = desc.includes(stem) ? 2 : 0;
      if (!ts && !k && !d) all = false;
      s += ts + k + d;
    }
    if (all) scored.push({ e, s });
  }
  return scored.sort((a, b) => b.s - a.s).map((x) => x.e);
}
