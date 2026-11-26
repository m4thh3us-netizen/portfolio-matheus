/**
 * Bundled offline copy of the 7 projects (same facts as docs/content/profile.md,
 * mirrored from backend/src/main/resources/data/projects.json).
 * Used ONLY when the live API is unreachable; the UI then says so explicitly.
 */
import type { Locale } from "@/i18n/config";
import type { ProjectDetail, ProjectStatus, ProjectSummary } from "@/lib/api";

interface LocalizedProject {
  title: string;
  category: string;
  summary: string;
  description: string;
  highlights: string[];
}

interface StaticProject {
  id: string;
  order: number;
  status: ProjectStatus;
  technologies: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  verified: boolean;
  i18n: Record<Locale, LocalizedProject>;
}

const projects: StaticProject[] = [
  {
    "id": "mfy",
    "order": 1,
    "status": "PUBLISHED",
    "technologies": [],
    "liveUrl": "https://mfy-xi.vercel.app/",
    "repoUrl": null,
    "verified": false,
    "i18n": {
      "pt": {
        "title": "MFY — Finanças Pessoais",
        "category": "Aplicação Web",
        "summary": "Aplicação web de organização financeira pessoal, com controle de despesas fixas, variáveis e parceladas.",
        "description": "Aplicação web publicada para organizar finanças pessoais, permitindo acompanhar despesas fixas, despesas variáveis e compras parceladas. Detalhes técnicos pendentes de confirmação.",
        "highlights": [
          "Controle de despesas fixas e variáveis",
          "Acompanhamento de compras parceladas",
          "Publicado e acessível online"
        ]
      },
      "en": {
        "title": "MFY — Personal Finances",
        "category": "Web App",
        "summary": "Web app for personal finance organization, tracking fixed, variable and installment expenses.",
        "description": "Published web application for organizing personal finances, tracking fixed expenses, variable expenses and installment purchases. Technical details pending confirmation.",
        "highlights": [
          "Fixed and variable expense tracking",
          "Installment purchase tracking",
          "Published and available online"
        ]
      }
    }
  },
  {
    "id": "ecommerce-management",
    "order": 2,
    "status": "ACADEMIC",
    "technologies": [],
    "liveUrl": null,
    "repoUrl": null,
    "verified": false,
    "i18n": {
      "pt": {
        "title": "Sistema de Gestão de E-commerce",
        "category": "Projeto acadêmico",
        "summary": "Sistema acadêmico com funcionalidades de gestão de produtos, estoque e finanças de um e-commerce.",
        "description": "Projeto acadêmico de gestão de e-commerce que reúne funcionalidades de gestão de produtos, controle de estoque e gestão financeira. Detalhes técnicos pendentes de confirmação.",
        "highlights": [
          "Gestão de produtos",
          "Controle de estoque",
          "Gestão financeira"
        ]
      },
      "en": {
        "title": "E-commerce Management System",
        "category": "Academic project",
        "summary": "Academic system with product, inventory and financial management features for an e-commerce business.",
        "description": "Academic e-commerce management project covering product management, inventory control and financial management features. Technical details pending confirmation.",
        "highlights": [
          "Product management",
          "Inventory control",
          "Financial management"
        ]
      }
    }
  },
  {
    "id": "tutoring-platform",
    "order": 3,
    "status": "ACADEMIC",
    "technologies": [],
    "liveUrl": null,
    "repoUrl": null,
    "verified": false,
    "i18n": {
      "pt": {
        "title": "Plataforma de Monitorias Universitárias",
        "category": "Projeto acadêmico",
        "summary": "Plataforma acadêmica para agendamento de monitorias universitárias com regras de negócio.",
        "description": "Projeto acadêmico de uma plataforma para agendamento de monitorias universitárias, aplicando regras de negócio ao processo de agendamento. Detalhes técnicos pendentes de confirmação.",
        "highlights": [
          "Agendamento de monitorias",
          "Regras de negócio aplicadas ao agendamento"
        ]
      },
      "en": {
        "title": "University Tutoring Platform",
        "category": "Academic project",
        "summary": "Academic platform for scheduling university tutoring sessions with business rules.",
        "description": "Academic project for a platform that schedules university tutoring sessions, applying business rules to the scheduling process. Technical details pending confirmation.",
        "highlights": [
          "Tutoring session scheduling",
          "Business rules applied to scheduling"
        ]
      }
    }
  },
  {
    "id": "projeto-horizonte",
    "order": 4,
    "status": "ACADEMIC",
    "technologies": [],
    "liveUrl": null,
    "repoUrl": null,
    "verified": false,
    "i18n": {
      "pt": {
        "title": "Projeto Horizonte — Equipe Alnitak",
        "category": "Projeto acadêmico",
        "summary": "Projeto acadêmico de Engenharia de Software desenvolvido pela equipe Alnitak.",
        "description": "Projeto acadêmico do curso de Engenharia de Software, desenvolvido em equipe (Equipe Alnitak). Detalhes do escopo e da stack pendentes de confirmação.",
        "highlights": [
          "Projeto acadêmico de Engenharia de Software",
          "Desenvolvido em equipe"
        ]
      },
      "en": {
        "title": "Projeto Horizonte — Team Alnitak",
        "category": "Academic project",
        "summary": "Academic Software Engineering project developed by team Alnitak.",
        "description": "Academic Software Engineering project developed as a team (Team Alnitak). Scope and stack details pending confirmation.",
        "highlights": [
          "Academic Software Engineering project",
          "Team project"
        ]
      }
    }
  },
  {
    "id": "oracle-modeling",
    "order": 5,
    "status": "STUDY",
    "technologies": [
      "SQL",
      "Oracle Database"
    ],
    "liveUrl": null,
    "repoUrl": null,
    "verified": false,
    "i18n": {
      "pt": {
        "title": "Modelagem e Banco de Dados Oracle",
        "category": "Estudo",
        "summary": "Estudo de modelagem de dados e SQL no Oracle Database, com views, constraints e triggers.",
        "description": "Estudo prático de modelagem de dados e SQL utilizando Oracle Database, abordando views, constraints e triggers.",
        "highlights": [
          "Modelagem de dados",
          "SQL com views e constraints",
          "Triggers"
        ]
      },
      "en": {
        "title": "Oracle Database Modeling",
        "category": "Study",
        "summary": "Study of data modeling and SQL on Oracle Database, covering views, constraints and triggers.",
        "description": "Hands-on study of data modeling and SQL using Oracle Database, covering views, constraints and triggers.",
        "highlights": [
          "Data modeling",
          "SQL with views and constraints",
          "Triggers"
        ]
      }
    }
  },
  {
    "id": "nfe-integration",
    "order": 6,
    "status": "STUDY",
    "technologies": [
      "Angular"
    ],
    "liveUrl": null,
    "repoUrl": null,
    "verified": false,
    "i18n": {
      "pt": {
        "title": "Integração NF-e",
        "category": "Estudo",
        "summary": "Estudo com Angular sobre integrações e serviços relacionados à NF-e.",
        "description": "Estudo utilizando Angular para explorar integrações e serviços relacionados à NF-e (Nota Fiscal Eletrônica). Detalhes pendentes de confirmação.",
        "highlights": [
          "Estudo de integrações e serviços",
          "Frontend em Angular"
        ]
      },
      "en": {
        "title": "NF-e Integration",
        "category": "Study",
        "summary": "Angular study of integrations and services related to NF-e (Brazilian electronic invoice).",
        "description": "Study using Angular to explore integrations and services related to NF-e (Brazilian electronic invoice). Details pending confirmation.",
        "highlights": [
          "Study of integrations and services",
          "Angular frontend"
        ]
      }
    }
  },
  {
    "id": "portfolio",
    "order": 7,
    "status": "IN_PROGRESS",
    "technologies": [
      "Java",
      "Spring Boot",
      "TypeScript",
      "React",
      "Next.js"
    ],
    "liveUrl": null,
    "repoUrl": null,
    "verified": true,
    "i18n": {
      "pt": {
        "title": "Este portfólio",
        "category": "Aplicação Web",
        "summary": "Este portfólio: frontend em Next.js com React Three Fiber e API em Spring Boot.",
        "description": "O próprio portfólio, em desenvolvimento: frontend em Next.js e React Three Fiber, consumindo uma API REST em Java com Spring Boot.",
        "highlights": [
          "Frontend em Next.js com React Three Fiber",
          "API REST em Java com Spring Boot"
        ]
      },
      "en": {
        "title": "This portfolio",
        "category": "Web App",
        "summary": "This portfolio: Next.js frontend with React Three Fiber and a Spring Boot API.",
        "description": "The portfolio itself, in progress: a Next.js and React Three Fiber frontend consuming a Java REST API built with Spring Boot.",
        "highlights": [
          "Next.js frontend with React Three Fiber",
          "Java REST API with Spring Boot"
        ]
      }
    }
  }
];

const toDetail = (p: StaticProject, lang: Locale): ProjectDetail => {
  const t = p.i18n[lang];
  return {
    id: p.id,
    title: t.title,
    summary: t.summary,
    status: p.status,
    category: t.category,
    technologies: p.technologies,
    liveUrl: p.liveUrl,
    repoUrl: p.repoUrl,
    verified: p.verified,
    description: t.description,
    highlights: t.highlights,
  };
};

export const getStaticProjects = (lang: Locale): ProjectSummary[] =>
  [...projects]
    .sort((a, b) => a.order - b.order)
    .map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { description, highlights, ...summary } = toDetail(p, lang);
      return summary;
    });

export const getStaticProject = (id: string, lang: Locale): ProjectDetail | null => {
  const p = projects.find((x) => x.id === id);
  return p ? toDetail(p, lang) : null;
};
