import { describe, expect, it } from "vitest";
import { fitEncounterCamera, fitOverheadCamera } from "./encounterCamera";

const headOnPair = [
  { x: 0, z: 360, heading: 0, length: 90 },
  { x: 0, z: -360, heading: 180, length: 110 },
];

describe("fitEncounterCamera", () => {
  it.each([1280 / 720, 380 / 388])(
    "keeps both authored hull and deck bounds inside the frame at aspect %s",
    (aspect) => {
      const fit = fitEncounterCamera(headOnPair, aspect, 43, 1);
      const margin = 0.78;
      expect(fit.position.distanceTo(fit.target)).toBeGreaterThan(0);
      expect(fit.projectedBounds.minX).toBeGreaterThanOrEqual(-margin - 0.01);
      expect(fit.projectedBounds.maxX).toBeLessThanOrEqual(margin + 0.01);
      expect(fit.projectedBounds.minY).toBeGreaterThanOrEqual(-margin - 0.01);
      expect(fit.projectedBounds.maxY).toBeLessThanOrEqual(margin + 0.01);
      expect(fit.projectedBounds.minDepth).toBeGreaterThanOrEqual(-1);
      expect(fit.projectedBounds.maxDepth).toBeLessThanOrEqual(1);
      const ownLengthNdc = Math.max(
        fit.ownProjectedBounds.maxX - fit.ownProjectedBounds.minX,
        fit.ownProjectedBounds.maxY - fit.ownProjectedBounds.minY,
      );
      expect(ownLengthNdc).toBeGreaterThanOrEqual(0.12);
    },
  );

  it.each([1440 / 468, 380 / 388])(
    "fits every overhead hull and deck corner after resize at aspect %s",
    (aspect) => {
      const fit = fitOverheadCamera(headOnPair, aspect, 43, 1);
      expect(fit.position.y).toBeGreaterThan(fit.target.y);
      expect(fit.projectedBounds.minX).toBeGreaterThanOrEqual(-0.83);
      expect(fit.projectedBounds.maxX).toBeLessThanOrEqual(0.83);
      expect(fit.projectedBounds.minY).toBeGreaterThanOrEqual(-0.83);
      expect(fit.projectedBounds.maxY).toBeLessThanOrEqual(0.83);
      expect(fit.projectedBounds.minDepth).toBeGreaterThanOrEqual(-1);
      expect(fit.projectedBounds.maxDepth).toBeLessThanOrEqual(1);
    },
  );
});
