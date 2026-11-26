# Frontend visual review (Phase 9)

Reviewer: `designer-ux-ui`. Reference: `docs/design/design-system.md` ("Ice & Violet").
Scope: `frontend/src/**` as of this review. **No files under `frontend/` were edited**; every fix below is a request for `frontend-3d`.

Priority: **P1** must fix before release · **P2** should fix · **P3** polish.

## Verdict

The editorial base is solid: numbered mono eyebrows, hairline dividers, large Space Grotesk display, generous whitespace, no skill bars, no particles. Tokens are mapped to CSS variables and Tailwind (`@theme inline`), and most colors go through them. Five problems block release. Four are about accessibility: the global focus rule is unlayered, so it breaks focus rings on pills, tabs and cards; and text is hard to read over the mobile hero and in the dimmed SQL diagram. The other is that the hero glass reads steel-blue. Two things still keep the site from feeling "premium editorial": the uniform 3-column project grid with tilt and glow, and the perpetual packet animation in the Lab.

---

## P1 — must fix

### 1. Global focus rule is unlayered and forces `border-radius: 4px`
- **Where:** `frontend/src/app/globals.css:58-62`
- **Problem:** `:focus-visible { outline…; outline-offset: 3px; border-radius: 4px; }` is outside any `@layer`. That causes two problems:
  1. Unlayered CSS beats Tailwind's `@layer utilities`. So every `rounded-full` / `rounded-[10px]` element turns into a 4px-radius box while focused: `LangSwitch`, the menu button, the dialog close button, the SQL entity pills, the snippet buttons and the nav links.
  2. Utility overrides like `focus-visible:outline-none` (`ProjectCard.tsx:61`), `focus-visible:outline-offset-[-2px]` (`Lab.tsx:92`) and `outline-none` (`SqlArchitecture.tsx:113`, `page.tsx:29`) are silently ignored.
- **Fix:**
```css
@layer base {
  :focus-visible {
    outline: 2px solid var(--ice);
    outline-offset: 3px;
    /* no border-radius: outlines follow the element's own radius */
  }
}
```

### 2. Project card focus ring is clipped or doubled
- **Where:** `frontend/src/components/projects/ProjectCard.tsx:41` (`overflow-hidden`), `:61`
- **Problem:** The stretched-link ring sits on `::after` at `inset-0` with `outline-offset: 3px`, so it draws *outside* the card. The article's `overflow-hidden` clips it. Today the button's own outline also shows, because of #1, so the title gets a box. Once #1 is fixed there is **no visible focus ring**: only the faint `--glow` remains.
- **Fix:** In the button className, replace `focus-visible:after:outline-offset-[3px]` with `focus-visible:after:outline-offset-[-2px]`, and `after:rounded-[14px]` with `after:rounded-[13px]`. Keep `focus-visible:outline-none`; it takes effect after #1.

### 3. Lab tab and panel focus rings are clipped
- **Where:** `frontend/src/components/lab/Lab.tsx:47` (tablist `overflow-x-auto`), `:65` (tab buttons), `:42` (card `overflow-hidden`), `:92` (tabpanel)
- **Problem:** A 3px-offset outline on the tabs is cut off at the top, the bottom and the left of the first tab by the scroll container. The panel ring at `:92` is clipped by the card. Its `-2px` offset only works after #1.
- **Fix:** Add `focus-visible:outline-offset-[-4px] focus-visible:rounded-[10px]` to the tab button className. With #1 applied, `:92` works as written.

### 4. Mobile hero: rings at 45% sit behind the bio and CTAs
- **Where:** `frontend/src/components/sections/Hero.tsx:13`, bio at `:40`
- **Problem:** Below 768px the canvas fills the whole hero (`inset-0`) and the rings are centered, right behind the bio. Where an ice highlight (`#B7E4FF` at 45%) sits behind `text-muted` (#A8BAD6), contrast falls to about **2.7:1**, below AA. A portrait canvas (aspect around 0.46) also crops the rings at the sides (the camera FOV is vertical).
- **Fix:** On mobile, use a square canvas that sits top-right and partly off-screen, plus a scrim. Replace the wrapper className with:
```
pointer-events-none absolute -z-10 opacity-35
right-[-38vw] top-[8svh] aspect-square w-[118vw]
md:inset-y-0 md:left-1/2 md:right-0 md:top-0 md:aspect-auto md:w-auto md:opacity-100
```
  Then add a scrim as the section's first child (mobile only):
```tsx
<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-[5] bg-[linear-gradient(180deg,transparent_0%,rgba(8,13,30,0.55)_45%,var(--bg)_100%)] md:hidden" />
```
  This puts the rings behind the eyebrow and the first line of the display, where the text is near-white and keeps ≥ 6.9:1. The bio and CTAs sit on the scrim.

### 5. SQL diagram: dimmed entities fail contrast
- **Where:** `frontend/src/components/lab/SqlArchitecture.tsx:114` (`opacity={lit ? 1 : 0.45}`)
- **Problem:** The whole group fades, text included. Measured on `#10182B`: column text (#A8BAD6) at 45% gives **2.8:1**, and entity names (#F5F9FF) at 45% give **4.3:1**. These are focusable buttons.
- **Fix:** Drop the group opacity and dim only the shapes:
  - `<g>`: remove `opacity`.
  - `<rect>` fill: `lit ? "#10182B" : "rgba(16,24,43,0.55)"`.
  - Stroke when not lit: `rgba(183,228,255,0.10)`.
  - Name `<text>` fill when not lit: `#A8BAD6` (9.0:1).
  - Column name fill when not lit: `#A8BAD6`.
  - PK/FK labels: keep their colors.

---

## P2 — should fix

### 6. Hero glass reads steel-blue, not pale ice with violet reflections
- **Where:** `frontend/src/components/three/RingsScene.tsx:35, 51-53, 104-123, 135-145, 177-178`
- **Diagnosis:**
  - (a) `GLASS_BG = #3b5582` is what the glass refracts wherever the alpha canvas is empty. It is a dark, desaturated hue around 218°, which is exactly "steel blue". Ice `#B7E4FF` is around 202° and much lighter.
  - (b) ACES Filmic darkens mid-tones and pulls saturated blues toward grey.
  - (c) The violet light is too weak to register: a point light at 18 cd about 4.5 units away contributes almost nothing, and there are no thin-film effects.
  - (d) The backdrop blobs are faint (alpha 0.18–0.24), so there is little light to refract.
- **Fix:** concrete values.
```ts
// :35 — lighter, cyan-shifted refraction base
const GLASS_BG = new THREE.Color("#86b9e3");

// :51-53 — brighter backdrop to refract
blob(size * 0.38, size * 0.42, size * 0.42, "rgba(183,228,255,0.40)");
blob(size * 0.66, size * 0.62, size * 0.38, "rgba(167,139,250,0.34)");
blob(size * 0.5,  size * 0.5,  size * 0.18, "rgba(245,249,255,0.30)");
```
```tsx
// :104-123 — MeshTransmissionMaterial
<MeshTransmissionMaterial
  samples={4}
  resolution={512}
  transmission={1}
  thickness={0.6}
  roughness={0.12}               // slight frost = "ice", not clear window glass
  ior={1.31}                     // ice IOR; less dark edge refraction than 1.42
  chromaticAberration={0.08}     // cyan/violet fringes at the rims
  anisotropicBlur={0.1}
  distortion={0.08}
  distortionScale={0.35}
  temporalDistortion={0}
  clearcoat={1}
  clearcoatRoughness={0.06}
  iridescence={0.45}             // thin-film: violet/cyan reflections
  iridescenceIOR={1.3}
  iridescenceThicknessRange={[180, 520]}
  envMapIntensity={2.2}
  background={GLASS_BG}
  color={r.tint}
  attenuationColor={i === 1 ? "#d9ceff" : "#cfeeff"}  // middle ring leans violet
  attenuationDistance={1.4}      // was 5 (no visible tint)
/>
```
  Ring tints in `RINGS` (`:29-31`): keep `#f2f9ff`, `#efe9ff`, `#eaf6ff`.
```tsx
// :135-145 — lights
<ambientLight intensity={0.35} color="#b7e4ff" />
<directionalLight position={[-3, 4, 5]} intensity={2.4} color="#dff3ff" />
<pointLight position={[3.2, 1.2, -1.8]} intensity={45} distance={12} decay={2} color="#a78bfa" />
<Environment resolution={256} frames={1}>
  <Lightformer form="rect" intensity={6}   color="#dff3ff" position={[-4, 3, 3]}    scale={[6, 2, 1]}   target={[0, 0, 0]} />
  <Lightformer form="rect" intensity={5}   color="#a78bfa" position={[3.5, 0.5, -1]} scale={[3, 5, 1]}  target={[0, 0, 0]} />
  <Lightformer form="rect" intensity={2.5} color="#a78bfa" position={[-3, -2.5, 2]}  scale={[5, 0.6, 1]} target={[0, 0, 0]} />
  <Lightformer form="ring" intensity={2.2} color="#b7e4ff" position={[0, 0, 6]}     scale={3}           target={[0, 0, 0]} />
  <Lightformer form="rect" intensity={1.8} color="#f5f9ff" position={[0, 5, 0]}     scale={[8, 1, 1]}   rotation-x={Math.PI / 2} />
</Environment>
```
```ts
// :177-178 — keep hue, lift exposure (three 0.187 has NeutralToneMapping)
gl.toneMapping = THREE.NeutralToneMapping;
gl.toneMappingExposure = 1.15;
```
  **Acceptance check:** the brightest rim should read near `#E6F5FF`, and the body of each tube should sit around `#9CCBEF`–`#B7E4FF`. Violet should show on the right/back rims and as thin-film tints. If the tubes start reading as solid white, step `GLASS_BG` down to `#74a6d4`.
  Also update `RingsFallback.tsx` to match: in `rf-ice`, change the 100% stop from `#4FA8FF @ 0.15` to `#B7E4FF @ 0.25` so the fallback is also "ice" rather than electric.

### 7. Rings are cropped or over-faded at 768–1280px
- **Where:** `frontend/src/components/three/HeroVisual.tsx:34`, `RingsScene.tsx:174`, `Hero.tsx:13,20-21`
- **Problem:** The camera FOV is vertical. On a half-width canvas the aspect is about 0.38 on tablet portrait and about 0.57 at 1024×900, so the 2.9-unit ring group overflows the canvas width. The `closest-side … #000 62%` mask then fades the outer ring. At 768–1023 the text column is only about 350px wide next to a cramped visual.
- **Fix:**
  - (a) Move the hero split to `lg`: in `Hero.tsx`, change every `md:` that controls the split (wrapper `md:left-1/2`, `md:opacity-100`; grid `md:grid md:grid-cols-12`; `md:col-span-6`) to `lg:`. Tablet then uses the mobile composition from #4.
  - (b) Mask: `[mask-image:radial-gradient(closest-side,#000_78%,transparent_100%)]`.
  - (c) Fit the camera to the aspect ratio inside `<Canvas>`:
```tsx
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.z = THREE.MathUtils.clamp(7.8 * Math.max(1, 0.9 / aspect), 7.8, 12.5);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}
```

### 8. The loading state looks disabled
- **Where:** `globals.css:170-174`, `ContactForm.tsx:264`, `LiveApi.tsx:73`
- **Problem:** `disabled` plus `opacity: .4` turns "Enviando…" into a ghost button, and the dark spinner (`border-bg`) on a gradient at 40% is barely visible. The spec defines loading and disabled as separate states.
- **Fix:** Add `aria-busy={sending}` (or `running`) to the buttons, then:
```css
.btn[aria-busy="true"] { opacity: 1; cursor: progress; }
.btn[aria-busy="true"]:hover { transform: none; box-shadow: none; }
```
  Also set `aria-disabled` styling only when the button is not busy.

### 9. Micro text below the type floor
- **Where:** Every `text-[0.625rem]` (10px): `Header.tsx:73`, `RequestFlow.tsx:50,54`, `TechStack.tsx:50`, `Contact.tsx:33`. There are also 15 or more `text-[0.6875rem]` arbitrary values.
- **Problem:** Uppercase mono with wide tracking at 10px is hard to read and falls outside the scale. Repeated arbitrary values also drift from the scale.
- **Fix:** Add a `--fs-micro: 0.6875rem` token (tokens.css, once unlocked) and map it in `@theme inline` as `--text-micro: var(--fs-micro)`. Replace every `text-[0.625rem]` and `text-[0.6875rem]` with `text-micro`. 11px is the floor; nothing goes below it.

### 10. ER diagram text renders at about 7.6–9px
- **Where:** `SqlArchitecture.tsx:71, 94, 127, 135, 138`
- **Problem:** The 770-unit viewBox gets scaled down: about 0.73× at `min-w-[560px]` on mobile and about 0.88× in `xl:col-span-7`. That turns `fontSize="10.5"` into roughly 7.6–9px on screen.
- **Fix:** Use `min-w-[680px]` (mobile scrolls horizontally; this is acceptable for a diagram). Raise the SVG sizes: name `13`, column names `12`, PK/FK `11`, relation labels `11.5`. Raise `ROW_H` to 24 and `BOX_W` to 200, and re-check the coordinates in `content/sql-model.ts`.

### 11. Request flow is too cramped at md/lg
- **Where:** `RequestFlow.tsx:31, 37, 58`
- **Problem:** Six nodes in a row from 768px leave about 77px per node at md and about 108px at lg. "Controller" and the mono tags truncate or overflow.
- **Fix:**
  - `<ol>`: `mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-row xl:items-center xl:gap-0`.
  - Node `<li>`: `xl:flex-1`.
  - Connector `<li>`: `relative mx-auto h-8 w-px sm:hidden xl:mx-0 xl:block xl:h-px xl:w-10 xl:flex-none`, and change the packet's `md:` variants to `xl:` (`max-md:` becomes `max-xl:`).

### 12. Component classes are unlayered
- **Where:** `globals.css:143-212` (`.btn*`, `.field`)
- **Problem:** Same cause as #1. Utilities can't override them, for example a one-off `rounded-input` on a `.btn`, or `opacity-*`.
- **Fix:** Wrap them in `@layer components { … }`.

### 13. Form field states are incomplete
- **Where:** `globals.css:188-212`, `ContactForm.tsx:191, 271-272`
- **Fix:**
```css
.field:hover:not(:focus):not([aria-invalid="true"]) { border-color: var(--line-strong); }
.field[aria-invalid="true"] { border-color: var(--error); box-shadow: 0 0 0 3px rgba(255,143,163,0.12); }
.field:read-only, .field:disabled { opacity: .6; cursor: not-allowed; }
```
  - Set `readOnly={sending}` on the inputs and the textarea.
  - Success message: wrap it in `rounded-[10px] border border-success/40 bg-success/5 px-4 py-3 text-success` with a leading `✓` (aria-hidden).
  - Error summary: same wrapper, using `danger`.

### 14. The mobile menu panel is too transparent
- **Where:** `Header.tsx:124`
- **Problem:** `glass` (55%) over page content puts the 3xl links over moving text and images.
- **Fix:** Replace `glass` with `bg-[rgba(8,13,30,0.94)] backdrop-blur-[16px]`. Optionally add the token `--glass-strong: rgba(8,13,30,0.94)`.

### 15. The project grid reads as a generic template
- **Where:** `Projects.tsx:90-95`, `ProjectCard.tsx:17, 28, 44-48`
- **Problem:** Six identical cards in three columns, with 6° tilt, a pointer specular and a glow, is the stock "portfolio template" look and edges toward gamer.
- **Fix:**
  - (a) Feature the first item: on the `<li>` set `className={i === 0 ? "flex lg:col-span-2" : "flex"}`, and give that card a larger title (`text-h2`-scale `text-[clamp(1.75rem,3vw,2.5rem)]`).
  - (b) Lower `MAX_TILT` to `2.5` and drop `translateY(-2px)` from the tilt transform.
  - (c) Lower the specular alpha to `0.05`.

### 16. The ER entity focus indicator is too weak
- **Where:** `SqlArchitecture.tsx:113`
- **Problem:** Once #1 is fixed, `outline-none` applies and focus becomes only a 1px stroke color change.
- **Fix:** Use `[&:focus-visible>rect:first-of-type]:stroke-[#B7E4FF] [&:focus-visible>rect:first-of-type]:[stroke-width:2.5]`.

---

## P3 — polish

17. **Hardcoded colors:**
    - `SqlArchitecture.tsx:74, 89, 123-138` hex fills: use `style={{ fill: "var(--bg-2)" }}` / `stroke: "var(--electric)"`. Presentation attributes don't resolve `var()`; `style` does.
    - `RingsFallback.tsx:7-40`: same approach, using `style={{ stopColor: "var(--ice)" }}`.
    - `globals.css:301` `.tok-string #9fe0c7` is off-palette: use `var(--success)`.
    - `RingsScene.tsx`: move the hexes into a `three/palette.ts` constant that mirrors tokens.css.
18. **Radii outside the scale:** `rounded-[12px]` (`RequestFlow.tsx:42`, `LiveApi.tsx:86`, `CodeShowcase.tsx:50`, `SqlArchitecture.tsx:70`). Add `--radius-panel: 12px` (map `--radius-panel` in `@theme`) and use `rounded-panel`. Replace `rounded-[14px]` (`Journey.tsx:30`) with `rounded-card`, and `rounded-[10px]` with `rounded-input`.
19. **`@theme inline` self-reference:** `globals.css:23-24` maps `--radius-card: var(--radius-card)`. It works only because unlayered tokens.css wins. Rename the source tokens (`--r-card`, `--r-input`) or map them under different theme names.
20. **Display line-height:** `.text-display` at `0.98` (`globals.css:106`) can let PT accents ("É", "ã") touch the line above. Use `1.02`.
21. **Section rhythm:** each section pads `--section-y` on both sides, which leaves up to 320px between sections on desktop. Consider `padding-block: calc(var(--section-y) * 0.6)`, or a top-only pad plus hairline dividers.
22. **`btn-secondary` hover:** add `border-color: rgba(79,168,255,0.5)` on hover.
23. **Dialog:** `ProjectDialog.tsx:66` has a `backdrop:bg-transparent` that is overridden by `dialog::backdrop`, so remove it. Add an entrance animation:
```css
dialog[open]{ transition: opacity var(--dur-ui) var(--ease), transform var(--dur-ui) var(--ease); }
@starting-style { dialog[open]{ opacity:0; transform: translateY(12px) scale(.98); } }
```
24. **Request-flow packets** loop forever on all five connectors, which feels like a dashboard. Animate only connectors with `i < index` and render the others static.
25. **Header nav** has no current-section state. Add `aria-current="true"` plus `text-fg` and a 1px ice underline (`after:` hairline), driven by IntersectionObserver.
26. **Hero name hierarchy:** the person's name is `text-lg text-muted`, weaker than the eyebrow dot. Use `text-fg` for the name and keep the role in `text-ice`.
27. **Header glass over the hero:** once scrolled, consider switching the header to `--glass-strong` (see #14) for consistency.
28. **Fonts:** confirm in DevTools that `body` computes to Inter and `.eyebrow` to JetBrains Mono. Both depend on the Tailwind-emitted `--font-sans` / `--font-mono`. If not, reference `var(--font-inter)` and `var(--font-jetbrains-mono)` directly in `globals.css:45, 93`.

## Verified OK
- Contrast:
  - `text-2` on `--bg`: 9.6:1. On `--glass` over bg: about 9.4:1. On cards (bg-2 at 70%): about 9.1:1.
  - Status colors on bg: electric 7.7, violet 7.1, success, warning and error all ≥ 7.
  - Dark text on the primary gradient end (`#4FA8FF`): 7.7:1.
  - `text-muted/70` pending links: 5.2:1.
- Badges use the status colors only, with dashed "pending" styling. No percentages and no levels (TechStack is compliant).
- Reduced motion: the global CSS stops animations, MotionLayer exits early, and `useCan3D` falls back to the SVG.
- Motion easing and durations match the tokens. The hero intro is about 0.9s plus stagger, within 1.4s.
- Nothing anime, emoji or particle-storm. Glow use is restrained.

## Proposed token additions (for tokens.css once unlocked)
```css
--fs-micro: 0.6875rem;
--radius-panel: 12px;
--glass-strong: rgba(8, 13, 30, 0.94);
```
