import type { Locale } from "@/i18n/config";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export type ProjectStatus = "PUBLISHED" | "ACADEMIC" | "IN_PROGRESS" | "STUDY";

export interface ProjectSummary {
  id: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  category: string;
  technologies: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  verified: boolean;
}

export interface ProjectDetail extends ProjectSummary {
  description: string;
  highlights: string[];
}

/** RFC 9457 ProblemDetail as documented in docs/api/contracts.md. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string>;
}

export interface ContactPayload {
  name: string;
  email: string;
  /** Optional: omitted from the JSON body when empty (backend accepts null/absent). */
  subject?: string;
  message: string;
  website: string;
  startedAt: number;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetail | null,
    public readonly retryAfter: number | null = null,
  ) {
    super(problem?.title ?? `HTTP ${status}`);
    this.name = "HttpError";
  }
}

const TIMEOUT_MS = 8000;

async function request(path: string, init?: RequestInit, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), TIMEOUT_MS);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function readProblem(res: Response): Promise<ProblemDetail | null> {
  try {
    return (await res.json()) as ProblemDetail;
  } catch {
    return null;
  }
}

const isSummary = (v: unknown): v is ProjectSummary =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as ProjectSummary).id === "string" &&
  typeof (v as ProjectSummary).title === "string" &&
  Array.isArray((v as ProjectSummary).technologies);

export const projectsPath = (lang: Locale) => `/api/projects?lang=${lang}`;

export async function fetchProjects(lang: Locale, signal?: AbortSignal): Promise<ProjectSummary[]> {
  const res = await request(projectsPath(lang), undefined, signal);
  if (!res.ok) throw new HttpError(res.status, await readProblem(res));
  const data: unknown = await res.json();
  if (!Array.isArray(data) || !data.every(isSummary)) throw new Error("Unexpected response shape");
  return data;
}

export async function fetchProject(id: string, lang: Locale, signal?: AbortSignal): Promise<ProjectDetail> {
  const res = await request(`/api/projects/${encodeURIComponent(id)}?lang=${lang}`, undefined, signal);
  if (!res.ok) throw new HttpError(res.status, await readProblem(res));
  const data: unknown = await res.json();
  if (!isSummary(data)) throw new Error("Unexpected response shape");
  const d = data as ProjectDetail;
  return { ...d, description: d.description ?? "", highlights: Array.isArray(d.highlights) ? d.highlights : [] };
}

export type ContactResult =
  | { kind: "accepted" }
  | { kind: "validation"; errors: Record<string, string> }
  | { kind: "rejected" }
  | { kind: "rate-limited"; retryAfter: number | null }
  /** 503 "Contact delivery unavailable": never a 202; the UI offers fallback channels. */
  | { kind: "unavailable" }
  | { kind: "server"; status: number }
  | { kind: "network"; message: string };

export async function postContact(input: ContactPayload): Promise<ContactResult> {
  const { subject, ...rest } = input;
  const payload: ContactPayload = subject ? { ...rest, subject } : rest;
  let res: Response;
  try {
    res = await request("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { kind: "network", message: e instanceof Error ? e.message : String(e) };
  }
  if (res.status === 202) return { kind: "accepted" };
  if (res.status === 400) {
    const problem = await readProblem(res);
    if (problem?.errors && Object.keys(problem.errors).length > 0) {
      return { kind: "validation", errors: problem.errors };
    }
    return { kind: "rejected" };
  }
  if (res.status === 429) {
    const header = res.headers.get("Retry-After");
    const seconds = header ? Number.parseInt(header, 10) : NaN;
    return { kind: "rate-limited", retryAfter: Number.isFinite(seconds) ? seconds : null };
  }
  if (res.status === 503) return { kind: "unavailable" };
  // 413 and anything else stay generic.
  return { kind: "server", status: res.status };
}
