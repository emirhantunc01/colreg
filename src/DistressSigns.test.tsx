import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import DistressSigns from "./DistressSigns";
import {DISTRESS_ATTENTION_SIGNALS, DISTRESS_SIGNALS} from "./trainingData";

describe("Annex IV distress signal groups",()=>{
  it("keeps the fifteen paragraph 1 distress signals separate from the two paragraph 3 attention items",()=>{
    expect(DISTRESS_SIGNALS).toHaveLength(15);
    expect(DISTRESS_ATTENTION_SIGNALS).toHaveLength(2);
    const markup=renderToStaticMarkup(<DistressSigns/>);
    expect(markup).toContain("Annex IV §1 · Distress signals");
    expect(markup).toContain("Annex IV §3 · Additional signals");
    expect(markup).toContain("Annex IV §2 prohibits using §1 signals except to indicate distress and need of assistance");
    expect(markup).toContain("prohibits other signals that may be confused with them");
    expect(markup).not.toContain("These signs indicate distress and need of assistance; use for other purposes is prohibited.");
  });
});
