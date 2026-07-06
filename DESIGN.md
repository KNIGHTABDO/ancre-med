# AncreMed Design System — Liquid Glass

This document is the single source of truth for AncreMed's visual language. Read it
before building or restyling any UI. It is written for both human contributors and AI
coding agents — follow it literally so new surfaces match the rest of the app.

The system is an **iOS 26 "Liquid Glass"** language: translucent frosted surfaces with
backdrop blur, specular highlights, capsule buttons, and generous rounding, all floating
over a soft ambient color-field. It supports **light and dark themes automatically**.

---

## 0. Non-negotiables

1. **All colors, radii, blur, and motion come from CSS variables** defined in
   `src/app/globals.css` `:root`. Never hardcode a hex color, an `rgba()`, or a pixel
   radius in a component. If a value you need does not exist as a token, add a token —
   don't inline it. This is what makes light/dark theming work for free.
2. **Styling is `styled-jsx`.** Every component owns a `<style jsx global>` block; there
   is no Tailwind, no CSS modules, no UI library. The SSR registry at
   `src/app/registry.tsx` must never be removed (it prevents FOUC).
3. **Never put `backdrop-filter` on a descendant of another `backdrop-filter` element.**
   See §4 — this is the single most common way to break the glass effect.
4. **Two glass tiers, chosen by cost** (see §3): real blur for fixed/bounded chrome,
   frosted tint (no blur) for unbounded scrolling content.
5. **Pair `-webkit-backdrop-filter` with `backdrop-filter` every time** (Safari), and
   provide an `@supports` fallback to a near-opaque background.

---

## 1. Token reference (`src/app/globals.css`)

The `:root` block holds the light theme; a `@media (prefers-color-scheme: dark)` block
overrides it for dark. A future manual toggle can set `data-theme="light"|"dark"` on
`<html>` — the dark block is already guarded with `:root:not([data-theme="light"])`.

| Group | Tokens | Purpose |
|---|---|---|
| Surfaces | `--bg`, `--bg-raised`, `--bg-sunken`, `--bg-hover` | Opaque base surfaces & hover states |
| Ambient | `--bg-ambient` | Layered radial-gradient field painted by `body::before`; **glass refracts this** |
| Ink | `--ink`, `--ink-secondary`, `--ink-tertiary` | Text, in decreasing emphasis |
| Lines | `--border`, `--border-strong` | Hairlines (translucent rgba, so dark-safe) |
| Accent | `--accent`, `--accent-hover`, `--accent-ink`, `--accent-soft` | Luminous clinical teal |
| Semantic | `--ok*`, `--warn*`, `--error*` (+ `-bg`, `-border`) | Status colors, translucent bgs |
| Silo tags | `--tag-has-*`, `--tag-ansm-*`, `--tag-edn-*`, `--tag-form-*`, `--tag-neutral-*` | Source-badge colors, theme-aware |
| **Glass** | `--glass-bg`, `--glass-bg-strong`, `--glass-bg-soft`, `--glass-border`, `--glass-highlight`, `--glass-shadow`, `--glass-fallback` | The liquid-glass primitives |
| Blur | `--blur-sm` (12px), `--blur-md` (20px), `--blur-lg` (32px), `--glass-saturate` (160%) | Backdrop-filter amounts |
| Radius | `--radius-sm` (10), `--radius-md` (16), `--radius-lg` (20), `--radius-xl` (28), `--radius-full` (capsule) | iOS-round corners |
| Motion | `--dur-fast/base/slow`, `--ease-out`, `--ease-in-out`, `--ease-spring` | Transitions; `--ease-spring` for press/hover |

Key idea: `--glass-bg*` are semi-transparent so the blurred `--bg-ambient` shows through.
Glass over a flat opaque color reads as nothing — the ambient field is what makes it look
like glass. Never set a chrome surface to a fully opaque `--bg`; use transparent or glass.

---

## 2. The glass utilities

Three ready-made classes are defined globally in `globals.css`. Add them to an element's
`className`, or paste the same four declarations into a component's own selector when it
needs a custom blur/radius.

```css
.glass         /* real glass: --glass-bg + blur-md + border + inset highlight + shadow */
.glass-strong  /* heavier: --glass-bg-strong + blur-lg */
.glass-tint    /* frosted tint: --glass-bg-soft + border + highlight, NO blur */
```

The canonical recipe (what `.glass` expands to):

```css
background: var(--glass-bg);
-webkit-backdrop-filter: blur(var(--blur-md)) saturate(var(--glass-saturate));
backdrop-filter: blur(var(--blur-md)) saturate(var(--glass-saturate));
border: 1px solid var(--glass-border);
box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--glass-shadow);
```

Always include the `@supports` fallback for real-glass surfaces:

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .my-glass-surface { background: var(--glass-fallback); }
}
```

---

## 3. Two tiers: when to blur, when to tint

Blur is a compositing cost. Choose the tier by how many of the surface there are and
whether they scroll:

| Tier | Use for | Recipe |
|---|---|---|
| **Real glass** (blur) | Fixed or bounded chrome: headers, sidebar, composer, modals, mobile nav, floating buttons, feature/source cards | `.glass` / `.glass-strong`, or paste the recipe |
| **Frosted tint** (no blur) | Unbounded, in-flow scrolling content: chat bubbles, chips/pills, code blocks, the long paper sheet | `.glass-tint`, or `--glass-bg-soft` + border + inset highlight |

Rule of thumb: **never blur a per-item element that can appear an unbounded number of
times in a scroller** (e.g. every chat message). Blur the fixed frame around it instead.
Source cards are real glass because they are bounded (only rendered when expanded).

---

## 4. The nested-blur rule (read this twice)

An element with `backdrop-filter` becomes the *backdrop root* for its descendants — a
child's own `backdrop-filter` samples the parent's already-composited output, not the
page behind it, so it renders as flat/empty. Therefore:

- **Modals:** the backdrop (`.modal-backdrop`) gets `blur(8px)` + `--scrim`. The modal
  **card** then uses `--glass-bg-strong` at high opacity and **no blur of its own**.
- **Mobile sidebar:** the sliding sidebar does the blurring; its scrim
  (`.sidebar-backdrop`) is a plain `var(--scrim)` with **no blur**.
- **Dropdown under a glass header:** the header capsule blurs; the dropdown panel, being a
  descendant/overlapping child, uses `--glass-fallback` (near-opaque) instead of its own
  blur. See `SiteHeader.tsx`.

If a glass surface looks grey/flat where you expected translucency, this rule is almost
always why.

---

## 5. Component patterns

- **Buttons** (`src/components/Button.tsx`): capsules (`--radius-full`). Primary = luminous
  gradient fill `linear-gradient(180deg, color-mix(in srgb, var(--accent) 85%, white), var(--accent))`
  + inset white highlight + tinted glow shadow. Secondary = `.glass` recipe. Press feedback
  is `transform: scale(0.97)` with `--ease-spring`.
- **Cards / panels:** `.glass` (bounded) or `.glass-tint` (in-flow), `--radius-lg`, hover
  lift `translateY(-1px)` with `--ease-spring`.
- **Chips / badges / pills:** `--radius-full`, `--tag-*` or `--accent-soft` background, a
  `--glass-border`. Colors must be tokens so they flip in dark.
- **Inputs / composer:** `.glass-strong`, `--radius-xl`; on focus, accent-tinted border +
  `0 0 0 3px var(--accent-soft)` ring.
- **Page shells:** `background: transparent` so the `body::before` ambient field shows
  through. Do not paint shells with `--bg`.

---

## 6. Theme-aware SVG diagrams

SVG diagrams must not carry hardcoded fills (that breaks dark mode). **Style SVG shapes and
text with CSS classes that reference tokens**, not with `fill="#..."` presentation
attributes. See the `.dg-*` classes in `src/app/paper/page.tsx` for the reference set
(`.dg-box`, `.dg-box-accent`, `.dg-box-ok`, `.dg-chip`, `.dg-title`, `.dg-muted`,
`.dg-line`, `.dg-arrow`, `.dg-axis`, `.dg-curve-*`). Wrap wide diagrams in a
`.figure-scroll` container (`overflow-x: auto`) and give the `<svg>` a `min-width` so they
stay legible on mobile via horizontal scroll instead of shrinking to nothing.

> Note: CSS custom properties work when applied via CSS **rules/classes** on inline SVG
> elements, but are unreliable inside `fill="var(--x)"` presentation attributes — always
> use classes.

---

## 7. Responsive & accessibility

- **Mobile text:** justified body text creates ugly rivers on narrow screens — switch to
  `text-align: left` under `@media (max-width: 768px)` (see the paper page).
- **Wide content** (tables, diagrams, code) lives in an `overflow-x: auto` container so the
  page body never scrolls horizontally.
- **Motion:** the global `prefers-reduced-motion` block in `globals.css` collapses
  animations — don't override it.
- **Contrast:** keep text on `--ink`/`--ink-secondary`; `--ink-tertiary` is for de-emphasized
  meta only. Verify both themes when adding a new surface.

---

## 8. Checklist for any new UI

- [ ] Colors/radii/blur/motion all reference tokens (no inline hex/rgba/px radius).
- [ ] Chose the correct tier (real glass vs. tint) for the surface's cost profile.
- [ ] No `backdrop-filter` nested inside another `backdrop-filter`.
- [ ] `-webkit-backdrop-filter` present and an `@supports` fallback exists.
- [ ] Looks correct in **both** light and dark (test with DevTools `prefers-color-scheme`).
- [ ] No horizontal body overflow on a 390px viewport.
- [ ] Any SVG uses `.dg-*`-style token classes, not hardcoded fills.

---

## 9. Verifying

```bash
npm run typecheck
npm run dev          # then visit /, /chat, /paper, /changelog, /terms, /privacy
```

Emulate `prefers-color-scheme: dark` and a 390px viewport in DevTools (or Playwright with
`colorScheme` + a mobile `viewport`) and screenshot each page in both themes. The diff for
a pure design change should touch only style blocks, class strings, and token definitions.
