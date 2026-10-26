# COLREG content source and provenance

## Active reference — 26 October 2026

The owner selected **COLREG-Consolidated-2018.pdf** to replace the previously supplied Turkish translation.

- Preserved public copy: `public/content/colreg-source.pdf` (unchanged supplied bytes).
- Document title: *Convention on the International Regulations for Preventing Collisions at Sea, 1972 — Consolidated edition, 2018*.
- Language: English. Edition stated in the document: 2018.
- 62 physical PDF pages; 849,076 bytes.
- SHA-256: `c3d85b3b833ac39100d8bd7a767a77058e12f3e738e5b83ec89aa8d465fa6a5f`.
- Rules 1–41: PDF pages 5–36; Annexes I–III: 37–49; active Annex IV: 52–53.

The supplied file is the project's reference, not a claim of verified official publication or currency beyond its stated edition. The document's amendment notes and editorial diagrams are retained as document content; they are not additional Rules. English learning explanations, animation geometry/timing and synthesized audio remain separately authored teaching material.

## Multiple texts in this PDF

The document contains two Annex IV versions. Pages 50–51 retain older radiotelegraph/radiotelephone alarm entries. **The active record uses only pages 52–53**, containing DSC, satellite alerts and the updated search-and-rescue reference. The older text is available through a clearly labelled supplementary source link and is not mixed into the active distress list.

Convention Articles I–IX on PDF pages 1–4 and supplementary watchkeeping recommendations on pages 54–62 are indexed separately under edition/source notes. They are preserved in the original PDF and raw extraction, outside the 45 Rule/Annex records.

## Reproducible extraction

`scripts/extract_colreg_2018.py` checks the supplied file's exact checksum/size/page count, extracts its text layer using `pypdf`, and writes:

- `content/raw-pages.json` and `.txt`: all 62 pages with physical, 1-based PDF page numbers;
- `public/content/rules.json`: 41 Rules and four Annexes, source clauses and separate learning fields;
- `content/reference-catalog.json`: compact edition/checksum/record-page metadata for initial UI source labels;
- `content/clause-coverage.csv`: one row per extracted segment.

Strict Rule/Annex headings define record boundaries. Inline diagram captions such as `Rule 27(b)(i)` cannot start another record. Part/Section structural headings and wrapped continuations are excluded from the preceding record; they remain in raw pages. Three MSC circular interpretation blocks are separately tagged `document-note`, displayed as commentary rather than Rule text. There are 447 document segments in total. Sequential segment IDs are identifiers within this source edition, not a claim of correspondence to segment IDs from the retired translation. Each record's `sourceText` equals all its clause text joined by blank lines, including the labelled document notes.

`content/reference-overrides-2018.json` contains integrated learning-copy corrections from `content/review/conduct-2018.json` and `content/review/technical-2018.json`. These update authored explanations; they cannot rewrite preserved clauses or page references. Audit scope and findings are in `SOURCE_CONDUCT_2018_REVIEW.md` and `SOURCE_TECHNICAL_2018_REVIEW.md`.

```powershell
python scripts/extract_colreg_2018.py public/content/colreg-source.pdf --overrides content/reference-overrides-2018.json
python scripts/render_source_pages.py
node scripts/generate_encounters.mjs
node scripts/generate_previews.mjs
python -m unittest scripts/test_extract_colreg_2018.py scripts/test_extract_colreg.py
npm test
npm run typecheck
npm run build
```

The PDF and its page images load on demand. `scripts/render_source_pages.py` produces faithful page previews for tables, formulas and drawings. Text extraction alone cannot preserve those layouts, and some formulas are embedded images with no text-layer equivalent. Spacing, typographical and character-encoding defects in the text layer are not silently corrected in source clauses. Consult the page/PDF when a formula, symbol or table is unclear.

## Citation and comparison policy

Scenario citations and laboratory page labels derive from the active record map. A source migration must not leave a page number referring to the retired PDF. Encounter data retains authored routes, lengths and timing; any explanatory changes are documented in `SOURCE_MIGRATION_2018.md`.

Every extracted segment has `extracted=true`. The clause-level `compared`, `visualized` and `tested` flags are not automatically certified by a parser test or a top-level learning-copy review. They remain false until the corresponding substantive clause-level check is documented. Content is available without an expert-approval gate; the scenario `reviewed` status still requires a real documented review.

## Retired Turkish reference

- Former supplied file: `COLREG 72 SÖZLEŞMESİ GÜNCEL METNİ.pdf`, 25 pages.
- SHA-256: `227637e5e7c47b9f3b676c2b1a52da2b8f3390b3f6c5d3ba573a2e2562052386`.
- Original local PDF/data snapshots: ignored `content/sources/legacy-turkish-2026-10-26/`.
- Prior tracked versions remain recoverable in Git history. The old extractor/test are archival; they are not the active content pipeline.

Prior Ministry/Organization wording differences belong to that retired translation. Active records now cite the English supplied PDF and no longer present the Turkish text as their reference.
