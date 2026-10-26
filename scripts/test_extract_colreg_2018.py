import csv
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("extract_colreg_2018.py")
SOURCE = SCRIPT.parent.parent / "public/content/colreg-source.pdf"

def load_module():
    spec = importlib.util.spec_from_file_location("extract_colreg_2018", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module

class Extract2018Tests(unittest.TestCase):
    def test_pdf_dataset_boundaries_reconstruction_and_checksum(self):
        module = load_module()
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temp:
            root = Path(temp)
            module.build(SOURCE, root)
            payload = json.loads((root / "public/content/rules.json").read_text(encoding="utf-8"))
            catalog = json.loads((root / "content/reference-catalog.json").read_text(encoding="utf-8"))
            records = payload["records"]
            self.assertEqual(len(records), 45)
            self.assertEqual([r["id"] for r in records], module.EXPECTED_IDS)
            self.assertEqual(payload["source"]["language"], "en")
            self.assertEqual(payload["source"]["edition"], "2018")
            self.assertEqual(payload["source"]["originalFilename"], "COLREG-Consolidated-2018.pdf")
            self.assertEqual(catalog["source"], {key: payload["source"][key] for key in ("title", "file", "sha256", "pages", "language", "edition")})
            self.assertEqual(catalog["records"], [{"id": r["id"], "pages": r["pages"]} for r in records])
            self.assertEqual(payload["source"]["supplemental"][0]["title"], "Convention Articles I–IX")
            self.assertEqual(payload["source"]["supplemental"][1]["pages"], [50, 51])
            self.assertEqual(payload["source"]["supplemental"][2]["pages"], list(range(54, 63)))
            for r in records:
                self.assertEqual(r["sourceText"], "\n\n".join(c["text"] for c in r["clauses"]), r["id"])
                self.assertTrue(r["clauses"])
                self.assertTrue(all(1 <= p <= 62 for p in r["pages"]))
                self.assertTrue(all(all(1 <= p <= 62 for p in c["pages"]) for c in r["clauses"]))
            annex4 = next(r for r in records if r["id"] == "annex-4")
            self.assertEqual(annex4["pages"], [52, 53])
            self.assertNotIn("50", annex4["sourceText"])
            self.assertIn("Rule 27(b)(i)", next(r for r in records if r["id"] == "rule-27")["sourceText"])
            self.assertFalse(any("section-" in r["id"] for r in records))
            self.assertTrue(any("Annex I, section 3(b)" in r["sourceText"] for r in records))
            self.assertTrue(any("Annex I, section 9(b)" in r["sourceText"] for r in records))
            by_id = {r["id"]: r for r in records}
            for rec_id, expected_pages in {"rule-3": [6, 7], "rule-18": [15], "rule-19": [16], "rule-31": [27], "rule-38": [33, 34]}.items():
                self.assertEqual(by_id[rec_id]["pages"], expected_pages, rec_id)
            for r in records:
                self.assertNotRegex(r["sourceText"], r"(?im)^\s*(?:PART\s+[A-F]\b|SECTION\s+[IVXLC]+\s*[-–—])")
            self.assertEqual(len({c["id"] for r in records for c in r["clauses"]}), sum(len(r["clauses"]) for r in records))
            self.assertTrue(all(c.get("kind", "source-text") in {"source-text", "document-note"} for r in records for c in r["clauses"]))
            for record in records:
                self.assertEqual(record["sourceText"], "\n\n".join(c["text"] for c in record["clauses"]))
            rule27 = by_id["rule-27"]
            rule27_note = next(c for c in rule27["clauses"] if c["kind"] == "document-note")
            self.assertIn("MSC.1/Circ.1260", rule27_note["text"])
            self.assertNotIn("MSC.1/Circ.1260", "\n".join(c["text"] for c in rule27["clauses"] if c["kind"] == "source-text"))
            for page, marker in [(39, "Annex I, section 3(b)"), (43, "Annex I, section 9(b)")]:
                note = next(c for r in records for c in r["clauses"] if page in c["pages"] and c["kind"] == "document-note")
                self.assertIn(marker, note["text"])
                self.assertNotIn(marker, "\n".join(c["text"] for r in records for c in r["clauses"] if page in c["pages"] and c["kind"] == "source-text"))
            rule1 = by_id["rule-1"]
            self.assertTrue(any("MSC/Circ.1144" in c["text"] and c["kind"] == "source-text" for c in rule1["clauses"]))
            copied = root / "public/content/colreg-source.pdf"
            self.assertEqual(hashlib.sha256(SOURCE.read_bytes()).hexdigest(), hashlib.sha256(copied.read_bytes()).hexdigest())
            pages = json.loads((root / "content/raw-pages.json").read_text(encoding="utf-8"))
            self.assertEqual(len(pages), 62)
            self.assertEqual([x["page"] for x in pages], list(range(1, 63)))
            with (root / "content/clause-coverage.csv").open(encoding="utf-8") as f:
                coverage = list(csv.DictReader(f))
            self.assertTrue(all(x["extracted"] == "true" and x["compared"] == x["visualized"] == x["tested"] == "false" for x in coverage))

    def test_overrides_apply_after_base_fields_and_cannot_rewrite_extraction(self):
        module = load_module()
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temp:
            root = Path(temp); overrides = root / "overrides.json"
            overrides.write_text(json.dumps({"rule-1": {"summary": "Reviewed wording", "notes": ["Audit note"]}}), encoding="utf-8")
            module.build(SOURCE, root / "out", overrides)
            p = json.loads((root / "out/public/content/rules.json").read_text(encoding="utf-8"))
            self.assertEqual(p["records"][0]["summary"], "Reviewed wording")
            self.assertEqual(p["records"][0]["notes"], ["Audit note"])
            overrides.write_text(json.dumps({"rule-1": {"sourceText": "corrupt"}}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Unknown/unsupported override fields"):
                module.build(SOURCE, root / "bad", overrides)
            overrides.write_text(json.dumps({"rule-999": {"summary": "bad"}}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Unknown override record IDs"):
                module.build(SOURCE, root / "bad-id", overrides)
            overrides.write_text(json.dumps({"rule-1": {"summmary": "typo"}}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Unknown/unsupported override fields"):
                module.build(SOURCE, root / "bad-field", overrides)

    def test_source_can_already_be_at_output_destination(self):
        module = load_module()
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temp:
            root = Path(temp)
            target = root / "public/content/colreg-source.pdf"
            target.parent.mkdir(parents=True)
            target.write_bytes(SOURCE.read_bytes())
            module.build(target, root)
            self.assertTrue((root / "public/content/rules.json").is_file())

    def test_unknown_pdf_checksum_is_rejected(self):
        module = load_module()
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as temp:
            bad = Path(temp) / "wrong.pdf"; bad.write_bytes(SOURCE.read_bytes() + b"x")
            with self.assertRaisesRegex(ValueError, "Unexpected source file"):
                module.build(bad, Path(temp) / "out")

if __name__ == "__main__":
    unittest.main()
