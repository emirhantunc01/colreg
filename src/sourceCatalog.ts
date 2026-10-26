import catalogJson from "../content/reference-catalog.json";

export type CatalogRecord = { id: string; pages: number[] };
export type SourceCatalog = {
  source: { title: string; file: string; sha256: string; pages: number; language?: string; edition?: string };
  records: CatalogRecord[];
};

export const sourceCatalog = catalogJson as SourceCatalog;

export function catalogPages(catalog: SourceCatalog, ids: string[]) {
  const records = new Map(catalog.records.map(record => [record.id, record]));
  return [...new Set(ids.flatMap(id => {
    const record = records.get(id);
    if (!record) throw new Error(`Source catalog is missing ${id}`);
    return record.pages;
  }))].sort((a, b) => a - b);
}

export function formatPdfPages(pages: number[]) {
  if (pages.length === 0) return "PDF pages unavailable";
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0], end = start;
  for (const page of sorted.slice(1)) {
    if (page === end + 1) end = page;
    else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`);
      start = end = page;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return `PDF ${sorted.length === 1 ? "p." : "pp."} ${ranges.join(", ")}`;
}

export function sourceReference(title: string, ids: string[]) {
  return `${title} · ${formatPdfPages(catalogPages(sourceCatalog, ids))}`;
}

const editionLabel = sourceCatalog.source.edition
  ? `${sourceCatalog.source.edition} consolidated ${sourceCatalog.source.language === "en" ? "English" : ""} edition`.replace(/\s+edition$/, " edition")
  : sourceCatalog.source.title;

export const SOURCE_EDITION_NOTE = `Source basis: supplied ${editionLabel}. Educational reconstruction; no claim of official provenance or current legal status.`;

