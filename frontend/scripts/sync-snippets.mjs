#!/usr/bin/env node
/**
 * Syncs the Engineering Lab code excerpts (src/content/code-snippets.ts) from the
 * Spring Boot backend sources. The excerpts are copied verbatim by line range.
 *
 *   npm run sync:snippets    rewrite src/content/code-snippets.ts from the backend
 *   npm run check:snippets   exit 1 if the file differs from what sync would write
 *
 * Each spec carries `first`/`last` anchors (trimmed first/last line of the excerpt).
 * If backend edits shift the line range, the anchors stop matching and both modes
 * fail instead of silently copying the wrong lines: update `from`/`to` below.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const javaBase = "backend/src/main/java/dev/matheusspindola/portfolio/";
const target = resolve(repoRoot, "frontend/src/content/code-snippets.ts");

const specs = [
  {
    id: "project-controller",
    file: "project/ProjectController.java",
    from: 14,
    to: 41,
    first: "@RestController",
    last: "}",
    title: { pt: "Controller REST de projetos", en: "Projects REST controller" },
    explanation: {
      pt: "Expõe GET /api/projects e GET /api/projects/{id}. O controller só traduz HTTP em chamadas ao serviço: lang é opcional e valores desconhecidos caem para pt (Lang.from). Um id inexistente vira ProjectNotFoundException no serviço, que o handler global transforma em 404. As anotações do springdoc alimentam a documentação OpenAPI.",
      en: "Exposes GET /api/projects and GET /api/projects/{id}. The controller only translates HTTP into service calls: lang is optional and unknown values fall back to pt (Lang.from). An unknown id becomes a ProjectNotFoundException in the service, which the global handler turns into a 404. The springdoc annotations feed the OpenAPI docs.",
    },
  },
  {
    id: "contact-request",
    file: "contact/ContactRequest.java",
    from: 13,
    to: 49,
    first: "public record ContactRequest(",
    last: "}",
    title: { pt: "DTO de contato com Bean Validation", en: "Contact DTO with Bean Validation" },
    explanation: {
      pt: "Record imutável com o contrato do POST /api/contact, validado por @Valid no ContactController. O construtor compacto remove espaços antes da validação, então as regras (@NotBlank, @Size, @Email com ponto obrigatório no domínio, @NotNull em startedAt) valem para o texto que será entregue, e um assunto em branco vira null. O honeypot website não tem restrição de campo de propósito: o SpamGuard o rejeita de forma genérica, sem revelar a armadilha.",
      en: "Immutable record holding the POST /api/contact contract, validated by @Valid on ContactController. The compact constructor strips whitespace before validation, so the rules (@NotBlank, @Size, @Email requiring a dot in the domain, @NotNull on startedAt) apply to the exact text that gets delivered, and a blank subject becomes null. The website honeypot deliberately has no field constraint: SpamGuard rejects it generically, without revealing the trap.",
    },
  },
  {
    id: "rate-limit-interceptor",
    file: "contact/ContactRateLimitInterceptor.java",
    from: 14,
    to: 36,
    first: "@Component",
    last: "}",
    title: { pt: "Rate limiting antes do parsing", en: "Rate limiting before parsing" },
    explanation: {
      pt: "Um HandlerInterceptor do Spring MVC conta cada POST /api/contact antes de o corpo ser lido. Assim, JSON malformado, Content-Type errado, campos inválidos e spam também consomem uma tentativa: um cliente bloqueado recebe 429, não 400. A chave é o IP resolvido pelo ClientIpResolver (IPv6 agrupado por /64), e o RateLimiter usa janela deslizante em memória com limite de clientes rastreados.",
      en: "A Spring MVC HandlerInterceptor counts every POST /api/contact before the body is read. That way malformed JSON, a wrong Content-Type, invalid fields and spam also consume an attempt: a blocked client gets 429, not 400. The key is the IP resolved by ClientIpResolver (IPv6 grouped by /64), and RateLimiter uses an in-memory sliding window with a cap on tracked clients.",
    },
  },
  {
    id: "problem-detail-handlers",
    file: "error/GlobalExceptionHandler.java",
    from: 52,
    to: 68,
    first: "@ExceptionHandler(RateLimitExceededException.class)",
    last: "}",
    title: { pt: "Erros no formato RFC 9457", en: "RFC 9457 error responses" },
    explanation: {
      pt: "Trecho do handler global (@RestControllerAdvice): o limite de envios vira 429 em application/problem+json com o cabeçalho Retry-After, e uma falha de entrega da mensagem vira 503 — nunca um 202 falso. O motivo técnico fica só no log; o cliente recebe uma mensagem genérica. Todas as falhas da API seguem esse formato ProblemDetail.",
      en: "Excerpt from the global handler (@RestControllerAdvice): the submission limit becomes a 429 in application/problem+json with a Retry-After header, and a failed message delivery becomes a 503 — never a false 202. The technical reason stays in the log; the client gets a generic message. Every API failure follows this ProblemDetail format.",
    },
  },
];

const normalize = (text) => text.replace(/\r\n/g, "\n");

function extract(spec) {
  const path = javaBase + spec.file;
  const lines = normalize(readFileSync(resolve(repoRoot, path), "utf8")).split("\n");
  const code = lines.slice(spec.from - 1, spec.to).join("\n");
  const excerpt = code.split("\n");
  const problems = [];
  if (excerpt[0]?.trim() !== spec.first) problems.push(`line ${spec.from} is "${excerpt[0]?.trim()}", expected "${spec.first}"`);
  if (excerpt.at(-1)?.trim() !== spec.last) problems.push(`line ${spec.to} is "${excerpt.at(-1)?.trim()}", expected "${spec.last}"`);
  return {
    problems,
    snippet: { id: spec.id, path, lines: `${spec.from}-${spec.to}`, title: spec.title, explanation: spec.explanation, code },
  };
}

const HEADER = `/**
 * Real excerpts from the Spring Boot backend, copied verbatim (file path + line range).
 * GENERATED by scripts/sync-snippets.mjs — do not edit by hand.
 * Re-sync with \`npm run sync:snippets\`; \`npm run check:snippets\` fails if the backend drifts.
 */
import type { Locale } from "@/i18n/config";

export interface CodeSnippet {
  id: string;
  path: string;
  lines: string;
  title: Record<Locale, string>;
  explanation: Record<Locale, string>;
  code: string;
}

/** false: snippets below are real code synced from the backend. */
export const SNIPPETS_PENDING = false;

export const codeSnippets: CodeSnippet[] = `;

const mode = process.argv.includes("--check") ? "check" : "write";
const results = specs.map(extract);
const anchorErrors = results.flatMap((r) => r.problems.map((p) => `${r.snippet.id}: ${p}`));
if (anchorErrors.length > 0) {
  console.error("Snippet ranges no longer match the backend (update from/to in scripts/sync-snippets.mjs):");
  anchorErrors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

const generated = HEADER + JSON.stringify(results.map((r) => r.snippet), null, 2) + ";\n";
let current = "";
try {
  current = normalize(readFileSync(target, "utf8"));
} catch {
  current = "";
}

if (mode === "check") {
  // Per-snippet report against what is currently committed.
  for (const { snippet } of results) {
    const same = current.includes(JSON.stringify(snippet.code));
    console.log(`${same ? "identical" : "DRIFT    "}  ${snippet.id}  (${snippet.path}:${snippet.lines})`);
  }
  if (generated !== current) {
    console.error("code-snippets.ts is out of sync with the backend. Run `npm run sync:snippets`.");
    process.exit(1);
  }
  console.log("code-snippets.ts is identical to the backend excerpts.");
} else {
  if (generated === current) {
    console.log("code-snippets.ts already up to date (identical).");
  } else {
    writeFileSync(target, generated);
    console.log(`Wrote ${results.length} snippets to src/content/code-snippets.ts.`);
  }
}
