"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { Dictionary } from "@/i18n";
import { postContact } from "@/lib/api";
import { isPlaceholder, site } from "@/content/site";

type Field = "name" | "email" | "subject" | "message";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success" }
  | { kind: "error"; message: string }
  | { kind: "unavailable" };

type T = Dictionary["contact"]["form"];

const LIMITS = { name: [2, 80], email: [0, 120], subject: [0, 120], message: [10, 2000] } as const;
// Pragmatic e-mail check mirroring Bean Validation's @Email intent (local@domain).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side validation mirroring docs/api/contracts.md (server remains authoritative). */
function validateField(field: Field, raw: string, t: T): string | undefined {
  const v = raw.trim();
  switch (field) {
    case "name":
      if (!v) return t.errors.nameRequired;
      if (v.length < LIMITS.name[0] || v.length > LIMITS.name[1]) return t.errors.nameLength;
      return;
    case "email":
      if (!v) return t.errors.emailRequired;
      if (v.length > LIMITS.email[1]) return t.errors.emailLength;
      if (!EMAIL_RE.test(v)) return t.errors.emailInvalid;
      return;
    case "subject":
      if (v.length > LIMITS.subject[1]) return t.errors.subjectLength;
      return;
    case "message":
      if (!v) return t.errors.messageRequired;
      if (v.length < LIMITS.message[0] || v.length > LIMITS.message[1]) return t.errors.messageLength;
      return;
  }
}

/** Server messages are always English: map them to localized text BY FIELD NAME. */
const SERVER_FALLBACK: Record<Field, keyof T["errors"]> = {
  name: "nameLength",
  email: "emailInvalid",
  subject: "subjectLength",
  message: "messageLength",
};

const FIELDS: Field[] = ["name", "email", "subject", "message"];

/** Shared wrapper for the success / error notices next to the submit button. */
const NOTICE = "rounded-input border px-4 py-3";

/** Fallback channels for 503; placeholders (TODO) are never rendered as links. */
function fallbackLinks(t: T): { href: string; label: string }[] {
  const links: { href: string; label: string }[] = [];
  if (!isPlaceholder(site.links.email)) links.push({ href: `mailto:${site.links.email}`, label: t.fallbackEmail });
  if (!isPlaceholder(site.links.linkedin)) links.push({ href: site.links.linkedin, label: t.fallbackLinkedin });
  return links;
}

export function ContactForm({ t }: { t: T }) {
  const uid = useId();
  const [values, setValues] = useState<Values>({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const startedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const refs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const onChange = (field: Field) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (touched[field] || errors[field]) setErrors((er) => ({ ...er, [field]: validateField(field, value, t) }));
  };

  const onBlur = (field: Field) => () => {
    setTouched((s) => ({ ...s, [field]: true }));
    setErrors((er) => ({ ...er, [field]: validateField(field, values[field], t) }));
  };

  const focusFirst = (errs: Errors) => {
    const first = FIELDS.find((f) => errs[f]);
    if (first) refs.current[first]?.focus();
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status.kind === "sending") return;

    const clientErrors: Errors = {};
    FIELDS.forEach((f) => {
      const msg = validateField(f, values[f], t);
      if (msg) clientErrors[f] = msg;
    });
    setErrors(clientErrors);
    setTouched({ name: true, email: true, subject: true, message: true });
    if (Object.keys(clientErrors).length > 0) {
      setStatus({ kind: "error", message: t.invalid });
      focusFirst(clientErrors);
      return;
    }

    setStatus({ kind: "sending" });
    const result = await postContact({
      name: values.name.trim(),
      email: values.email.trim(),
      ...(values.subject.trim() ? { subject: values.subject.trim() } : {}),
      message: values.message.trim(),
      website: honeypot.current?.value ?? "",
      startedAt: startedAt.current || Date.now(),
    });

    switch (result.kind) {
      case "accepted":
        setStatus({ kind: "success" });
        setValues({ name: "", email: "", subject: "", message: "" });
        setErrors({});
        setTouched({});
        startedAt.current = Date.now();
        return;
      case "validation": {
        const mapped: Errors = {};
        let unmapped = false;
        for (const key of Object.keys(result.errors)) {
          if ((FIELDS as string[]).includes(key)) {
            const f = key as Field;
            mapped[f] = validateField(f, values[f], t) ?? t.errors[SERVER_FALLBACK[f]];
          } else {
            unmapped = true; // e.g. startedAt / website — no field to attach to.
          }
        }
        setErrors(mapped);
        setStatus({ kind: "error", message: Object.keys(mapped).length > 0 && !unmapped ? t.invalid : t.rejected });
        focusFirst(mapped);
        return;
      }
      case "rejected":
        setStatus({ kind: "error", message: t.rejected });
        return;
      case "rate-limited":
        setStatus({
          kind: "error",
          message: result.retryAfter !== null ? t.tooManyIn.replace("{s}", String(result.retryAfter)) : t.tooMany,
        });
        return;
      case "network":
        setStatus({ kind: "error", message: t.network });
        return;
      case "unavailable":
        setStatus({ kind: "unavailable" });
        return;
      case "server":
        setStatus({ kind: "error", message: t.server });
        return;
    }
  };

  const sending = status.kind === "sending";
  const fallbacks = status.kind === "unavailable" ? fallbackLinks(t) : [];
  const fieldId = (f: Field) => `${uid}-${f}`;
  const errorId = (f: Field) => `${uid}-${f}-error`;

  const describedBy = (f: Field, extra?: string) =>
    [errors[f] ? errorId(f) : null, extra].filter(Boolean).join(" ") || undefined;

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={`${uid}-title`} className="card relative p-6 md:p-10">
      <h3 id={`${uid}-title`} className="eyebrow mb-8">
        {t.title}
      </h3>

      <div className="grid gap-6 md:grid-cols-2">
        {(["name", "email"] as const).map((f) => (
          <div key={f}>
            <label htmlFor={fieldId(f)} className="mb-2 block text-sm text-fg">
              {t[f]}
            </label>
            <input
              ref={(el) => {
                refs.current[f] = el;
              }}
              id={fieldId(f)}
              name={f}
              type={f === "email" ? "email" : "text"}
              autoComplete={f === "email" ? "email" : "name"}
              required
              maxLength={LIMITS[f][1]}
              value={values[f]}
              onChange={onChange(f)}
              onBlur={onBlur(f)}
              aria-invalid={!!errors[f]}
              aria-describedby={describedBy(f)}
              readOnly={sending}
              className="field"
            />
            {errors[f] ? (
              <p id={errorId(f)} className="mt-2 text-sm text-danger">
                {errors[f]}
              </p>
            ) : null}
          </div>
        ))}

        <div className="md:col-span-2">
          <label htmlFor={fieldId("subject")} className="mb-2 block text-sm text-fg">
            {t.subject} <span className="text-muted">({t.optional})</span>
          </label>
          <input
            ref={(el) => {
              refs.current.subject = el;
            }}
            id={fieldId("subject")}
            name="subject"
            type="text"
            maxLength={LIMITS.subject[1]}
            value={values.subject}
            onChange={onChange("subject")}
            onBlur={onBlur("subject")}
            aria-invalid={!!errors.subject}
            aria-describedby={describedBy("subject")}
            readOnly={sending}
            className="field"
          />
          {errors.subject ? (
            <p id={errorId("subject")} className="mt-2 text-sm text-danger">
              {errors.subject}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor={fieldId("message")} className="block text-sm text-fg">
              {t.message}
            </label>
            <span id={`${uid}-counter`} className="font-mono text-micro text-muted">
              {t.counter.replace("{n}", String(values.message.trim().length)).replace("{max}", String(LIMITS.message[1]))}
            </span>
          </div>
          <textarea
            ref={(el) => {
              refs.current.message = el;
            }}
            id={fieldId("message")}
            name="message"
            required
            rows={6}
            maxLength={LIMITS.message[1]}
            value={values.message}
            onChange={onChange("message")}
            onBlur={onBlur("message")}
            aria-invalid={!!errors.message}
            aria-describedby={describedBy("message", `${uid}-counter`)}
            readOnly={sending}
            className="field resize-y"
          />
          {errors.message ? (
            <p id={errorId("message")} className="mt-2 text-sm text-danger">
              {errors.message}
            </p>
          ) : null}
        </div>
      </div>

      {/* Honeypot: invisible to people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`${uid}-website`}>{t.honeypot}</label>
        <input ref={honeypot} id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={sending} aria-busy={sending} className="btn btn-primary">
          {sending ? (
            <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-bg border-t-transparent" />
          ) : null}
          {sending ? t.sending : t.submit}
        </button>
        <div aria-live="polite" role="status" className="min-h-6 text-sm">
          {status.kind === "success" ? (
            <p className={`${NOTICE} flex items-baseline gap-2 border-success/40 bg-success/5 text-success`}>
              <span aria-hidden="true">✓</span>
              <span>{t.success}</span>
            </p>
          ) : null}
          {status.kind === "error" ? <p className={`${NOTICE} border-danger/40 bg-danger/5 text-danger`}>{status.message}</p> : null}
          {status.kind === "unavailable" ? (
            fallbacks.length > 0 ? (
              <p className={`${NOTICE} border-danger/40 bg-danger/5 text-danger`}>
                {t.unavailableFallback}{" "}
                {fallbacks.map((l, i) => (
                  <span key={l.href}>
                    {i > 0 ? " · " : null}
                    <a
                      href={l.href}
                      className="underline underline-offset-4 hover:text-fg"
                      {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {l.label}
                    </a>
                  </span>
                ))}
              </p>
            ) : (
              <p className={`${NOTICE} border-danger/40 bg-danger/5 text-danger`}>{t.unavailable}</p>
            )
          ) : null}
        </div>
      </div>
    </form>
  );
}
