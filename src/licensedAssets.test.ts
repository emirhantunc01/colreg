import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { resolveVesselAsset } from './vesselAssets';

const directory = new URL('../public/models/licensed/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('asset-manifest.json', directory), 'utf8'));
const credits = JSON.parse(readFileSync(new URL('credits.json', directory), 'utf8'));

describe('shipped licensed vessel derivatives', () => {
  it('ships credited derivatives within the desktop and mobile transfer budgets', () => {
    for (const mobile of [false, true]) {
      const variant = mobile ? 'mobile' : 'desktop';
      let bytes = 0;
      for (const [model, authoredPath] of [
        ['cargo', 'models/atlas-container-ship.glb'],
        ['tanker', 'models/product-tanker.glb'],
      ]) {
        const entry = manifest.models[model][variant];
        const content = readFileSync(new URL(entry.file, directory));
        expect(resolveVesselAsset(authoredPath, mobile)).toBe(`models/licensed/${entry.file}`);
        expect(content.length).toBe(entry.bytes);
        expect(createHash('sha256').update(content).digest('hex')).toBe(entry.sha256);
        expect(credits.some((credit: { id: string }) => credit.id === `${model}-ship`)).toBe(true);
        bytes += content.length;
      }
      expect(bytes).toBeLessThanOrEqual(mobile ? 3_000_000 : 6_000_000);
    }
  });

  for (const model of ['cargo', 'tanker']) {
    for (const variant of ['desktop', 'mobile']) {
      it(`${model} ${variant} decodes with normalized world bounds and no independent motion`, async () => {
        await MeshoptDecoder.ready;
        const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
          .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
        const entry = manifest.models[model][variant];
        const bytes = readFileSync(new URL(entry.file, directory));
        const document = await io.readBinary(new Uint8Array(bytes));
        const scene = document.getRoot().getDefaultScene();
        expect(scene).not.toBeNull();
        const { min, max } = getBounds(scene!);
        expect(max[2] - min[2]).toBeCloseTo(1, 3);
        expect((min[0] + max[0]) / 2).toBeCloseTo(0, 3);
        expect((min[2] + max[2]) / 2).toBeCloseTo(0, 3);
        expect(min[1]).toBeLessThan(0);
        expect(max[1]).toBeGreaterThan(0);
        expect(document.getRoot().listAnimations()).toHaveLength(0);
        expect(document.getRoot().listMeshes().length).toBeGreaterThan(0);
        expect(entry.normalization.bowAxis).toBe('-Z');
      });
    }
  }
});
