"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import type { Dictionary } from "@/i18n";
import { entities, relations, type Entity, type EntityName } from "@/content/sql-model";
import { renderTokens, tokenizeSql } from "@/lib/highlight";

const BOX_W = 200;
const ROW_H = 24;
const HEAD_H = 34;

const boxHeight = (e: Entity) => HEAD_H + e.columns.length * ROW_H + 10;
const center = (e: Entity) => ({ x: e.x + BOX_W / 2, y: e.y + boxHeight(e) / 2 });

/*
 * SVG colors go through `style` so they resolve tokens.css variables (presentation
 * attributes do not resolve var()). Dimmed entities fade only their shapes, never their
 * text, so labels keep AA contrast on --bg-2.
 */
const C = {
  grid: "rgba(183,228,255,0.05)",
  relationOn: "var(--electric)",
  relationOff: "var(--line-strong)",
  boxLit: "var(--bg-2)",
  boxDim: "rgba(16,24,43,0.55)",
  strokeActive: "var(--electric)",
  strokeLit: "rgba(183,228,255,0.45)",
  strokeDim: "rgba(183,228,255,0.10)",
  divider: "var(--line)",
  nameActive: "var(--ice)",
  nameLit: "var(--text)",
  textDim: "var(--text-2)",
  pk: "var(--warning)",
  fk: "var(--violet)",
} as const;

export function SqlArchitecture({ t }: { t: Dictionary["lab"]["sql"] }) {
  const [selected, setSelected] = useState<EntityName>("PROJECT_TECHNOLOGY");
  const byName = useMemo(() => Object.fromEntries(entities.map((e) => [e.name, e])) as Record<EntityName, Entity>, []);
  const entity = byName[selected];

  const related = useMemo(() => {
    const set = new Set<EntityName>([selected]);
    relations.forEach((r) => {
      if (r.from === selected) set.add(r.to);
      if (r.to === selected) set.add(r.from);
    });
    return set;
  }, [selected]);

  const relationText = relations
    .filter((r) => r.from === selected || r.to === selected)
    .map((r) => `${r.from} ${r.label} ${r.to}`);

  const sqlTokens = useMemo(() => renderTokens(tokenizeSql(entity.sql)), [entity]);

  const onEntityKey = (e: KeyboardEvent<SVGGElement>, name: EntityName) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(name);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-h3 text-fg">{t.title}</h3>
        <span className="rounded-full border border-dashed border-warning/50 px-2.5 py-1 font-mono text-micro uppercase tracking-[0.12em] text-warning">
          {t.badge}
        </span>
      </div>
      <p className="mt-3 max-w-3xl text-sm text-muted">{t.disclaimer}</p>
      <p className="mt-1 font-mono text-xs text-muted">{t.hint}</p>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t.entitiesLabel}>
        {entities.map((e) => (
          <button
            key={e.name}
            type="button"
            aria-pressed={e.name === selected}
            onClick={() => setSelected(e.name)}
            className={`rounded-full border px-3 py-1.5 font-mono text-xs transition-colors ${
              e.name === selected ? "border-ice bg-ice/10 text-ice" : "border-line text-muted hover:text-fg"
            }`}
          >
            {e.name}
          </button>
        ))}
      </div>

      {/*
        Diagram on its own row (scrolls horizontally below 680px) so its text renders at
        ≥ 11px; a 7/12 column would shrink the 770-unit viewBox to ~0.83×.
      */}
      <div className="mt-6 grid gap-8">
        <div className="max-w-[860px] overflow-x-auto rounded-panel border border-line bg-bg/60">
          <svg viewBox="0 0 770 460" className="block h-auto w-full min-w-[680px]" role="group" aria-label={t.entitiesLabel}>
            <defs>
              <pattern id="er-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" style={{ stroke: C.grid }} />
              </pattern>
            </defs>
            <rect width="770" height="460" fill="url(#er-grid)" />

            {relations.map((r) => {
              const a = center(byName[r.from]);
              const b = center(byName[r.to]);
              const on = related.has(r.from) && related.has(r.to) && (r.from === selected || r.to === selected);
              const mx = (a.x + b.x) / 2;
              return (
                <g key={`${r.from}-${r.to}`}>
                  <path
                    d={`M${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`}
                    fill="none"
                    strokeWidth={on ? 1.6 : 1}
                    strokeDasharray={on ? "6 6" : undefined}
                    style={{
                      stroke: on ? C.relationOn : C.relationOff,
                      ...(on ? { animation: "flow-dash 1.2s linear infinite" } : {}),
                    }}
                  />
                  <text
                    x={mx}
                    y={(a.y + b.y) / 2 - 8}
                    textAnchor="middle"
                    className="fill-muted font-mono"
                    fontSize="11.5"
                    // Halo so the cardinality stays legible where the curve crosses it.
                    style={{ paintOrder: "stroke", stroke: "var(--bg)", strokeWidth: 5, strokeLinejoin: "round" }}
                  >
                    {r.label}
                  </text>
                </g>
              );
            })}

            {entities.map((e) => {
              const active = e.name === selected;
              const lit = related.has(e.name);
              return (
                <g
                  key={e.name}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={e.name}
                  onClick={() => setSelected(e.name)}
                  onKeyDown={(ev) => onEntityKey(ev, e.name)}
                  className="cursor-pointer outline-none [&:focus-visible>rect:first-of-type]:[stroke-width:2.5] [&:focus-visible>rect:first-of-type]:[stroke:var(--ice)]!"
                >
                  <rect
                    x={e.x}
                    y={e.y}
                    width={BOX_W}
                    height={boxHeight(e)}
                    rx="10"
                    strokeWidth={active ? 1.6 : 1}
                    style={{
                      fill: lit ? C.boxLit : C.boxDim,
                      stroke: active ? C.strokeActive : lit ? C.strokeLit : C.strokeDim,
                      transition: "fill 320ms var(--ease), stroke 320ms var(--ease)",
                    }}
                  />
                  <text
                    x={e.x + 14}
                    y={e.y + 22}
                    className="font-mono"
                    fontSize="13"
                    fontWeight={500}
                    style={{ fill: active ? C.nameActive : lit ? C.nameLit : C.textDim }}
                  >
                    {e.name}
                  </text>
                  <line x1={e.x} x2={e.x + BOX_W} y1={e.y + HEAD_H - 4} y2={e.y + HEAD_H - 4} style={{ stroke: C.divider }} />
                  {e.columns.map((c, i) => {
                    const y = e.y + HEAD_H + 17 + i * ROW_H;
                    return (
                      <g key={c.name}>
                        <text x={e.x + 14} y={y} fontSize="11" className="font-mono" style={{ fill: c.pk ? C.pk : c.fk ? C.fk : C.textDim }}>
                          {c.pk && c.fk ? "PK·FK" : c.pk ? "PK" : c.fk ? "FK" : ""}
                        </text>
                        <text x={e.x + 58} y={y} fontSize="12" className="font-mono" style={{ fill: lit ? C.nameLit : C.textDim }}>
                          {c.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="grid min-w-0 gap-8 lg:grid-cols-12" aria-live="polite">
          <div className="min-w-0 lg:col-span-5">
            <p className="font-mono text-sm text-ice">{entity.name}</p>
            <p className="mt-2 text-sm text-muted">{t.entities[entity.name]}</p>

            <ul className="mt-4 space-y-1 font-mono text-xs">
              {entity.columns.map((c) => (
                <li key={c.name} className="flex gap-3">
                  <span className={`w-12 shrink-0 ${c.pk ? "text-warning" : c.fk ? "text-violet" : "text-muted"}`}>
                    {c.pk && c.fk ? "PK·FK" : c.pk ? "PK" : c.fk ? "FK" : ""}
                  </span>
                  <span className="text-fg">{c.name}</span>
                  <span className="text-muted">{c.type}</span>
                  {c.fk ? <span className="text-violet">→ {c.fk}</span> : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex flex-wrap gap-x-4 font-mono text-micro text-muted">
              <span>
                <span className="text-warning">PK</span> {t.pk}
              </span>
              <span>
                <span className="text-violet">FK</span> {t.fk}
              </span>
            </p>

            {relationText.length > 0 ? (
              <div className="mt-4">
                <p className="eyebrow">{t.relations}</p>
                <ul className="mt-1 font-mono text-xs text-fg">
                  {relationText.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 lg:col-span-7">
            <p className="eyebrow">{t.example}</p>
            <pre className="mt-2 max-h-[22rem] overflow-auto rounded-input border border-line bg-bg/70 p-4 font-mono text-[0.71875rem] leading-relaxed">
              <code>{sqlTokens}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
