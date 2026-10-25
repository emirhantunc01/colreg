# COLREG content source and provenance

## Source artifact

- Supplied file: `COLREG 72 SÖZLEŞMESİ GÜNCEL METNİ.pdf`
- Preserved public copy: `public/content/colreg-source.pdf`
- SHA-256: `227637e5e7c47b9f3b676c2b1a52da2b8f3390b3f6c5d3ba573a2e2562052386`
- PDF pages: 25
- Stated Turkish title: *Denizde Çatışmanın Önlenmesine İlişkin Uluslararası Kurallar Hakkında Sözleşme (COLREG-72)*
- Coverage: Rules 1–41 and Annexes I–IV

The hash is calculated from the supplied bytes and the public copy has the same hash. The repository does not claim that this PDF is an official publication, a certified translation, or the currently controlling legal text.

## Extraction method

`scripts/extract_colreg.py` uses `pypdf` text extraction. It writes the extracted text of every PDF page, without translation or OCR correction, to:

- `content/raw-pages.json`, with an explicit PDF page number for each page;
- `content/raw-pages.txt`, with visible PDF-page separators;
- `public/content/rules.json`, segmented into the 41 rules and four annexes; and
- `content/clause-coverage.csv`, one row per extracted clause.

Rule and annex headings define record boundaries. Parenthesized paragraph/subparagraph markers and numbered annex sections define stable sequential clause boundaries. A clause keeps every extracted line assigned to it and records every PDF page on which those lines occur. `sourceText` is reconstructed exactly as the clause texts joined by a blank line. Section headings (`BÖLÜM` and `KISIM`) and rule/annex headings are structural labels and are not included in clause text; they remain available in the raw page files.

The English titles, summaries, conditions, duties, exceptions, related-rule links, and keywords are educational finding aids written for this project. They are concise paraphrases, not official translations and not a substitute for the preserved Turkish clauses.

## Known source and extraction issues

The PDF text layer includes visible spacing and typographical artifacts such as split words (`etmey ecektir`, `olmadı ğı`, and similar examples). They are retained rather than silently corrected. Tables and formulas are preserved as text in extraction order. Text extraction cannot reproduce the PDF's visual table geometry, typography, drawings, or exact column alignment; consult the preserved PDF for those features.

The supplied Turkish PDF materially differs from the IMO English wording in two closely related places:

- Rule 1(d), PDF page 1, says that traffic separation schemes may be established by the **Bakanlık** (Ministry).
- Rule 10(a), PDF page 4, says the rule applies to traffic separation schemes adopted by the **Bakanlık**.

The corresponding IMO English COLREG wording refers to traffic separation schemes adopted by the **Organization** (the International Maritime Organization). The dataset preserves the PDF wording unchanged. Product copy or operational guidance must not present the PDF's “Bakanlık” wording as a verbatim rendering of the IMO English text without qualification.

Other national adaptation, amendment, translation, or typographical differences may exist. No line-by-line legal comparison against an authoritative IMO edition has been completed.

## Coverage status

Every clause in `content/clause-coverage.csv` is marked `extracted=true`. The `compared`, `visualized`, and `tested` columns remain `false`: the text has not received a clause-by-clause human comparison against the rendered PDF, visual placement review, or substantive maritime/legal validation. The automated test checks dataset structure, record count, page count, stable unique clause identifiers, source-text reconstruction, and raw-page presence; it does not change those review statuses.

To rebuild from the owner-supplied source:

```powershell
& 'C:\Users\tunce\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\extract_colreg.py 'C:\Users\tunce\Desktop\COLREG 72 SÖZLEŞMESİ GÜNCEL METNİ.pdf'
```
