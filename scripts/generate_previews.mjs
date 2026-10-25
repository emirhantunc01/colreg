import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { projectPreview } from "../src/preview.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scenarioDir = path.join(root, "public", "scenarios");
const indexPath = path.join(scenarioDir, "index.json");
const index = JSON.parse(await readFile(indexPath, "utf8"));
const updated = [];

for (const entry of index) {
  const scenario = JSON.parse(await readFile(path.join(scenarioDir, entry.file), "utf8"));
  const source = {
    ...scenario,
    environment: scenario.environment ?? { kind: "open", visibility: "clear" },
    conditions: scenario.conditions ?? [],
    steps: scenario.steps ?? [],
  };
  updated.push({ ...entry, preview: projectPreview(source) });
}

await writeFile(indexPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
console.log(`Generated previews for ${updated.length} scenarios.`);
