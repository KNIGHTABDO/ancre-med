# AncreMed v2 Implementation Log

## Phase 1 - Retrieval Depth

- Built a default-off `ANCREMED_V2_DEEP_SEARCH` flag and shared feature-flag helpers.
- Added topic-class/playbook types plus a deep-search planner loop that fans out FTS5/BM25 lexical searches, tracks coverage, stops at bounded rounds, and keeps the legacy router path unchanged when the flag is off.
- Changed files: `src/lib/featureFlags.ts`, `src/lib/clinicalTypes.ts`, `src/lib/deepSearch.ts`, `src/app/api/router/route.ts`, `next.config.js`, `.env.example`.
- Verification: `npm run typecheck` passed; `npm run build` passed. No test script exists in `package.json`.
- Deviation/confidence: LLM gap-checking is present but the cheap heuristic path is preferred. Live Wikipedia/medicaments enrichment remains layered onto deep-search results for continuity with v1.

## Phase 2 - Gate Redesign

- Built a default-off `ANCREMED_V2_GATE_SPANS` generation path with `narrative`, `clinical_assertion`, and `abstention` spans.
- Added deterministic checks for narrative claim markers, exact quote substring matching, confidence threshold, and source-identifier/entity consistency; uncovered sections from the router are force-rendered as abstentions if the model omits them.
- Changed files: `src/app/api/generate/route.ts`, `src/app/chat/page.tsx`.
- Verification: `npm run typecheck` passed; `npm run build` passed. No test script exists in `package.json`.
- Deviation/confidence: the independent verifier is intentionally held for Phase 4, which section 14 permits. Entity matching is strict when `source_identifier` exists; source-title fallback is used only for context chunks without identifiers.

## Phase 3 - Calculation Bank

- Built a default-off `ANCREMED_V2_FORMULA_BANK` path with a `clinical_formulas` table, curated seed data, a reusable formula-bank helper, and `npm run seed:formulas`.
- Seeded the configured Turso database with five manually curated rows: Cockcroft-Gault, CHA2DS2-VASc, CHA2DS2-VA ESC 2024, qSOFA, and Child-Pugh. Formula hits are returned as a fourth silo and mark `formule`/`interpretation` covered for abstention logic.
- After v2 smoke testing, calculation generation now prioritizes `clinical_formulas` chunks and removes EDN multiple-choice chunks when verified formula-bank context exists, so formula claims cite the curated bank instead of exam distractors.
- Changed files: `src/data/clinical_formulas.seed.json`, `src/lib/formulaBank.ts`, `scripts/seed-clinical-formulas.mjs`, `src/app/api/router/route.ts`, `package.json`.
- Verification: `npm run typecheck` passed; `npm run seed:formulas` passed against the configured Turso URL; `npm run build` passed. No test script exists in `package.json`.
- Deviation/confidence: CKD-EPI was not seeded because the spec states it should be implemented but does not provide a manually verified equation. To preserve section 0.5, Cockcroft-Gault stores the CKD-EPI caveat but no unsourced CKD-EPI formula row was invented.

## Phase 4 - Verifier and Freshness Pipeline

- Built a default-off `ANCREMED_V2_VERIFIER_FRESHNESS` path with an independent verifier call for v2 clinical assertion spans and a `query_logs` table for latency, coverage, gate, verifier, and abstention metrics.
- Added freshness schema support (`superseded`, `guideline_family`, `source_freshness_events`) plus executable BDPM and HAS supersession scripts. Deep-search can exclude `superseded` rows only when the Phase 4 flag is enabled and the schema is ensured.
- Changed files: `src/lib/verifier.ts`, `src/lib/freshness.ts`, `src/lib/queryLogs.ts`, `src/lib/deepSearch.ts`, `src/app/api/generate/route.ts`, `src/app/api/router/route.ts`, `scripts/refresh-bdpm.mjs`, `scripts/check-has-supersession.mjs`, `package.json`.
- Verification: `npm run typecheck` passed; `freshness:bdpm` and `freshness:has` logic passed against a temporary local DB copy; `npm run build` passed. No test script exists in `package.json`.
- Deviation/confidence: HAS family inference is deterministic title normalization rather than a fully curated human family map. The scripts were changed to set-based SQL with indexes after a row-by-row verification attempt proved too slow.

## Phase 5 - Typo Tolerance, Caching, Templates, Trust UI

- Built a default-off `ANCREMED_V2_QUALITY_POLISH` layer with app-side typo correction, optional `search_vocabulary` support, a bounded Turso-safe vocabulary builder script, scoped response caching for `definition_item_edn` and `anatomie_physiologie`, template hints, and a per-answer coverage indicator in chat.
- Added cache invalidation checks against `documents.superseded` when the freshness schema exists, and kept cache scope out of patient-specific calculation/case classes.
- Changed files: `src/lib/typoCorrection.ts`, `src/lib/responseCache.ts`, `scripts/build-search-vocabulary.mjs`, `src/app/api/router/route.ts`, `src/app/api/generate/route.ts`, `src/app/chat/page.tsx`, `src/app/page.tsx`, `src/app/paper/page.tsx`, `package.json`.
- Verification: `npm run typecheck` passed; `npm run build` passed. No test script exists in `package.json`.
- Deviation/confidence: typo correction falls back to a small static medical vocabulary unless the offline vocabulary builder has populated `search_vocabulary`. The builder now uses source titles plus curated clinical terms instead of scanning full document text, because remote Turso full-corpus scans were too slow for the requested fast path.

## Phase 6 - Gate Over-Blocking Fix, JSON Parser Hardening & UI Cleanup

- Root cause: the v2 span gate blocked the entire response (422) the instant a single `clinical_assertion` failed the deterministic check, the narrative claim-marker regex, or the independent verifier, so correct, well-established answers (e.g. CHA2DS2-VASc / ESC-2024 CHA2DS2-VA for AF stroke risk) were routinely blocked over one disputed sentence.
- Removed the regex-based `narrativeContainsClinicalClaimMarkers` deterministic block entirely (a keyword-filtering pattern); replaced with stronger generation-prompt instructions in `buildSpanSystemInstruction` instead.
- Reworked `runSpanAttributionGate` and the `/api/generate` POST handler so a failing assertion (substring mismatch, entity mismatch, or independent-verifier rejection) is dropped individually via `filterSpansForRendering`, while verified assertions, narrative text, and abstentions are still served. The whole response is now only rejected when `hasRenderableContent` finds nothing usable at all (no verified assertion, no abstention, no narrative text).
- Rebalanced the independent verifier prompt in `src/lib/verifier.ts`: it previously instructed the model to "stay skeptical by default" and "be strict", which rejected correctly-sourced claims over minor phrasing differences. It now judges clinical substance (wrong drug, wrong pathology, wrong subgroup, fabricated number) and explicitly tolerates faithful paraphrase.
- Hardened `parseResponseSpan`/`parseSpanMedicalResponsePayload` in `src/app/api/generate/route.ts`: a single malformed span (missing `section`/`reason` on an `abstention`, an incomplete `clinical_assertion`, an unknown `type`) used to throw and fail the whole request. It is now logged and dropped, leaving the rest of the response intact.
- Fixed a page-layout bug where `.main-viewport` in `src/app/chat/page.tsx` declared `height: 100dvh` while its flex-row parent `.app-container` was `height: calc(100dvh - 64px)`, a 64px mismatch that let content overflow the intended layout height and made the whole page scrollable -- visible as the sidebar's "Version Clinique 1.0" footer drifting away from the bottom edge once a message was sent and the chat view grew taller. Fixed to `height: 100%` plus `min-height: 0` on the nested flex chain (`.main-viewport`, `.chat-interface`, `.chat-scroller`) so only the message list scrolls internally.
- Fixed a horizontal-scrollbar regression introduced by an earlier header-left-alignment change: `.header-container` had `width: 100%` plus `padding: 0 24px` on pages without a global `box-sizing: border-box` reset, adding 48px beyond the viewport. Removed the redundant `width: 100%` (block-level flex containers already size correctly under `width: auto`).
- Removed a duplicated "AncreMed" wordmark that was rendered a second time inside the chat sidebar header; only the top navbar logo remains.
- Fixed the sidebar's collapse/expand affordance: the desktop "reopen" button was positioned underneath the sticky header (lower z-index, overlapping coordinates) and was effectively invisible once the sidebar was collapsed; the desktop-only collapse icon was also shown (uselessly) on mobile widths where it could leave the sidebar stuck in a collapsed, non-reopenable state. The reopen button now renders below the header with a higher z-index, and mobile widths only ever show the single unambiguous close (X) control.
- Rebuilt the sidebar footer ("Version Clinique 1.0") as a proper pinned bottom bar (background, border, always flush to the bottom of the sidebar) instead of relying on ambiguous spacing.
- Changed files: `src/app/api/generate/route.ts`, `src/lib/verifier.ts`, `src/app/chat/page.tsx`, `src/app/page.tsx`, `src/app/changelog/page.tsx`, `src/app/paper/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`.
- Verification: `npm run typecheck` passed; `npm run build` passed; manually exercised the full `/api/router` -> `/api/generate` pipeline against 6 live queries (including the previously-blocked AF/ESC question) against a real dev server, confirming 200 responses and, in one case, correct partial degradation (`dropped_assertion_count: 1` with the rest of the answer still rendered).
