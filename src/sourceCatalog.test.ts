import {describe, expect, it} from "vitest";
import {catalogPages, formatPdfPages, SOURCE_EDITION_NOTE, sourceCatalog} from "./sourceCatalog";

describe("compact source catalog citations",()=>{
  it("builds the 2018 technical ranges without loading full rule clauses",()=>{
    expect(formatPdfPages(catalogPages(sourceCatalog,["rule-20","rule-21","rule-22","rule-23","rule-24","rule-25","rule-26","rule-27","rule-28","rule-29","rule-30","rule-31"]))).toBe("PDF pp. 17–27");
    expect(formatPdfPages(catalogPages(sourceCatalog,["annex-4"]))).toBe("PDF pp. 52–53");
  });

  it("keeps non-contiguous page ranges separate",()=>{
    expect(formatPdfPages([3,4,7,9,10])).toBe("PDF pp. 3–4, 7, 9–10");
  });

  it("labels the edition as the supplied reference without asserting currency or official provenance",()=>{
    expect(sourceCatalog.source.edition).toBe("2018");
    expect(SOURCE_EDITION_NOTE).toContain("2018 consolidated English edition");
    expect(SOURCE_EDITION_NOTE).toContain("no claim of official provenance or current legal status");
  });
});
