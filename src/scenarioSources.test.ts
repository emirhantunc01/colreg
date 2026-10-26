import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {catalogPages,formatPdfPages} from './sourceCatalog';

type RuleRecord = { id: string; pages: number[] };
type ReferenceData = {
  source: { title: string; file: string; sha256: string; pages: number };
  records: RuleRecord[];
};
type Scenario = {
  id: string;
  ruleIds: string[];
  sources: { title: string; pages: string; rule: string }[];
};

const root = path.resolve(import.meta.dirname, "..");
const scenariosDirectory = path.join(root, "public", "scenarios");
const reference = JSON.parse(
  readFileSync(path.join(root, "public", "content", "rules.json"), "utf8"),
) as ReferenceData;
function expectedPages(ruleIds: string[]) {
  return formatPdfPages(catalogPages(reference,ruleIds));
}

describe("educational encounter citations", () => {
  it("match the active reference title and physical page union for every sourced scenario", () => {
    const scenarios = readdirSync(scenariosDirectory)
      .filter((file) => file.endsWith(".json") && file !== "index.json")
      .map((file) =>
        JSON.parse(readFileSync(path.join(scenariosDirectory, file), "utf8")) as Scenario,
      )
      .filter((scenario) => scenario.sources?.length > 0);

    expect(scenarios).toHaveLength(36);
    for (const scenario of scenarios) {
      expect(scenario.sources, scenario.id).toEqual([
        {
          title: reference.source.title,
          pages: expectedPages(scenario.ruleIds),
          rule: scenario.ruleIds.map((id) => `Rule ${id.slice("rule-".length)}`).join(", "),
        },
      ]);
    }

    const index = JSON.parse(
      readFileSync(path.join(scenariosDirectory, "index.json"), "utf8"),
    ) as { id: string; ruleIds?: string[] }[];
    expect(index.filter((entry) => !entry.ruleIds).map((entry) => entry.id).sort()).toEqual([
      "course-change",
      "steady-tracks",
    ]);
  });
});
