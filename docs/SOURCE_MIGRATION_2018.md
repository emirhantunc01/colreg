# Reference migration — 26 October 2026

## User decision

Use the owner-supplied `COLREG-Consolidated-2018.pdf` as the primary reference in place of the Turkish PDF. Split extraction and checks among independent agents and keep durable reports in the repository.

## Source facts and scope

- 62 PDF pages; SHA-256 `c3d85b3b833ac39100d8bd7a767a77058e12f3e738e5b83ec89aa8d465fa6a5f`.
- Rules 1–41: PDF pages 5–36. Annexes I–III: 37–49.
- Two versions of Annex IV occur: 50–51 and 52–53. Use 52–53 for the active distress reference, retaining a visible discrepancy note and the original PDF. Do not concatenate the versions.
- Convention articles: 1–4. Supplementary watchkeeping recommendations: 54–62. Preserve/index them separately from the 45 Rules/Annex records.
- The PDF labels itself a consolidated 2018 edition. Do not claim verified official provenance or currency beyond that edition.
- Legacy Turkish source/data archived locally at `content/sources/legacy-turkish-2026-10-26/` and remain recoverable in Git history.

## Ownership and interfaces

1. Extraction agent owns new extraction script/tests, active source PDF, raw page data, 45 records and clause coverage. It preserves authored learning fields initially and applies optional per-record overrides from `content/reference-overrides-2018.json`.
2. Conduct audit agent owns `content/review/conduct-2018.json` and its report; audit Rules 1–19 against new PDF and existing encounters. Return patches for learning fields, never rewrite raw clauses.
3. Technical audit agent owns `content/review/technical-2018.json` and its report; audit Rules 20–41 and Annexes against lab data. Return patches and concrete behavior findings; never rewrite raw clauses.
4. Lead owns source schema/UI, scenario source remapping, supplemental-page index, provenance/docs, integration, rendering and verification.

## Constraints

- No deployment, push, audience changes or automatic `reviewed` certification.
- No route or ship-length changes for a source migration. Substantive behavior corrections must be explicitly recorded and tested.
- Page numbers are physical 1-based PDF pages; all active citations must be regenerated from the new record map.
- Text-layer defects remain identifiable; diagrams/formulas/tables use faithful rendered page previews.
- No independent worker edits to shared output files owned by another worker. Reports, not entire page text, return to the lead.

## Progress

- Preflight: clean feature checkout; old source archived; 62 text-layer pages extracted to ignored `tmp/source-migration-2018/`.
- Boundary review: inline Rule/Annex references must not become false record headings. Repeated Annex IV versions must remain separate. Learning copy must not call the new source Turkish.
- Extraction: complete. 45 records, 447 document segments, including three separately labelled interpretation/circular blocks. All 62 raw text pages and the source PDF are preserved; rendered previews exist for every page.
- Conduct comparison: complete for authored learning fields. Rules 12–18 explicitly retain Rule 11 in-sight applicability; Rule 16 retains “so far as possible”; Rules 9, 17, 18 and 19 retain their distinct conditional duties. See `SOURCE_CONDUCT_2018_REVIEW.md`.
- Technical comparison: complete for authored learning fields and the listed lab checks. Annex II's required/optional cases, Annex III's 20/75 m boundaries, and Annex IV's 15 §1 signals versus two §3 additional items are distinguished. See `SOURCE_TECHNICAL_2018_REVIEW.md`.
- Runtime/source links: complete. Rules uses English source text, Roman annex labels, edition notes and a labelled supplementary index. All 36 educational scenario citations and laboratory page labels derive from the new reference; the two technical demos remain unchanged.
- Final verification: 130 Vitest tests in 27 files, five Python tests, TypeScript and production build passed on 26 October 2026. Non-blocking existing Rollup annotation/chunk-size warnings remain. Source PDF checksum matches the original. Clause-level substantive review flags remain false; top-level learning-copy review is not a clause-by-clause legal certification.

## Recorded integration decisions

- An initial extractor assigned structural Part/Section headings to preceding Rules. These headings and wrapped continuations now stay solely in raw pages, with boundary regression tests.
- MSC.1/Circ.1260 interpretation blocks on PDF pages 25, 39 and 43 are separate `document-note` segments, labelled in the source UI. Adjacent Rule/Annex text was checked again after the split.
- All 38 scenarios retain their vessels, tracks, lengths, durations and environment. Event timing/patterns are unchanged. Three educational scenarios have targeted explanatory corrections: `channel-crossing` adds an explicit schematic-timing caveat; `constrained-by-draught` follows Rule 3(h)'s ability-to-deviate wording; `scope-responsibility` labels its generic collision-avoidance reminder as such.
- The raw `.txt` extraction retains PDF text-layer whitespace intentionally; `.gitattributes` exempts this single fidelity artifact from whitespace lint. Raw JSON retains exact per-page strings.
- Browser checks: English Rule 17 source, active Annex IV links to PDF pages 52–53, both page images loaded, edition/supplement notes, lab page labels, distress grouping and no horizontal overflow at a 390 px viewport. Faithful source page previews 45, 47 and 52 were visually inspected, including the embedded formula and sound table. This is a source migration, not a renewed certification of every existing animation or navigation case.
- Evidence: `docs/verification/source-2018-rules-desktop.png`, `source-2018-rules-mobile.png`, `source-2018-signals-mobile.png`.
- The migration was completed locally on `feat/colreg-studio-update`. On 26 October 2026 the owner requested a new GitHub branch and redeployment to the existing Site URL; publication work uses `feat/colreg-2018-reference`. The current owner-only audience is preserved; public sharing was explained separately.
