import csv
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from pypdf import PdfReader


SCRIPT = Path(__file__).with_name("extract_colreg.py")


def load_module():
    spec = importlib.util.spec_from_file_location("extract_colreg", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class ExtractColregTests(unittest.TestCase):
    def test_generated_dataset_is_complete_and_reconstructable(self):
        module = load_module()
        # This is an archival regression test for the former 25-page Turkish
        # source. Never point it at the active 2018 PDF.
        source = SCRIPT.parent.parent / "content/sources/legacy-turkish-2026-10-26/colreg-source.pdf"
        if not source.is_file():
            self.skipTest("Archived legacy Turkish PDF is not available")
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as directory:
            output = Path(directory)
            module.build(source, output)
            payload = json.loads((output / "public/content/rules.json").read_text(encoding="utf-8"))

            self.assertEqual(payload["source"]["pages"], 25)
            self.assertEqual(payload["source"]["file"], "content/colreg-source.pdf")
            self.assertEqual(len(payload["records"]), 45)
            self.assertEqual(
                [record["id"] for record in payload["records"]],
                [f"rule-{number}" for number in range(1, 42)]
                + [f"annex-{number}" for number in range(1, 5)],
            )

            clause_ids = []
            for record in payload["records"]:
                self.assertTrue(record["clauses"], record["id"])
                self.assertTrue(record["pages"], record["id"])
                self.assertEqual(
                    record["sourceText"],
                    "\n\n".join(clause["text"] for clause in record["clauses"]),
                    record["id"],
                )
                self.assertNotRegex(record["sourceText"], r"(?m)^BÖLÜM\s")
                self.assertNotRegex(record["sourceText"], r"(?m)^KISIM\s")
                self.assertNotIn("circumstances covered by", " ".join(record["conditions"]).lower())
                self.assertNotIn("consult the preserved source", " ".join(record["exceptions"]).lower())
                self.assertIn(record["part"], {"A", "B", "C", "D", "E", "F", "Annexes"})
                clause_ids.extend(clause["id"] for clause in record["clauses"])
            self.assertTrue(next(r for r in payload["records"] if r["id"] == "rule-1")["notes"])
            self.assertTrue(next(r for r in payload["records"] if r["id"] == "rule-10")["notes"])
            self.assertEqual(len(clause_ids), len(set(clause_ids)))

            pages = json.loads((output / "content/raw-pages.json").read_text(encoding="utf-8"))
            self.assertEqual([page["page"] for page in pages], list(range(1, 26)))
            self.assertTrue(all(page["text"].strip() for page in pages))
            self.assertEqual([page["text"] for page in pages], [page.extract_text() or "" for page in PdfReader(source).pages])

            copied = output / "public/content/colreg-source.pdf"
            self.assertEqual(hashlib.sha256(source.read_bytes()).digest(), hashlib.sha256(copied.read_bytes()).digest())

            with (output / "content/clause-coverage.csv").open(encoding="utf-8") as handle:
                coverage = list(csv.DictReader(handle))
            self.assertEqual(len(coverage), len(clause_ids))
            self.assertTrue(all(row["extracted"] == "true" for row in coverage))
            self.assertTrue(all(row["compared"] == row["visualized"] == row["tested"] == "false" for row in coverage))

            annex_1 = next(record for record in payload["records"] if record["id"] == "annex-1")
            annex_3 = next(record for record in payload["records"] if record["id"] == "annex-3")
            self.assertIn("I = 3.43 x 106 x T x D2 x K-D", annex_1["sourceText"])
            self.assertIn("200 veya daha büyük", annex_3["sourceText"])


if __name__ == "__main__":
    unittest.main()
