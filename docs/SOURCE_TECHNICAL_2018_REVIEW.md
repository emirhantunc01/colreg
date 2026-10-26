# Technical content review against COLREG Consolidated Edition 2018

**Reviewer scope:** Rules 20–41 and Annexes I–IV, including learning metadata and the signals/technical lab. **Primary reference:** owner-supplied `COLREG-Consolidated-2018.pdf`, 62 pages. Physical PDF page numbers below are 1-based. This review identifies alignment to that supplied edition only; it does not certify official provenance, current law, or training suitability.

The field-only learning patches are in [`technical-2018.json`](../content/review/technical-2018.json): 26 record keys (Rules 20–41 and Annexes I–IV), with 129 authored fields. They do not alter raw clauses, extracted pages, scenario content, vessel display geometry, or signal timing. Follow-up integration fixes update lab wording and reference labels based on this review.

## Coverage

| Record | PDF pages | Review outcome |
|---|---:|---|
| Rule 20 | 17 | Covered. Clarified all-weathers application, sunset/sunrise, restricted-visibility daytime lights, day shapes and Annex I compliance. |
| Rule 21 | 17–18 | Covered. Checked colour, position, arc, combined sidelights below 20 m and flashing threshold (120/minute or more). |
| Rule 22 | 18–19 | Covered. Checked length bands and masthead exception under 20 m within the 12–under-50 m band; no range-table threshold error found in `lightRanges`. |
| Rule 23 | 19–20 | Covered. Checked standard lights, optional second masthead below 50 m, small-vessel alternatives, air-cushion and WIG cases. |
| Rule 24 | 20–22 | Covered. Checked tow >200 m threshold, push/composite/group cases, inconspicuous tows, assistance exception, and paragraph (d)'s reference to Rule 23(a)(ii). |
| Rule 25 | 22–23 | Covered. Checked under-20 m combined lantern, under-7 m and oar alternatives, optional red-over-green, and machinery cone. |
| Rule 26 | 23 | Covered. Checked trawling vs other fishing, 150 m gear trigger, masthead exception below 50 m, making-way lights, and Annex II referral. |
| Rule 27 | 24–25 | Covered. Checked NUC/RAM, making way/anchor additions, dredging sides, diving alternative, mine-clearance placement/danger range, under-12 m exception and distress disclaimer. |
| Rule 28 | 26 | Covered. Corrected the learning title/wording to the source's “draught”; three red lights or cylinder are optional and supplement Rule 23. |
| Rule 29 | 26 | Covered. Checked on-duty white-over-red and underway/anchor additions; off-duty display is for a similar vessel of its length. |
| Rule 30 | 26–27 | Covered. Checked anchor light/ball, under-50 m alternative, 100 m deck illumination, under-7 m anchor exception and under-12 m aground exception. |
| Rule 31 | 27 | Covered. Checked equivalence only where prescribed display is impracticable, including WIG craft. |
| Rule 32 | 28 | Covered. Short blast about 1 s; prolonged blast 4–6 s; whistle must satisfy Annex III. |
| Rule 33 | 28 | Covered. Checked 12/20/100 m whistle/bell/gong thresholds, manual sounding and under-12 m alternative. |
| Rule 34 | 28–30 | Covered. Checked manoeuvre/overtaking/agreement/doubt/bend signals, flash and gap timing, 10 s successive-signal spacing, and >100 m whistle separation. |
| Rule 35 | 30–32 | Covered. Checked signal classes and maximum intervals, anchor/aground sequence, 100 m gong, 12–under-20 m and under-12 m alternatives, fishing/RAM at-anchor substitution, and pilot identity signal. Existing lab patterns are synthetic timing illustrations; see findings. |
| Rule 36 | 32 | Covered. Checked non-confusing attention signals, searchlight direction and restriction on high-intensity intermittent/revolving lights. |
| Rule 37 | 32 | Covered. Checked distress-and-assistance condition and referral to Annex IV. |
| Rule 38 | 33–34 | Covered. Checked eligibility (1960 Rules compliance and construction-stage date) and specific permanent/four-year/nine-year exemptions; the rule is historical transition text. |
| Rule 39 | 35 | Covered. Checked Audit, Audit Scheme, Code for Implementation/III Code and Audit Standard definitions. |
| Rule 40 | 35 | Covered. Checked Contracting Parties' obligation to use the Code for Implementation. |
| Rule 41 | 35–36 | Covered. Checked periodic audits, Secretary-General administration, Party facilitation/actions, schedule and periodicity. |
| Annex I | 37–45 | Covered. Reviewed all sections, including the rendered §13(b) formula on p.45. Formula in `TechnicalReference.tsx` matches the visible source formula. |
| Annex II | 46 | Covered. Checked below-level reference, 0.9 m spacing, 1 NM all-round visibility at a lesser range than Rule 26 signals, trawler/pair-trawler length threshold, and alternating purse-seine lights. Corrected learning wording to cite Rule 26(b)(i)/(c)(i) precisely and distinguish required signals for ≥20 m trawlers/pair-trawlers from signals smaller vessels or purse seiners may display. |
| Annex III | 47–49 | Covered. Checked fundamental-frequency bands, audible-frequency bands, table dB/ranges, directional properties, whistle spacing, sound exposure, bell/gong requirements and approval. Rendered the table because extraction split its bottom row across pages. Exact 20/75/200 m boundaries are present in the table. |
| Annex IV | 52–53 active; 50–51 older duplicate | Covered against active pages 52–53 only. Checked updated DSC channels/frequencies, satellite-service wording, EPIRB and other signals, prohibition, and para.3 orange canvas/dye-marker distinction. Older pages 50–51 were not merged. |

## Concrete integration findings

1. **Annex III boundary claim corrected.** [`TechnicalReference.tsx`](../src/TechnicalReference.tsx) and [`TrainingLab.tsx`](../src/TrainingLab.tsx) now use the source boundaries `≥75–<200 m`, `≥20–<75 m`, and `≥200 m`. The shared rows also distinguish the §1(c) audibility table from §1(b) fundamental-frequency bands. Source: physical PDF pp.47–48.

2. **Annex IV paragraph distinction corrected.** [`trainingData.ts`](../src/trainingData.ts) and [`DistressSigns.tsx`](../src/DistressSigns.tsx) now group the 15 §1 distress signals separately from the two §3 additional signals. Copy states the §1 misuse restriction only for that §1 group. Source: active PDF pp.52–53.

3. **Source page labels now come from the compact catalog.** [`sourceCatalog.ts`](../src/sourceCatalog.ts) reads only the supplied source metadata and record page lists, and [`trainingData.ts`](../src/trainingData.ts)/the lab shelf derive their labels from it. This avoids embedding legacy PDF page numbers in runtime components. Source basis identifies the supplied consolidated English 2018 edition and avoids a claim of official provenance or legal currency.

4. **Keep lab timing/geometry clearly illustrative.** The project stores short/prolonged blast values as 1/5 seconds (inside source bounds), and uses synthetic time patterns for bell/gong and aground striking; this does not encode a certified acoustic signal or every physical strike interval. Annex II purse-seine simulation uses a 2 s period per light with the two lights phase-shifted by 1 s, visually giving alternating 1 s light/1 s dark as specified. These are project-authored presentation choices, not quoted source durations. Annex I vessel diagrams and mast heights are likewise explanatory geometry; the rule-level requirements include vessel-, installation- and condition-dependent details beyond the diagram.

5. **Source editorial notices are not extra learning duties.** Rules 23 and 31 pages 19 and 27 include parenthetical amendment/effective-date notices. The patches preserve the Rules' operative display requirements without turning those editorial notices into vessel-signal duties. Rule 39–41 are present in this source and were included in full coverage.

## Technical points checked against lab constants

- Light ranges in `trainingData.ts` use the Rule 22 cutoffs: ≥50 m, 12–under 50 m (with masthead 3 NM below 20 m), and under 12 m. The existing six length buttons straddle relevant 7/12/20/50/100 m thresholds; the basic range calculation agrees with the source.
- Rule 21 flashing threshold is at least 120 flashes/minute. The generic light animation defaults to 0.5 s period with equal on/off halves (120/minute); Annex II purse-seiner animation uses its separate alternating 1 s flashes.
- Rule 32 and the lab's 1 s short / 5 s prolonged constants agree with the source's approximate 1 s and 4–6 s durations. Rule 35 maximum repetition is 2 minutes, with anchor/aground bell sequences no more than 1 minute; the demo uses these maximum intervals.
- Annex III visible sound-pressure table values are 143 dB/2 NM at ≥200 m; 138 dB/1.5 NM at ≥75–under 200 m; 130 dB/1 NM at ≥20–under 75 m; and under 20 m, 120/115/111 dB at the listed measurement bands with 0.5 NM range. The UI now uses the same boundaries.
- Annex I §13(b)'s formula rendered on physical p.45 is `y = ((a + 17Ψ)C / 1000) + 2`. The existing technical reference formula and variable descriptions agree with the rendered source.

## Limits

This was a content/source comparison, not a legal opinion, official-source authentication, operational simulator validation, or certification. Raw source clauses and physical page citations should be regenerated by the extraction/integration owner from the active 2018 map. Scenario content, vessel display geometry and signal timing were not changed during the follow-up UI fixes.

