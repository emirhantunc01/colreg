"""Build the learning dataset from the supplied consolidated 2018 English COLREG PDF."""
from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.util
import json
import re
import shutil
from pathlib import Path
from typing import NamedTuple

from pypdf import PdfReader

EXPECTED_SHA256 = "c3d85b3b833ac39100d8bd7a767a77058e12f3e738e5b83ec89aa8d465fa6a5f"
EXPECTED_BYTES = 849076
EXPECTED_PAGES = 62
EXPECTED_IDS = [f"rule-{n}" for n in range(1, 42)] + [f"annex-{n}" for n in range(1, 5)]
HEADING = re.compile(r"^\s*(?:Rule\s+(\d+)(?:\s*\(Added\s+by\s+Res\.A\.1085\(28\)\))?|ANNEX\s+(I{1,3}|IV))\s*$", re.I)
CLAUSE = re.compile(r"^\s*(?:\([a-z]\)|\([ivxlcdm]+\)|\d+\.)\s*", re.I)
STRUCTURAL_HEADING = re.compile(r"^\s*(?:PART\s+[A-F]\b|SECTION\s+[IVXLC]+\s*[-–—])", re.I)
CIRCULAR_NOTE_START = re.compile(r"^\s*MSC\.1/Circ\.1260(?:/Rev\.1)?\s*[-–—]", re.I)
OVERRIDE_FIELDS = {"title", "summary", "conditions", "duties", "exceptions", "notes", "keywords", "related"}

spec = importlib.util.spec_from_file_location("legacy_extractor_metadata", Path(__file__).with_name("extract_colreg.py"))
legacy = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(legacy)

class Line(NamedTuple):
    text: str
    page: int

def _id(match: re.Match) -> str:
    if match.group(1):
        return f"rule-{int(match.group(1))}"
    annex_number = {"I": 1, "II": 2, "III": 3, "IV": 4}[match.group(2).upper()]
    return f"annex-{annex_number}"

def _parse(page_texts: list[str]) -> list[dict]:
    buckets: dict[str, list[Line]] = {}
    current = None
    for page, text in enumerate(page_texts, 1):
        if current == "annex-4" and page > 53:
            current = None
        skip_header_continuation = False
        for raw in text.splitlines():
            if skip_header_continuation:
                skip_header_continuation = False
                continue
            if STRUCTURAL_HEADING.match(raw):
                skip_header_continuation = bool(re.search(r"\b(?:OF|THE|IN|FOR|WITH|TO|AND)\s*$", raw, re.I))
                continue
            match = HEADING.fullmatch(raw)
            if match:
                rec_id = _id(match)
                # Skip the first, older Annex IV transcription (PDF pp. 50–51).
                if rec_id == "annex-4" and page < 52:
                    current = None
                    continue
                current = rec_id
                if current in buckets:
                    raise ValueError(f"Duplicate active heading {current} on PDF page {page}")
                buckets[current] = []
                continue
            if current:
                buckets[current].append(Line(raw.rstrip(), page))
    if set(buckets) != set(EXPECTED_IDS):
        raise ValueError(f"Missing/extra records: missing={sorted(set(EXPECTED_IDS)-set(buckets))}, extra={sorted(set(buckets)-set(EXPECTED_IDS))}")
    records = []
    for rec_id in EXPECTED_IDS:
        lines = buckets[rec_id]
        groups: list[list[Line]] = []
        current_group: list[Line] = []
        for line in lines:
            if CLAUSE.match(line.text) and current_group:
                groups.append(current_group); current_group = []
            current_group.append(line)
        if current_group: groups.append(current_group)
        typed_groups: list[tuple[list[Line], str]] = []
        for group in groups:
            note_start = next((i for i, line in enumerate(group) if CIRCULAR_NOTE_START.match(line.text)), None)
            if note_start is None:
                typed_groups.append((group, "source-text"))
            else:
                if note_start:
                    typed_groups.append((group[:note_start], "source-text"))
                typed_groups.append((group[note_start:], "document-note"))
        clauses = []
        for i, (group, kind) in enumerate(typed_groups, 1):
            text = "\n".join(x.text for x in group).strip()
            if text:
                clauses.append({"id": f"{rec_id}-clause-{i:02d}", "kind": kind, "text": text, "pages": sorted({x.page for x in group if x.text.strip()})})
        if not clauses:
            raise ValueError(f"Empty extraction for {rec_id}")
        title, summary, duty = legacy.META[rec_id]
        source_text = "\n\n".join(c["text"] for c in clauses)
        related_numbers = sorted({int(x) for x in re.findall(r"\bRule\s+(\d+)\b", source_text, re.I)})
        related = [f"rule-{n}" for n in related_numbers if f"rule-{n}" != rec_id and n <= 41]
        related = list(dict.fromkeys(related + legacy.RELATED.get(rec_id, [])))
        number = int(rec_id.split("-")[1]); is_annex = rec_id.startswith("annex-")
        exceptions = [item for item in legacy.EXCEPTIONS.get(rec_id, []) if not re.search(r"Ministry|Bakanlık|Turkish|Turkey", item, re.I)]
        records.append({"id": rec_id, "number": number, "title": title, "part": legacy.PARTS[rec_id], "summary": summary,
            "conditions": legacy.CONDITIONS[rec_id], "duties": [duty], "exceptions": exceptions,
            "related": related, "keywords": sorted({w.lower().strip("(),") for w in title.split() if len(w)>3}) + (["annex"] if is_annex else ["rule"]),
            "pages": sorted({p for c in clauses for p in c["pages"]}), "clauses": clauses, "sourceText": source_text,
            "notes": (["Consolidated 2018 English edition supplied by the owner; official provenance and currency have not been independently verified."] + (["The PDF contains an earlier Annex IV transcription on pages 50–51; this record uses only the canonical later transcription on pages 52–53."] if rec_id == "annex-4" else []))})
    return records

def build(source: Path, root: Path, overrides: Path | None = None) -> None:
    source = source.resolve(); data = source.read_bytes(); digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_SHA256 or len(data) != EXPECTED_BYTES:
        raise ValueError(f"Unexpected source file: sha256={digest}, bytes={len(data)}")
    reader = PdfReader(str(source)); pages = [page.extract_text() or "" for page in reader.pages]
    if len(pages) != EXPECTED_PAGES: raise ValueError(f"Expected {EXPECTED_PAGES} pages, got {len(pages)}")
    records = _parse(pages)
    if overrides and overrides.exists():
        patch = json.loads(overrides.read_text(encoding="utf-8"))
        if not isinstance(patch, dict):
            raise ValueError("Overrides must be a mapping of record IDs to field mappings")
        unknown_ids = set(patch) - set(EXPECTED_IDS)
        if unknown_ids:
            raise ValueError(f"Unknown override record IDs: {sorted(unknown_ids)}")
        records_by_id = {record["id"]: record for record in records}
        for rec_id, fields in patch.items():
            if not isinstance(fields, dict):
                raise ValueError(f"Override for {rec_id} must be a field mapping")
            unknown_fields = set(fields) - OVERRIDE_FIELDS
            if unknown_fields:
                raise ValueError(f"Unknown/unsupported override fields for {rec_id}: {sorted(unknown_fields)}")
            records_by_id[rec_id].update(fields)
    pub = root / "public/content"; content = root / "content"
    pub.mkdir(parents=True, exist_ok=True); content.mkdir(parents=True, exist_ok=True)
    target_pdf = pub / "colreg-source.pdf"
    if source != target_pdf.resolve():
        shutil.copyfile(source, target_pdf)
    payload = {"source": {"title": "Convention on the International Regulations for Preventing Collisions at Sea, 1972 — Consolidated edition, 2018", "file": "content/colreg-source.pdf", "sha256": digest, "pages": len(pages), "language": "en", "edition": "2018", "originalFilename": "COLREG-Consolidated-2018.pdf", "pageImageDirectory": "content/pages", "notes": ["Owner-supplied consolidated 2018 edition; official provenance and currency have not been independently verified.", "The PDF text layer may omit or distort diagrams, formula layout, and some technical table structure; consult rendered page images where needed.", "Two Annex IV transcriptions appear; pages 52–53 are used as canonical. Convention Articles and supplementary watchkeeping material are indexed separately from rule records."], "supplemental": [{"id":"convention-articles","title":"Convention Articles I–IX","pages":[1,2,3,4],"note":"Convention text appearing on PDF pages 1–4."},{"id":"superseded-annex-4","title":"Earlier Annex IV transcription","pages":[50,51],"note":"Earlier Annex IV version; the later transcription on pages 52–53 is used as the active distress reference."},{"id":"watchkeeping","title":"Supplementary watchkeeping recommendations","pages":list(range(54,63)),"note":"Supplementary recommendations following the Rules and Annexes."}]}, "records": records}
    (pub / "rules.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    catalog = {"source": {key: payload["source"][key] for key in ("title", "file", "sha256", "pages", "language", "edition")},
               "records": [{"id": record["id"], "pages": record["pages"]} for record in records]}
    (content / "reference-catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    raw = [{"page": i, "text": text} for i, text in enumerate(pages, 1)]
    (content / "raw-pages.json").write_text(json.dumps(raw, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    (content / "raw-pages.txt").write_text("\n".join(f"===== PDF PAGE {p['page']} =====\n{p['text'].rstrip()}\n" for p in raw), encoding="utf-8")
    with (content / "clause-coverage.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f); writer.writerow(["record_id","clause_id","pages","characters","extracted","compared","visualized","tested"])
        for record in records:
            for clause in record["clauses"]: writer.writerow([record["id"], clause["id"], "|".join(map(str, clause["pages"])), len(clause["text"]), "true", "false", "false", "false"])

def main():
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument("source",type=Path); ap.add_argument("--output-root",type=Path,default=Path(__file__).resolve().parents[1]); ap.add_argument("--overrides",type=Path)
    args=ap.parse_args(); build(args.source,args.output_root.resolve(),args.overrides)
if __name__ == "__main__": main()
