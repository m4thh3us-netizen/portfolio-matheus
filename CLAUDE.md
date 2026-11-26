# CLAUDE.md — Portfólio Matheus Lopes Spíndola

## Objetivo
Portfólio profissional bilíngue (pt-BR / en-US) para posicionar Matheus Lopes Spíndola como **Backend Developer (Java)**, com experiência 3D premium no frontend e uma API Spring Boot real que o próprio site consome (Engineering Lab).

## Stack
- `frontend/`: Next.js (App Router) · React · TypeScript strict · Tailwind CSS · three · @react-three/fiber · @react-three/drei · GSAP.
- `backend/`: Java 21 LTS · Spring Boot 3.5 · Spring Web · Bean Validation · Actuator · springdoc-openapi · Maven · JUnit 5.
- Sem banco de dados e sem autenticação no MVP (ver `docs/architecture/ADR-001-stack-and-boundaries.md`).

## Comandos
```bash
# backend
cd backend && mvn -B test            # testes
cd backend && mvn spring-boot:run    # API em http://localhost:8080 (Swagger: /swagger-ui.html)
# frontend
cd frontend && npm install
cd frontend && npm run dev           # http://localhost:3000/pt
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

## Convenções
- Contrato de API: `docs/api/contracts.md` é a fonte de verdade. Mudou o contrato → atualize o doc, os DTOs Java e `frontend/src/lib/api.ts` juntos.
- Java: pacotes por feature (`project`, `contact`, `health`, `config`, `error`), DTOs como `record`, erros como `ProblemDetail`.
- TypeScript: sem `any`; componentes por seção em `frontend/src/components/sections/`; todas as strings visíveis nos dicionários `frontend/src/i18n/{pt,en}.ts`.
- Conteúdo: somente fatos de `docs/content/profile.md`. Dados ausentes → `TODO(matheus)` e UI de "em breve", nunca link quebrado.

## Identidade visual
Ver `docs/design/design-system.md`. Paleta: `#080D1E`, `#10182B`, `#B7E4FF`, `#4FA8FF`, `#A78BFA`, `#F5F9FF`, `#A8BAD6`. Futurista minimalista, editorial; nada de visual gamer/anime/cyberpunk, sem barras de proficiência.

## Agentes (`.claude/agents/`)
| Agente | Responsabilidade | Possui |
|---|---|---|
| orquestrador | Planeja, delega via `Agent`, integra, relata | `docs/TASKS.md` |
| fabrica-agentes | Cria/valida novos agentes sob demanda | `.claude/agents/`, `docs/AGENTS_REGISTRY.md` |
| arquiteto | Estrutura, contratos, ADRs, revisão do backend | `docs/architecture/`, `docs/api/` |
| designer-ux-ui | Design system, revisão visual | `docs/design/`, `frontend/src/styles/tokens.css` |
| frontend-3d | Next.js, 3D, i18n, integração | `frontend/` |
| backend-java | API Spring Boot e testes | `backend/` |
| qa-testes | Testes reais e relatório de falhas | `docs/qa/` |

Para usar como sessão principal: `claude --agent orquestrador`. Agentes novos só são reconhecidos após reiniciar a sessão do Claude Code.

## Regras de colaboração
- Cada tarefa tem um responsável, arquivos próprios, dependências, critério de aceitação e estado em `docs/TASKS.md`.
- Dois agentes nunca editam o mesmo arquivo em paralelo; o orquestrador integra.
- Revisão cruzada: arquiteto→backend, designer→frontend, backend→chamadas de API do frontend, frontend→uso do contrato, QA→tudo.
- Ninguém declara "testado" sem ter executado o comando.

## Política para novos agentes
Só via `fabrica-agentes`, quando a necessidade é recorrente, delimitada e não coberta. Máx. 12 agentes. Registrar em `docs/AGENTS_REGISTRY.md`.

## Estratégia de testes
- Backend: JUnit 5 + MockMvc (contrato, validação, spam, rate limit, CORS).
- Frontend: `tsc`, ESLint, `next build`, smoke HTTP das rotas `/pt` e `/en`.
- Integração: API real + `curl`/navegador; Lighthouse quando disponível.

## Critérios de conclusão
Backend `mvn test` verde; frontend `tsc` + `lint` + `build` sem erros; `/pt` e `/en` completos; Engineering Lab chama a API real; QA sem falhas bloqueantes; README com execução e deploy.
