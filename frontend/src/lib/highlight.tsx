/**
 * Tiny syntax tokenizers. Output is rendered as React <span>s (text children only),
 * so untrusted strings are never injected as HTML.
 */
import type { ReactNode } from "react";

export type TokenKind =
  | "key"
  | "string"
  | "number"
  | "bool"
  | "null"
  | "punct"
  | "keyword"
  | "annotation"
  | "type"
  | "comment"
  | "plain";

export interface Token {
  kind: TokenKind;
  text: string;
}

function tokenize(source: string, rules: [RegExp, TokenKind | ((m: string, rest: string) => TokenKind)][]): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let plain = "";
  const flush = () => {
    if (plain) tokens.push({ kind: "plain", text: plain });
    plain = "";
  };
  outer: while (i < source.length) {
    const rest = source.slice(i);
    for (const [re, kind] of rules) {
      const m = re.exec(rest);
      if (m && m.index === 0 && m[0].length > 0) {
        flush();
        const k = typeof kind === "function" ? kind(m[0], rest.slice(m[0].length)) : kind;
        tokens.push({ kind: k, text: m[0] });
        i += m[0].length;
        continue outer;
      }
    }
    plain += source[i];
    i += 1;
  }
  flush();
  return tokens;
}

export function tokenizeJson(source: string): Token[] {
  return tokenize(source, [
    [/^"(?:[^"\\]|\\.)*"/, (_m, rest) => (/^\s*:/.test(rest) ? "key" : "string")],
    [/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
    [/^(?:true|false)\b/, "bool"],
    [/^null\b/, "null"],
    [/^[{}[\],:]/, "punct"],
  ]);
}

const JAVA_KEYWORDS =
  "public|private|protected|static|final|class|record|interface|enum|extends|implements|return|new|if|else|for|while|throw|throws|try|catch|import|package|void|this|null|true|false|var|instanceof|default|super";

export function tokenizeJava(source: string): Token[] {
  return tokenize(source, [
    [/^\/\*[\s\S]*?\*\//, "comment"],
    [/^\/\/[^\n]*/, "comment"],
    [/^"(?:[^"\\\n]|\\.)*"/, "string"],
    [/^@[A-Za-z_][\w.]*/, "annotation"],
    [new RegExp(`^(?:${JAVA_KEYWORDS})\\b`), "keyword"],
    [/^(?:int|long|boolean|double|float|char|byte|short)\b/, "keyword"],
    [/^[A-Z][A-Za-z0-9_]*/, "type"],
    [/^\d+[lLdDfF]?/, "number"],
    [/^[A-Za-z_$][\w$]*/, "plain"],
    [/^[{}()[\];,.<>]/, "punct"],
  ]);
}

const SQL_KEYWORDS =
  "SELECT|FROM|WHERE|JOIN|LEFT|INNER|ON|GROUP|BY|ORDER|ASC|DESC|AS|AND|OR|NOT|NULL|IN|CREATE|OR|REPLACE|VIEW|TABLE|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|CHECK|UNIQUE|DEFAULT|TRIGGER|BEFORE|AFTER|INSERT|UPDATE|DELETE|FOR|EACH|ROW|BEGIN|END|IF|THEN|IS|GENERATED|ALWAYS|IDENTITY|COUNT|LISTAGG|WITHIN|CASCADE|INTO|VALUES|FETCH|FIRST|ROWS|ONLY|WHEN|NEW|BETWEEN|LENGTH";

export function tokenizeSql(source: string): Token[] {
  return tokenize(source, [
    [/^--[^\n]*/, "comment"],
    [/^'(?:[^']|'')*'/, "string"],
    [/^:[A-Za-z]+/, "annotation"],
    [new RegExp(`^(?:${SQL_KEYWORDS})\\b`), "keyword"],
    [/^(?:VARCHAR2|NUMBER|CLOB|DATE|TIMESTAMP|SYSTIMESTAMP|CHAR)\b/, "type"],
    [/^\d+/, "number"],
    [/^[A-Za-z_][\w$#]*/, "plain"],
    [/^[(),;.*=]/, "punct"],
  ]);
}

export function renderTokens(tokens: Token[]): ReactNode[] {
  return tokens.map((t, i) =>
    t.kind === "plain" ? (
      <span key={i}>{t.text}</span>
    ) : (
      <span key={i} className={`tok-${t.kind}`}>
        {t.text}
      </span>
    ),
  );
}
