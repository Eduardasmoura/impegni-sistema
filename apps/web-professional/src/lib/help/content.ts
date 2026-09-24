import type { HelpArticle, HelpCategory } from "./types";

// Conteúdo da Central de Ajuda. Cada artigo descreve o comportamento REAL do
// painel (nomes de telas, botões e regras conferidos no código). Ao mudar
// uma tela, revise o artigo correspondente. Links (`href`) apontam só para
// rotas que existem.

const UPDATED = "2026-09-24";

export const HELP_CATEGORIES: HelpCategory[] = [
  { slug: "primeiros-passos", title: "Primeiros passos", description: "Deixe seu negócio pronto para receber agendamentos.", status: "available", order: 1 },
  { slug: "meu-estabelecimento", title: "Meu estabelecimento", description: "Identidade visual, informações e link de agendamento.", status: "available", order: 2 },
  { slug: "agenda", title: "Agenda", description: "Crie, acompanhe e finalize seus atendimentos.", status: "available", order: 3 },
  { slug: "clientes", title: "Clientes", description: "Cadastro, histórico e ficha dos seus clientes.", status: "available", order: 4 },
  { slug: "financeiro", title: "Financeiro", description: "Receitas, despesas, pagamentos e comissões.", status: "available", order: 5 },
  { slug: "pagamentos", title: "Pagamentos", description: "Caução de agendamento e formas de pagamento.", status: "available", order: 6 },
  { slug: "pacotes-recorrentes", title: "Pacotes recorrentes", description: "Planos mensais com créditos de atendimento para seus clientes.", status: "coming_soon", order: 7 },
  { slug: "anamnese", title: "Anamnese", description: "Fichas de anamnese e perguntas personalizadas.", status: "available", order: 8 },
  { slug: "relatorios", title: "Relatórios", description: "Indicadores do negócio, filtros e exportação.", status: "available", order: 9 },
  { slug: "marketing", title: "Marketing", description: "Campanhas, cupons e segmentação de clientes.", status: "available", order: 10 },
  { slug: "notificacoes", title: "Notificações", description: "Avisos da equipe Impegni e lembretes para clientes.", status: "available", order: 11 },
  { slug: "minha-conta", title: "Minha conta", description: "Seus dados, senha e acesso.", status: "available", order: 12 },
];

const a = (x: Omit<HelpArticle, "id" | "published" | "updatedAt">): HelpArticle => ({ ...x, id: x.slug, published: true, updatedAt: UPDATED });

export const HELP_ARTICLES: HelpArticle[] = [
  // ───────────────────────── Primeiros passos
  a({
    category: "primeiros-passos", slug: "como-comecar", order: 1, readingMinutes: 3, featured: true,
    title: "Como começar a usar o Impegni",
    description: "O caminho mais rápido para deixar seu negócio pronto para receber o primeiro agendamento.",
    keywords: ["inicio", "comecar", "configuracao inicial", "checklist", "onboarding"],
    steps: [
      { title: "Abra o guia de configuração no Início", body: "Na tela Início, o card \"Complete seu estabelecimento\" mostra uma lista de tarefas com o que já foi feito e o que falta: perfil, horário, serviço, profissional, agenda, link de agendamento, primeiro cliente e primeiro atendimento.", href: "/dashboard", cta: "Ir para o Início" },
      { title: "Configure seu estabelecimento", body: "Em Meu estabelecimento, adicione logo, capa, cores e as informações do negócio. É isso que seus clientes veem na sua página de agendamento.", href: "/configuracao", cta: "Abrir Meu estabelecimento" },
      { title: "Cadastre seus serviços", body: "Em Serviços, cadastre o que você oferece, com duração e preço. Só serviços marcados como ativos aparecem para o cliente agendar.", href: "/servicos", cta: "Abrir Serviços" },
      { title: "Confira os profissionais e horários", body: "Em Equipe, cada profissional tem início e fim de expediente e, se precisar, horários diferentes por dia da semana. A agenda só oferece horários dentro do expediente.", href: "/equipe", cta: "Abrir Equipe" },
      { title: "Compartilhe seu link de agendamento", body: "Seu link público aparece no topo de Meu estabelecimento e no guia do Início, com o botão Copiar. Envie para seus clientes no WhatsApp, Instagram ou onde preferir.", href: "/configuracao", cta: "Ver meu link" },
    ],
    tips: ["Quando todas as tarefas estiverem concluídas, o card mostra \"Configuração completa!\". Você pode recolher o guia a qualquer momento."],
  }),
  a({
    category: "primeiros-passos", slug: "configurar-estabelecimento", order: 2, readingMinutes: 3,
    title: "Como configurar meu estabelecimento",
    description: "Logo, capa, cores, segmento e informações de contato do seu negócio.",
    keywords: ["logo", "capa", "cores", "identidade visual", "endereco", "whatsapp", "instagram", "horario de funcionamento"],
    steps: [
      { title: "Acesse Meu estabelecimento", body: "No menu lateral, em Negócio, clique em Meu estabelecimento. A tela se chama Identidade visual.", href: "/configuracao", cta: "Abrir Meu estabelecimento" },
      { title: "Envie logo e capa", body: "Clique no quadrado do logo para enviar a imagem e em \"Trocar capa\" para a imagem de fundo. Fotos grandes são reduzidas automaticamente antes do envio." },
      { title: "Escolha as cores", body: "Em Paletas de cores, escolha uma paleta pronta ou ajuste as cores Primária, Secundária e Acento manualmente." },
      { title: "Selecione o segmento", body: "Em Segmento, escolha a área de atuação do seu negócio (por exemplo, Manicure ou Salão de Beleza)." },
      { title: "Preencha as informações", body: "Em Informações, informe nome do estabelecimento, telefone, WhatsApp, endereço, Instagram e horário de funcionamento." },
      { title: "Salve", body: "Clique em \"Salvar identidade\" no final da página. As mudanças passam a valer na sua página de agendamento." },
    ],
    tips: ["O horário de funcionamento desta tela é informativo para o cliente. Os horários que a agenda realmente oferece vêm do expediente de cada profissional, em Equipe."],
  }),
  a({
    category: "primeiros-passos", slug: "primeiro-servico", order: 3, readingMinutes: 2,
    title: "Como cadastrar meu primeiro serviço",
    description: "Cadastre um serviço com duração e preço para que ele possa ser agendado.",
    keywords: ["servico", "preco", "duracao", "catalogo", "novo servico"],
    steps: [
      { title: "Abra Serviços", body: "No menu lateral, clique em Serviços.", href: "/servicos", cta: "Abrir Serviços" },
      { title: "Clique em \"Novo serviço\"", body: "Se ainda não houver nenhum serviço, use \"Adicionar primeiro serviço\"." },
      { title: "Preencha os dados", body: "Informe Nome, Categoria, Tipo (Serviço avulso ou Pacote), Duração (min) e Preço. A Descrição é opcional e aparece para o cliente antes de agendar. Você também pode enviar uma foto." },
      { title: "Deixe o serviço ativo", body: "Mantenha marcada a opção \"Ativo (aparece pro cliente agendar)\". Serviços inativos não aparecem na página de agendamento." },
      { title: "Salve", body: "O serviço passa a aparecer na lista e já pode ser usado na agenda." },
    ],
    tips: ["A duração define o tamanho do bloco na agenda e quais horários ficam livres para outros agendamentos.", "Se a sua empresa usa anamnese, você pode vincular uma ficha ao serviço no campo \"Ficha de anamnese\"."],
  }),
  a({
    category: "primeiros-passos", slug: "primeiro-cliente", order: 4, readingMinutes: 2,
    title: "Como cadastrar meu primeiro cliente",
    description: "Adicione um cliente manualmente pela tela de Clientes.",
    keywords: ["cliente", "cadastro", "novo cliente"],
    steps: [
      { title: "Abra Clientes", body: "No menu lateral, clique em Clientes.", href: "/clientes", cta: "Abrir Clientes" },
      { title: "Clique em \"Adicionar cliente\"", body: "O formulário de novo cliente será aberto." },
      { title: "Preencha os dados", body: "Informe o Nome e, se tiver, Telefone, E-mail, Data de nascimento e Observações (preferências, alergias conhecidas etc.)." },
      { title: "Salve", body: "O cliente aparece na lista e pode ser selecionado nos agendamentos." },
    ],
    tips: ["Clientes que agendam pela sua página online são cadastrados automaticamente. Eles aparecem com a indicação \"Tem conta própria\"."],
  }),
  a({
    category: "primeiros-passos", slug: "primeiro-agendamento", order: 5, readingMinutes: 2,
    title: "Como criar meu primeiro agendamento",
    description: "Marque um atendimento direto pela Agenda.",
    keywords: ["agendamento", "marcar horario", "novo agendamento"],
    steps: [
      { title: "Abra a Agenda", body: "No menu lateral, clique em Agenda. Escolha o dia no calendário ou com as setas.", href: "/agenda", cta: "Abrir Agenda" },
      { title: "Clique em \"Novo agendamento\"", body: "O botão fica desabilitado em dias que já passaram." },
      { title: "Informe cliente, serviço, profissional e horário", body: "Digite o nome e o telefone do cliente, escolha o serviço, o profissional e um dos horários disponíveis." },
      { title: "Confirme", body: "O atendimento aparece na agenda do dia com o status Agendado." },
    ],
    tips: ["Se o telefone informado já pertence a um cliente cadastrado, o agendamento é vinculado a ele, sem criar um cadastro duplicado."],
  }),

  // ───────────────────────── Meu estabelecimento
  a({
    category: "meu-estabelecimento", slug: "link-de-agendamento", order: 1, readingMinutes: 2, featured: true,
    title: "Como compartilhar meu link de agendamento",
    description: "Seus clientes agendam sozinhos por um endereço exclusivo do seu negócio.",
    keywords: ["link", "pagina publica", "agendamento online", "compartilhar", "whatsapp", "instagram"],
    steps: [
      { title: "Encontre seu link", body: "No topo de Meu estabelecimento há o card \"Link público\", com o endereço do seu negócio (seunegocio.impegni.com.br).", href: "/configuracao", cta: "Ver meu link" },
      { title: "Confira a página", body: "Clique em \"Abrir\" para ver a página exatamente como o cliente vê." },
      { title: "Compartilhe", body: "Copie o endereço e envie para seus clientes. O guia do Início também tem o botão Copiar." },
      { title: "Como o cliente agenda", body: "Na página, o cliente escolhe o profissional, o serviço, o dia e o horário. Para confirmar, ele entra ou cria uma conta. Nome e telefone já cadastrados não são pedidos de novo." },
    ],
  }),
  a({
    category: "meu-estabelecimento", slug: "recursos-do-estabelecimento", order: 2, readingMinutes: 2,
    title: "Como ativar os recursos do estabelecimento",
    description: "Programa de fidelidade, lembrete por WhatsApp e ficha de anamnese.",
    keywords: ["fidelidade", "lembrete", "whatsapp", "recursos", "anamnese"],
    steps: [
      { title: "Abra Meu estabelecimento", body: "Role até o card Recursos.", href: "/configuracao", cta: "Abrir Meu estabelecimento" },
      { title: "Programa de fidelidade", body: "Ative para acumular pontos a cada visita." },
      { title: "Lembrete WhatsApp", body: "Ative para enviar lembretes aos clientes. É um serviço cobrado à parte." },
      { title: "Ficha de Anamnese", body: "Mostra se o recurso está liberado para a sua empresa. A liberação é feita pela equipe Impegni." },
      { title: "Salve", body: "Clique em \"Salvar identidade\" para gravar as alterações." },
    ],
  }),

  // ───────────────────────── Agenda
  a({
    category: "agenda", slug: "criar-agendamento", order: 1, readingMinutes: 2,
    title: "Como criar um agendamento",
    description: "Marque atendimentos pela Agenda, escolhendo cliente, serviço, profissional e horário.",
    keywords: ["novo agendamento", "marcar", "horario", "encaixe"],
    steps: [
      { title: "Escolha o dia", body: "Na Agenda, use o calendário do mês ou os botões \"Dia anterior\", \"Hoje\" e \"Próximo dia\".", href: "/agenda", cta: "Abrir Agenda" },
      { title: "Clique em \"Novo agendamento\"", body: "Disponível para hoje e dias futuros." },
      { title: "Preencha o agendamento", body: "Informe nome e telefone do cliente, o serviço, o profissional e o horário." },
      { title: "Confirme", body: "O atendimento entra na agenda como Agendado. Se o horário foi ocupado nesse meio tempo, o sistema avisa e não cria o agendamento." },
    ],
    tips: ["A Agenda não permite dois atendimentos do mesmo profissional no mesmo horário.", "Folgas, férias e bloqueios cadastrados em \"Bloqueios, folgas e férias\" também impedem agendamentos no período."],
  }),
  a({
    category: "agenda", slug: "confirmar-agendamento", order: 2, readingMinutes: 2,
    title: "Como confirmar um agendamento",
    description: "Entenda o status Agendado e como confirmar o caução, quando você o utiliza.",
    keywords: ["confirmar", "confirmacao", "status", "agendado", "caucao"],
    steps: [
      { title: "O agendamento já nasce confirmado", body: "No Impegni não existe uma etapa separada de confirmação: todo atendimento criado por você ou pelo cliente entra com o status Agendado e já ocupa o horário na agenda." },
      { title: "Lembre o cliente", body: "Se o Lembrete WhatsApp estiver ativo (Configurações > Notificações), o cliente recebe um lembrete automático antes do horário.", href: "/notificacoes", cta: "Ver Notificações" },
      { title: "Se você cobra caução", body: "Quando o cliente agenda online e informa que pagou o caução, abra o atendimento na Agenda e use \"Confirmar pagamento\" ou \"Recusar pagamento\" no bloco Caução.", href: "/agenda", cta: "Abrir Agenda" },
    ],
  }),
  a({
    category: "agenda", slug: "concluir-atendimento", order: 3, readingMinutes: 2,
    title: "Como concluir um atendimento",
    description: "Marque o atendimento como em andamento e depois como finalizado.",
    keywords: ["concluir", "finalizar", "iniciar", "em andamento", "status"],
    steps: [
      { title: "Abra o atendimento", body: "Na Agenda, clique no bloco do atendimento para abrir os detalhes.", href: "/agenda", cta: "Abrir Agenda" },
      { title: "Inicie (opcional)", body: "Clique em \"Iniciar\" quando o cliente chegar. O status muda para Em andamento. Se foi engano, use \"Voltar para agendado\"." },
      { title: "Conclua", body: "Clique em \"Concluir\". O status muda para Finalizado e o atendimento entra nos indicadores e relatórios." },
    ],
  }),
  a({
    category: "agenda", slug: "cancelar-agendamento", order: 4, readingMinutes: 2,
    title: "Como cancelar ou reagendar um agendamento",
    description: "Cancele um atendimento ou mude para outro horário.",
    keywords: ["cancelar", "cancelamento", "reagendar", "remarcar", "mudar horario"],
    steps: [
      { title: "Abra o atendimento", body: "Na Agenda, clique no bloco do atendimento.", href: "/agenda", cta: "Abrir Agenda" },
      { title: "Para cancelar", body: "Clique em \"Cancelar\". O horário fica livre para outros agendamentos e o atendimento aparece riscado na agenda." },
      { title: "Para reagendar", body: "Clique em \"Reagendar\", escolha o novo dia e um dos horários disponíveis e clique em \"Confirmar novo horário\"." },
    ],
    tips: ["Clientes também podem cancelar ou reagendar os próprios agendamentos pela área deles.", "Um caução ainda não confirmado é marcado como cancelado junto com o agendamento. Nenhum valor é devolvido automaticamente."],
  }),
  a({
    category: "agenda", slug: "visualizar-agenda", order: 5, readingMinutes: 2,
    title: "Como visualizar minha agenda",
    description: "Navegue pelos dias, veja a ocupação do mês e filtre atendimentos.",
    keywords: ["agenda", "calendario", "filtro", "ocupacao", "profissional"],
    steps: [
      { title: "Calendário do mês", body: "O calendário mostra a ocupação de cada dia. Clique em um dia para ver os atendimentos.", href: "/agenda", cta: "Abrir Agenda" },
      { title: "Linha do tempo do dia", body: "Os atendimentos aparecem como blocos no horário, com nome do cliente, serviço e duração. Bloqueios, folgas e férias também aparecem na linha do tempo." },
      { title: "Escolha o profissional", body: "A agenda abre no profissional ligado ao seu usuário. Você pode trocar no seletor de profissional." },
      { title: "Use os filtros", body: "Em Filtros, filtre por Cliente, Serviço e Status. Use \"Limpar\" para voltar a ver tudo." },
    ],
  }),

  // ───────────────────────── Clientes
  a({
    category: "clientes", slug: "cadastrar-cliente", order: 1, readingMinutes: 2,
    title: "Como cadastrar um cliente",
    description: "Adicione clientes e encontre qualquer cadastro pela busca.",
    keywords: ["cadastrar", "novo cliente", "adicionar cliente", "busca"],
    steps: [
      { title: "Abra Clientes", body: "No menu lateral, clique em Clientes.", href: "/clientes", cta: "Abrir Clientes" },
      { title: "Clique em \"Adicionar cliente\"", body: "Preencha Nome, Telefone, E-mail, Data de nascimento e Observações." },
      { title: "Salve", body: "Use a busca por nome, telefone ou e-mail e os filtros (agendamento futuro, ficha de anamnese, inativos) para encontrar clientes." },
    ],
  }),
  a({
    category: "clientes", slug: "editar-cliente", order: 2, readingMinutes: 1,
    title: "Como editar os dados de um cliente",
    description: "Atualize nome, contato e observações de um cliente.",
    keywords: ["editar", "alterar dados", "telefone", "observacoes"],
    steps: [
      { title: "Abra o cliente", body: "Em Clientes, clique no cliente (ou em \"Ver cliente\").", href: "/clientes", cta: "Abrir Clientes" },
      { title: "Clique em \"Editar cliente\"", body: "Altere os dados e salve." },
    ],
    tips: ["Excluir um cliente o remove da lista ativa; o histórico de atendimentos é mantido."],
  }),
  a({
    category: "clientes", slug: "historico-cliente", order: 3, readingMinutes: 2,
    title: "Como visualizar o histórico do cliente",
    description: "Veja atendimentos passados, próximos agendamentos e o resumo do cliente.",
    keywords: ["historico", "atendimentos", "gasto", "ultimo atendimento"],
    steps: [
      { title: "Abra a ficha do cliente", body: "Em Clientes, clique no cliente.", href: "/clientes", cta: "Abrir Clientes" },
      { title: "Visão geral", body: "Mostra total de agendamentos, concluídos, cancelamentos/não compareceu, valor total gasto, último atendimento e próximo agendamento." },
      { title: "Aba Agendamentos", body: "Lista os Próximos agendamentos e o Histórico de atendimentos anteriores." },
    ],
  }),
  a({
    category: "clientes", slug: "consultar-ficha-anamnese", order: 4, readingMinutes: 2,
    title: "Como consultar a ficha/anamnese do cliente",
    description: "Veja e preencha fichas de anamnese dentro da ficha do cliente.",
    keywords: ["anamnese", "ficha", "historico de fichas"],
    steps: [
      { title: "Abra o cliente", body: "Em Clientes, clique no cliente.", href: "/clientes", cta: "Abrir Clientes" },
      { title: "Aba Anamnese", body: "Em \"Histórico de fichas\" ficam as fichas já preenchidas. Use \"Nova ficha\" para preencher uma nova." },
      { title: "Serviço do atendimento", body: "A ficha sugerida é a do serviço do próximo atendimento do cliente. Você pode escolher outro serviço antes de preencher." },
    ],
    tips: ["Se aparecer \"Anamnese não disponível no seu plano\", o recurso ainda não foi liberado para sua empresa. Fale com o suporte."],
  }),

  // ───────────────────────── Financeiro
  a({
    category: "financeiro", slug: "acompanhar-recebimentos", order: 1, readingMinutes: 3,
    title: "Como acompanhar meus recebimentos",
    description: "Veja cada pagamento com o status do atendimento e do pagamento lado a lado.",
    keywords: ["recebimentos", "pagamentos", "pendente", "pago", "receita recebida"],
    steps: [
      { title: "Abra o Financeiro > Pagamentos", body: "No menu lateral, clique em Financeiro e abra a aba Pagamentos.", href: "/financeiro", cta: "Abrir Financeiro" },
      { title: "Entenda as colunas", body: "Atendimento e pagamento são coisas diferentes: um atendimento pode estar concluído com o pagamento ainda pendente. A tabela mostra os dois status lado a lado, com data, cliente, serviço, profissional, forma e valor." },
      { title: "Filtre", body: "Filtre por status, forma de pagamento, profissional e serviço." },
      { title: "Cobranças online", body: "Pagamentos feitos online têm o botão \"Ver cobrança\" para abrir a cobrança." },
    ],
    tips: ["Na Visão geral, os cards \"Receita recebida\" e \"Valores pendentes\" resumem o período selecionado."],
  }),
  a({
    category: "financeiro", slug: "consultar-financeiro", order: 2, readingMinutes: 3,
    title: "Como consultar meu financeiro",
    description: "Visão geral, receitas, despesas, fluxo de caixa e comissões.",
    keywords: ["financeiro", "lucro", "despesas", "fluxo de caixa", "comissoes", "ticket medio"],
    steps: [
      { title: "Abra o Financeiro", body: "No menu lateral, clique em Financeiro.", href: "/financeiro", cta: "Abrir Financeiro" },
      { title: "Escolha o período", body: "Em \"Filtros do período\", escolha Este mês, Trimestre, Ano ou um intervalo de datas. Também dá para filtrar por serviço e profissional. Os filtros afetam Visão geral, Fluxo de caixa e Relatórios." },
      { title: "Visão geral", body: "Mostra Receita bruta, Despesas, Lucro líquido, Receita recebida, Comissões, Ticket médio e Valores pendentes." },
      { title: "Demais abas", body: "Receitas, Despesas, Pagamentos, Fluxo de caixa e Comissões detalham cada parte." },
    ],
  }),
  a({
    category: "financeiro", slug: "relatorios-financeiros", order: 3, readingMinutes: 2,
    title: "Como utilizar os relatórios financeiros",
    description: "Receita por serviço, categoria, profissional e forma de pagamento.",
    keywords: ["relatorio financeiro", "receita por servico", "receita por profissional"],
    steps: [
      { title: "Abra a aba Relatórios do Financeiro", body: "Em Financeiro, abra a aba Relatórios.", href: "/financeiro", cta: "Abrir Financeiro" },
      { title: "Analise", body: "Veja Receita por serviço, por categoria de serviço, por profissional e por forma de pagamento, Despesas por categoria e a Evolução financeira no período." },
      { title: "Comissões", body: "O relatório de comissão fica na aba Comissões." },
    ],
    tips: ["Para exportar em PDF ou Excel, use a área Relatórios do menu lateral."],
  }),

  // ───────────────────────── Pagamentos (caução)
  a({
    category: "pagamentos", slug: "configurar-caucao", order: 1, readingMinutes: 3, featured: true,
    title: "Como configurar o caução de agendamento",
    description: "Cobre um sinal para confirmar os agendamentos feitos online, pago direto a você.",
    keywords: ["caucao", "sinal", "pix", "link de pagamento", "recebimentos"],
    steps: [
      { title: "Abra Recebimentos / Caução", body: "Em Meu estabelecimento, role até a seção \"Recebimentos / Caução\". Só o proprietário ou administrador pode configurar.", href: "/configuracao#caucao", cta: "Configurar caução" },
      { title: "Ative e escolha o percentual", body: "Selecione \"Cobrar caução\" e escolha 10%, 20%, 30% ou \"Outro\". O percentual é aplicado sobre o preço do serviço, antes de qualquer cupom." },
      { title: "Escolha como receber", body: "Pix: informe tipo da chave, chave e nome do recebedor (o QR Code é opcional). Link de pagamento: informe um link https de qualquer provedor que você já usa." },
      { title: "Salve", body: "Clique em \"Salvar caução\". A partir daí, quem agenda online vê o valor do caução e precisa declarar que pagou para confirmar." },
    ],
    tips: ["O Impegni não processa esse pagamento: o cliente paga direto a você, pela forma cadastrada.", "Agendamentos criados por você na Agenda não geram caução."],
    faqs: [
      { q: "O cliente consegue confirmar sem pagar?", a: "Ele precisa marcar \"Confirmo que realizei o pagamento do caução\". Como o pagamento é externo, confira no seu banco e depois confirme ou recuse na Agenda." },
      { q: "E se o agendamento for cancelado?", a: "Um caução ainda não confirmado passa a \"cancelado\". Um caução já confirmado continua como confirmado, e a devolução, se houver, é combinada entre você e o cliente." },
    ],
  }),
  a({
    category: "pagamentos", slug: "confirmar-caucao", order: 2, readingMinutes: 2,
    title: "Como confirmar ou recusar um caução",
    description: "Confira o pagamento informado pelo cliente e registre sua decisão.",
    keywords: ["caucao", "confirmar pagamento", "recusar pagamento", "sinal"],
    steps: [
      { title: "Identifique na Agenda", body: "Atendimentos com caução têm uma bolinha no canto do bloco: amarela (aguardando), verde (confirmado) ou vermelha (recusado).", href: "/agenda", cta: "Abrir Agenda" },
      { title: "Abra o atendimento", body: "O bloco Caução mostra o status, o valor e se o cliente informou o pagamento." },
      { title: "Confira e decida", body: "Verifique no seu banco ou provedor e clique em \"Confirmar pagamento\" ou \"Recusar pagamento\"." },
    ],
  }),

  // ───────────────────────── Anamnese
  a({
    category: "anamnese", slug: "configurar-ficha", order: 1, readingMinutes: 3,
    title: "Como configurar uma ficha de anamnese",
    description: "Monte as perguntas da ficha preenchida com o cliente.",
    keywords: ["anamnese", "perguntas", "ficha", "formulario"],
    steps: [
      { title: "Abra Anamnese", body: "No menu lateral, em Operação, clique em Anamnese.", href: "/anamnese", cta: "Abrir Anamnese" },
      { title: "Adicione perguntas", body: "Clique em \"Nova pergunta\", escreva a pergunta e escolha o tipo de resposta: Texto curto, Texto longo, Número, Data, Sim / Não, Seleção única ou Múltipla escolha. Marque \"Obrigatória\" se necessário." },
      { title: "Organize", body: "Use \"Mover pra cima\" e \"Mover pra baixo\" para ordenar as perguntas. Edite ou exclua quando quiser." },
    ],
    tips: ["Personalizar as perguntas depende do seu plano. Se aparecer \"Fazer upgrade para personalizar\", sua empresa usa a ficha padrão."],
  }),
  a({
    category: "anamnese", slug: "associar-ficha-servico", order: 2, readingMinutes: 2,
    title: "Como associar uma ficha a um serviço",
    description: "Defina qual ficha é sugerida para cada serviço.",
    keywords: ["anamnese", "servico", "vincular ficha"],
    steps: [
      { title: "Abra Serviços", body: "No menu lateral, clique em Serviços.", href: "/servicos", cta: "Abrir Serviços" },
      { title: "Edite o serviço", body: "Clique em Editar no serviço desejado." },
      { title: "Escolha a ficha", body: "No campo \"Ficha de anamnese\", selecione a ficha (ou Nenhuma) e salve." },
    ],
    tips: ["Ao preencher uma nova ficha na ficha do cliente, o Impegni sugere a ficha vinculada ao serviço do atendimento."],
  }),
  a({
    category: "anamnese", slug: "consultar-anamnese-cliente", order: 3, readingMinutes: 1,
    title: "Como consultar a anamnese do cliente",
    description: "Veja as fichas já preenchidas de um cliente.",
    keywords: ["anamnese", "cliente", "consultar ficha"],
    steps: [
      { title: "Abra o cliente", body: "Em Clientes, clique no cliente.", href: "/clientes", cta: "Abrir Clientes" },
      { title: "Aba Anamnese", body: "Em \"Histórico de fichas\" estão todas as fichas preenchidas, da mais recente para a mais antiga." },
    ],
  }),

  // ───────────────────────── Relatórios
  a({
    category: "relatorios", slug: "acessar-relatorios", order: 1, readingMinutes: 2,
    title: "Como acessar os relatórios",
    description: "A central de análise do seu negócio.",
    keywords: ["relatorios", "indicadores", "analise"],
    steps: [
      { title: "Abra Relatórios", body: "No menu lateral, em Principal, clique em Relatórios.", href: "/relatorios", cta: "Abrir Relatórios" },
      { title: "Escolha um relatório", body: "Os relatórios estão organizados por tema: Visão geral, Financeiro, Agendamentos, Clientes, Serviços, Equipe, Estoque e Marketing. Clique em \"Abrir relatório →\"." },
      { title: "Ajuste o período", body: "Use o filtro de período, de Hoje até Este ano, ou Personalizado." },
    ],
  }),
  a({
    category: "relatorios", slug: "gerar-relatorio", order: 2, readingMinutes: 2,
    title: "Como gerar um relatório",
    description: "Escolha o relatório, o período e os filtros para ver os números do seu negócio.",
    keywords: ["gerar relatorio", "periodo", "filtros", "indicadores"],
    steps: [
      { title: "Abra o relatório", body: "Em Relatórios, escolha o tema e clique em \"Abrir relatório →\" no relatório desejado.", href: "/relatorios", cta: "Abrir Relatórios" },
      { title: "Defina o período", body: "Escolha Hoje, 7 dias, 30 dias, Este mês, Mês anterior, Este trimestre, Este ano ou Personalizado (com datas de início e fim)." },
      { title: "Aplique filtros", body: "Em Filtros, refine por profissional, serviço, status e forma de pagamento, quando o relatório permitir." },
      { title: "Analise e exporte", body: "Os números são recalculados na hora. Use Exportar para baixar em PDF ou Excel." },
    ],
  }),
  a({
    category: "relatorios", slug: "exportar-pdf", order: 3, readingMinutes: 1,
    title: "Como exportar para PDF",
    description: "Baixe qualquer relatório em PDF.",
    keywords: ["pdf", "exportar", "baixar relatorio", "compartilhar"],
    steps: [
      { title: "Abra o relatório", body: "Em Relatórios, abra o relatório desejado.", href: "/relatorios", cta: "Abrir Relatórios" },
      { title: "Exporte", body: "Clique em Exportar e escolha PDF. O download começa automaticamente." },
      { title: "Compartilhe (opcional)", body: "Em Compartilhar > WhatsApp, o PDF é baixado e o compartilhamento do seu dispositivo é aberto." },
    ],
  }),
  a({
    category: "relatorios", slug: "exportar-excel", order: 4, readingMinutes: 1,
    title: "Como exportar para Excel",
    description: "Baixe os dados de um relatório em planilha .xlsx.",
    keywords: ["excel", "xlsx", "planilha", "exportar"],
    steps: [
      { title: "Abra o relatório", body: "Em Relatórios, abra o relatório desejado.", href: "/relatorios", cta: "Abrir Relatórios" },
      { title: "Exporte", body: "Clique em Exportar e escolha \"Excel (.xlsx)\"." },
    ],
  }),

  // ───────────────────────── Marketing
  a({
    category: "marketing", slug: "recursos-marketing", order: 1, readingMinutes: 2,
    title: "Como utilizar os recursos de marketing",
    description: "Avaliações, cupons, campanhas e segmentação de clientes.",
    keywords: ["marketing", "cupom", "campanha", "avaliacoes", "segmentacao"],
    steps: [
      { title: "Campanhas", body: "Aniversário, datas comemorativas e ações personalizadas, com a lista de clientes para contatar pelo WhatsApp.", href: "/marketing", cta: "Abrir Campanhas" },
      { title: "Cupons", body: "Crie descontos percentuais ou de valor fixo, com validade, limite de usos e serviços/profissionais aplicáveis. O cliente usa o código ao agendar online.", href: "/cupons", cta: "Abrir Cupons" },
      { title: "Segmentação", body: "Listas prontas de clientes Inativos, Recorrentes, Novos e que Não retornaram.", href: "/clientes/segmentos", cta: "Abrir Segmentação" },
      { title: "Avaliações", body: "Acompanhe as avaliações dos seus clientes.", href: "/avaliacoes", cta: "Abrir Avaliações" },
    ],
    tips: ["Campanhas só podem ser acessadas pelo proprietário ou administrador da empresa."],
  }),
  a({
    category: "marketing", slug: "criar-campanha", order: 2, readingMinutes: 3,
    title: "Como criar uma ação de marketing",
    description: "Crie uma campanha e contate os clientes certos pelo WhatsApp.",
    keywords: ["campanha", "promocao", "aniversario", "whatsapp", "mensagem"],
    steps: [
      { title: "Abra Campanhas", body: "No menu lateral, em Marketing, clique em Campanhas.", href: "/marketing", cta: "Abrir Campanhas" },
      { title: "Clique em \"Nova campanha\"", body: "Escolha qual campanha você quer criar." },
      { title: "Configure", body: "Informe Nome da campanha, Mensagem (use {nome} para inserir o nome do cliente) e o período de Início e Fim. Deixe \"Campanha ativa\" marcado." },
      { title: "Contate os clientes", body: "Em \"Clientes para contatar\", use o botão WhatsApp em cada cliente para enviar a mensagem." },
    ],
  }),

  // ───────────────────────── Notificações
  a({
    category: "notificacoes", slug: "ver-notificacoes", order: 1, readingMinutes: 1,
    title: "Como visualizar minhas notificações",
    description: "Avisos e novidades enviados pela equipe Impegni.",
    keywords: ["notificacoes", "avisos", "sino", "novidades"],
    steps: [
      { title: "Clique no sino", body: "O sino fica no topo do menu lateral (no celular, no cabeçalho). Ele mostra as notificações mais recentes." },
      { title: "Abra uma notificação", body: "Clique para ler a mensagem completa. Ela é marcada como lida." },
      { title: "Veja todas", body: "Clique em \"Ver todas as notificações\" para abrir a lista completa.", href: "/avisos", cta: "Ver notificações" },
    ],
  }),
  a({
    category: "notificacoes", slug: "identificar-novas", order: 2, readingMinutes: 1,
    title: "Como identificar novas notificações",
    description: "Saiba quando há avisos que você ainda não leu.",
    keywords: ["nao lidas", "contador", "marcar como lida"],
    steps: [
      { title: "Contador no sino", body: "Um número sobre o sino mostra quantas notificações não foram lidas." },
      { title: "Marcador na lista", body: "Notificações não lidas aparecem em destaque, com um ponto colorido." },
      { title: "Marque como lidas", body: "Use \"Marcar todas como lidas\" para zerar o contador.", href: "/avisos", cta: "Ver notificações" },
    ],
    tips: ["O lembrete automático para clientes é configurado em Configurações > Notificações."],
  }),

  // ───────────────────────── Minha conta
  a({
    category: "minha-conta", slug: "alterar-dados", order: 1, readingMinutes: 1,
    title: "Como alterar meus dados",
    description: "Atualize foto, nome, telefone e e-mail da sua conta.",
    keywords: ["perfil", "foto", "nome", "telefone", "email", "minha conta"],
    steps: [
      { title: "Abra Minha conta", body: "No menu lateral, em Conta, clique em Minha conta.", href: "/perfil", cta: "Abrir Minha conta" },
      { title: "Atualize", body: "Clique na foto para trocar. Altere Nome completo, Telefone / WhatsApp e Email e salve." },
    ],
  }),
  a({
    category: "minha-conta", slug: "alterar-senha", order: 2, readingMinutes: 1,
    title: "Como alterar minha senha",
    description: "Troque sua senha estando logado.",
    keywords: ["senha", "trocar senha", "seguranca"],
    steps: [
      { title: "Abra Minha conta ou Segurança", body: "A troca de senha fica em Minha conta e também em Configurações > Segurança.", href: "/perfil", cta: "Abrir Minha conta" },
      { title: "Digite a nova senha", body: "Informe a nova senha, confirme e salve. As duas precisam ser iguais." },
    ],
  }),
  a({
    category: "minha-conta", slug: "recuperar-senha", order: 3, readingMinutes: 2,
    title: "Como recuperar minha senha",
    description: "Esqueceu a senha? Crie uma nova pelo link enviado por e-mail.",
    keywords: ["esqueci a senha", "recuperar", "redefinir senha", "login"],
    steps: [
      { title: "Na tela de login", body: "Clique em \"Esqueceu a senha?\"." },
      { title: "Informe seu e-mail", body: "Digite o e-mail da sua conta. Se ele existir, enviamos um link para redefinir a senha." },
      { title: "Abra o link", body: "No e-mail, clique no link e crie a nova senha." },
    ],
    tips: ["Não recebeu? Confira a caixa de spam e se o e-mail digitado está correto."],
  }),
];
