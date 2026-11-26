/**
 * Dicionário PT (fonte do tipo). `en.ts` é verificado contra `Dictionary`.
 * Somente fatos de docs/content/profile.md; demais itens são placeholders.
 */
export const pt = {
  meta: {
    title: "Matheus Lopes Spíndola — Desenvolvedor Backend",
    description:
      "Portfólio de Matheus Lopes Spíndola, estudante de Engenharia de Software (UniCEUB) com foco em backend, APIs e bancos de dados. Java, Spring Boot e SQL.",
    siteName: "Matheus Lopes Spíndola",
  },
  a11y: {
    skipToContent: "Pular para o conteúdo",
    primaryNav: "Navegação principal",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    scrollProgress: "Progresso de leitura",
    switchLanguage: "Mudar idioma para inglês",
    currentLanguage: "Idioma atual: português",
    close: "Fechar",
    externalLink: "abre em nova aba",
  },
  nav: {
    about: "Sobre",
    projects: "Projetos",
    lab: "Lab",
    stack: "Stack",
    journey: "Trajetória",
    contact: "Contato",
    home: "Início",
  },
  hero: {
    eyebrow: "Portfólio — Brasília, Brasil",
    name: "Matheus Lopes Spíndola",
    role: "Desenvolvedor Backend",
    headline: "Engenharia além do que se vê.",
    bio: "Sou estudante de Engenharia de Software com foco em desenvolvimento Backend, construção de APIs e bancos de dados. Busco desenvolver aplicações eficientes, organizadas e confiáveis, utilizando boas práticas de engenharia de software.",
    ctaProjects: "Ver projetos",
    ctaContact: "Entrar em contato",
    scrollHint: "Role para explorar",
    visualLabel: "Composição visual de três anéis de vidro entrelaçados",
  },
  about: {
    eyebrow: "01 — Sobre",
    title: "Backend como ofício: APIs claras, dados bem modelados.",
    lead: "Sou estudante de Engenharia de Software com foco em desenvolvimento Backend, construção de APIs e bancos de dados.",
    body: "Busco desenvolver aplicações eficientes, organizadas e confiáveis, utilizando boas práticas de engenharia de software.",
    factsTitle: "Em resumo",
    facts: {
      role: { label: "Objetivo", value: "Desenvolvedor Backend" },
      education: { label: "Formação", value: "Engenharia de Software — UniCEUB (início em 2026)" },
      location: { label: "Local", value: "Brasília, Brasil" },
      focus: { label: "Foco", value: "Backend, APIs e bancos de dados" },
    },
  },
  projects: {
    eyebrow: "02 — Projetos",
    title: "Projetos",
    lead: "Trabalhos publicados, acadêmicos e de estudo. Itens ainda não confirmados aparecem sinalizados.",
    checkingLive: "Verificando API ao vivo…",
    error: "Não foi possível carregar os projetos.",
    retry: "Tentar novamente",
    offlineNote: "Exibindo cópia offline — API ao vivo indisponível",
    liveSource: "Dados ao vivo da API Java",
    status: {
      PUBLISHED: "Publicado",
      ACADEMIC: "Acadêmico",
      IN_PROGRESS: "Em andamento",
      STUDY: "Estudo",
    },
    pending: "Detalhes pendentes de confirmação",
    stackPending: "Stack a confirmar",
    openDetails: "Ver detalhes",
    liveLink: "Ver online",
    repoLink: "Repositório",
    dialog: {
      loading: "Carregando detalhes…",
      notFound: "Projeto não encontrado.",
      error: "Não foi possível carregar os detalhes.",
      offline: "Exibindo cópia offline — API ao vivo indisponível",
      highlights: "Destaques",
      technologies: "Tecnologias",
      category: "Categoria",
      status: "Status",
      links: "Links",
      noLinks: "Nenhum link público confirmado ainda.",
    },
  },
  lab: {
    eyebrow: "03 — Engineering Lab",
    title: "Engineering Lab",
    lead: "O que acontece por trás da interface: o caminho de uma requisição, uma chamada real à API Java deste portfólio, um modelo de dados e trechos do código do backend.",
    tabsLabel: "Seções do Engineering Lab",
    tabs: {
      flow: "Fluxo da requisição",
      live: "API Java ao vivo",
      sql: "Arquitetura SQL",
      code: "Código Java",
    },
    flow: {
      title: "Fluxo de uma requisição REST",
      hint: "Selecione uma etapa para ver sua responsabilidade.",
      responsibility: "Responsabilidade",
      nodes: {
        client: {
          name: "Cliente",
          detail:
            "O navegador (este site em Next.js) monta a requisição HTTP — método, URL, cabeçalhos e corpo JSON — e trata a resposta, inclusive estados de carregamento e erro.",
        },
        api: {
          name: "REST API",
          detail:
            "Camada HTTP do Spring Boot: aplica CORS, recusa corpos acima de 16 KB (413) e roteia pela URL e pelo método. No POST /api/contact, um interceptor conta a tentativa no limite por IP antes de o JSON ser lido (429 se excedido); só então o corpo vira objeto Java.",
        },
        controller: {
          name: "Controller",
          detail:
            "Recebe a requisição já mapeada, extrai parâmetros e corpo e delega ao serviço. No contato, @Valid aplica o Bean Validation do DTO aqui, antes do serviço; campos inválidos viram 400 com errors por campo. Não contém regra de negócio — apenas traduz HTTP em chamadas Java.",
        },
        service: {
          name: "Service",
          detail:
            "Concentra as regras de negócio sobre dados já validados: monta os DTOs de projeto, aplica o anti-spam (honeypot e tempo mínimo de preenchimento) e entrega a mensagem de contato. Lança exceções de domínio quando algo não é permitido ou a entrega falha (503); o 202 só sai depois da entrega.",
        },
        data: {
          name: "Camada de dados",
          detail:
            "Isola o acesso aos dados. Nesta API, os projetos vêm de um catálogo imutável em memória, carregado de um arquivo JSON; a separação permite trocá-lo por um banco relacional sem afetar as camadas acima.",
        },
        response: {
          name: "Resposta",
          detail:
            "O resultado volta serializado em JSON com o status HTTP correto. Erros seguem o formato RFC 9457 (ProblemDetail), centralizado em um handler global.",
        },
      },
    },
    live: {
      title: "Chamada real à API Java",
      description:
        "Este botão executa um fetch real para a API Spring Boot deste portfólio. Método, endpoint, status e tempo são medidos no seu navegador — nada é simulado.",
      run: "Executar requisição",
      running: "Executando…",
      method: "Método",
      endpoint: "Endpoint",
      status: "Status",
      time: "Tempo",
      response: "Corpo da resposta",
      idle: "Nenhuma requisição executada ainda.",
      networkError: "Falha de rede — a API não respondeu.",
      networkHint:
        "A API pode estar fora do ar, inacessível a partir desta origem ou bloqueada por CORS. Mensagem real do navegador:",
      nonJson: "A resposta não é JSON válido.",
      items: "itens",
    },
    sql: {
      title: "Arquitetura SQL",
      badge: "Modelo demonstrativo",
      disclaimer:
        "Esquema ilustrativo para demonstrar modelagem relacional (Oracle). Não representa o armazenamento atual da API.",
      hint: "Selecione uma entidade para destacar seus relacionamentos e ver uma consulta de exemplo.",
      entitiesLabel: "Entidades",
      pk: "Chave primária",
      fk: "Chave estrangeira",
      relations: "Relacionamentos",
      example: "Exemplo SQL (Oracle)",
      entities: {
        PROJECT: "Projeto do portfólio, com status controlado por constraint CHECK.",
        TECHNOLOGY: "Catálogo de tecnologias, com nome único.",
        PROJECT_TECHNOLOGY:
          "Tabela associativa N:N entre projetos e tecnologias, com chave primária composta.",
        CONTACT_MESSAGE:
          "Mensagens recebidas pelo formulário de contato, com data preenchida por trigger.",
      },
    },
    code: {
      title: "Trechos do backend Java",
      description: "Excertos copiados literalmente do código atual da API, com o caminho e as linhas de cada arquivo.",
      pending: "Trechos em sincronização com o backend — em breve.",
      file: "Arquivo",
      snippetsLabel: "Trechos",
    },
  },
  stack: {
    eyebrow: "04 — Stack",
    title: "Tecnologias",
    lead: "Ferramentas com que trabalho e estudo. Sem barras de porcentagem: o código fala melhor.",
    categories: {
      backend: "Backend",
      databases: "Bancos de dados",
      frontend: "Frontend",
      tools: "Ferramentas",
    },
    springNote: "usado na API deste portfólio",
    core: "Núcleo",
  },
  journey: {
    eyebrow: "05 — Trajetória",
    title: "Trajetória",
    lead: "Somente marcos confirmados.",
    items: {
      start: {
        year: "2026",
        title: "Início em Engenharia de Software — UniCEUB",
        place: "Brasília, Brasil",
        text: "Início da graduação, construção deste portfólio e aprofundamento em desenvolvimento backend.",
      },
      next: {
        year: "Em breve",
        title: "Próximos capítulos",
        text: "Novas experiências serão adicionadas aqui quando confirmadas.",
      },
    },
  },
  contact: {
    eyebrow: "06 — Contato",
    title: "Vamos conversar.",
    lead: "Envie uma mensagem pelo formulário. Ela é validada e recebida pela API Java deste portfólio.",
    linksTitle: "Canais",
    links: {
      github: "GitHub",
      linkedin: "LinkedIn",
      email: "E-mail",
      cv: "Currículo (PDF)",
    },
    comingSoon: "em breve",
    form: {
      title: "Formulário de contato",
      name: "Nome",
      email: "E-mail",
      subject: "Assunto",
      optional: "opcional",
      message: "Mensagem",
      honeypot: "Não preencha este campo",
      submit: "Enviar mensagem",
      sending: "Enviando…",
      success: "Mensagem recebida. Obrigado — retornarei em breve.",
      rejected: "Não foi possível enviar a mensagem. Revise os dados e tente novamente em alguns segundos.",
      invalid: "Alguns campos precisam de atenção.",
      tooMany: "Muitas tentativas em pouco tempo. Tente novamente mais tarde.",
      tooManyIn: "Muitas tentativas em pouco tempo. Tente novamente em {s} segundos.",
      network: "Falha de rede — não foi possível alcançar a API. Tente novamente mais tarde.",
      unavailable: "O formulário de contato está temporariamente indisponível — a mensagem não pôde ser entregue. Tente novamente mais tarde.",
      unavailableFallback: "Não foi possível entregar a mensagem agora. Fale comigo por outro canal:",
      fallbackEmail: "E-mail",
      fallbackLinkedin: "LinkedIn",
      server: "O servidor retornou um erro inesperado. Tente novamente mais tarde.",
      counter: "{n}/{max}",
      errors: {
        nameRequired: "Informe seu nome.",
        nameLength: "O nome deve ter entre 2 e 80 caracteres.",
        emailRequired: "Informe seu e-mail.",
        emailInvalid: "Informe um e-mail válido.",
        emailLength: "O e-mail deve ter no máximo 120 caracteres.",
        subjectLength: "O assunto deve ter no máximo 120 caracteres.",
        messageRequired: "Escreva sua mensagem.",
        messageLength: "A mensagem deve ter entre 10 e 2000 caracteres.",
      },
    },
  },
  footer: {
    built: "Construído com Next.js, React Three Fiber e uma API em Spring Boot.",
    backToTop: "Voltar ao topo",
    rights: "Matheus Lopes Spíndola",
  },
};

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof pt>;
