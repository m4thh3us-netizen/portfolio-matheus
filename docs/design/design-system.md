# Design System — "Ice & Violet"

Owner: `designer-ux-ui`. Futurist, minimal, editorial, premium. Never gamer, anime, cyberpunk or a generic template.

## Color tokens (CSS variables → Tailwind)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#080D1E` | Page background |
| `--bg-2` | `#10182B` | Raised surfaces, cards |
| `--ice` | `#B7E4FF` | Primary accent, highlights, focus ring |
| `--electric` | `#4FA8FF` | Interactive accent, links, primary button glow |
| `--violet` | `#A78BFA` | Secondary accent, reflections, tags |
| `--text` | `#F5F9FF` | Primary text (contrast 18.6:1 on bg) |
| `--text-2` | `#A8BAD6` | Secondary text (contrast 9.6:1 on bg) |
| `--line` | `rgba(183,228,255,0.12)` | Hairlines, borders |
| `--glass` | `rgba(16,24,43,0.55)` | Glass panels (+ `backdrop-blur: 16px`) |

Status colors (badges only): success `#7DE3C1`, warning `#F5C97A`, error `#FF8FA3`.

## Typography
- Display: **Space Grotesk** (600/500), tight tracking `-0.03em`.
- Body: **Inter** (400/500), `1rem/1.7`.
- Mono (code, API, labels): **JetBrains Mono** 400/500.
- Scale (fluid `clamp`): display `clamp(2.75rem, 7vw, 6rem)`, h2 `clamp(2rem, 4vw, 3.25rem)`, h3 `1.375rem`, body `1rem`, small `0.875rem`, eyebrow mono `0.75rem` uppercase `0.2em` tracking.

## Layout
- Container max-width `1200px`, gutters 20px mobile / 32px tablet / 48px desktop.
- Section vertical rhythm: `clamp(6rem, 12vw, 10rem)`.
- 12-column grid desktop; single column < 768px.
- Hero: text left (≈6/12 columns), 3D rings right (≈6/12) on desktop; on mobile rings sit behind the text at 45% opacity, content always readable.

## Surfaces
- Radius: 14px cards, 999px pills, 10px inputs.
- Card: `bg-2` at 70% + 1px `--line` border + subtle inner top highlight `inset 0 1px 0 rgba(255,255,255,0.04)`.
- Glow (hover only): `0 0 0 1px rgba(79,168,255,.35), 0 20px 60px -20px rgba(79,168,255,.35)`.

## Motion
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (out-expo-ish). Durations: micro 160ms, UI 320ms, reveal 800ms, hero intro ≤ 1.4s total.
- Reveal: translateY 24px → 0 + opacity, stagger 80ms.
- `prefers-reduced-motion: reduce` → no transforms, no 3D motion, instant reveals.

## States
- Focus-visible: 2px `--ice` outline, 3px offset — on every interactive element.
- Buttons: primary = ice gradient fill (`--ice` → `--electric`) with dark text `#080D1E`; secondary = glass + `--line` border. Hover lifts 2px + glow; active 0px; disabled 40% opacity.
- Form: input `bg-2`, border `--line`; focus border `--electric`; error border + message in error color with `aria-describedby`; loading button shows spinner + "Enviando…".

## Do / Don't
- Do: whitespace, few strong elements, mono micro-labels (`01 — About`), hairline dividers.
- Don't: particle storms, neon overload, skill percentage bars, emoji, character art.
