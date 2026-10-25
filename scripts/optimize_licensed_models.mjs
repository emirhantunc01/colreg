import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import {
  dedup,
  flatten,
  getBounds,
  join,
  meshopt,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "assets", "source-models", "prepared");
const outputDir = path.join(root, "public", "models", "licensed");
const models = ["cargo", "tanker"];

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
await mkdir(outputDir, { recursive: true });

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function triangleCount(document) {
  let count = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      if (primitive.getMode() !== 4) continue;
      const indices = primitive.getIndices();
      count += (indices?.getCount() ?? primitive.getAttribute("POSITION")?.getCount() ?? 0) / 3;
    }
  }
  return Math.round(count);
}

function normalizedWorldBounds(document, label) {
  const scene = document.getRoot().getDefaultScene();
  if (!scene) throw new Error(`${label}: expected a default scene.`);
  const { min, max } = getBounds(scene);
  const bounds = { min: [...min], max: [...max] };
  const lengthZ = max[2] - min[2];
  const centerX = (min[0] + max[0]) / 2;
  const centerZ = (min[2] + max[2]) / 2;
  if (Math.abs(lengthZ - 1) > 0.002) {
    throw new Error(`${label}: normalized Z length is ${lengthZ}, expected 1 ± 0.002.`);
  }
  if (Math.abs(centerX) > 0.002 || Math.abs(centerZ) > 0.002) {
    throw new Error(`${label}: expected a centered X/Z hull; center was (${centerX}, ${centerZ}).`);
  }
  if (min[1] > 0.002 || max[1] < -0.002) {
    throw new Error(`${label}: waterline Y=0 is outside world bounds [${min[1]}, ${max[1]}].`);
  }
  return { bounds, lengthZ, centerX, centerZ };
}

async function build(model, variant) {
  const inputPath = path.join(sourceDir, `${model}.normalized.glb`);
  const outputName = `${model === "cargo" ? "cargo-ship" : "tanker-ship"}.${variant}.glb`;
  const outputPath = path.join(outputDir, outputName);
  const sourceBytes = await readFile(inputPath);
  const document = await io.read(inputPath);
  if (document.getRoot().listAnimations().length > 0) {
    throw new Error(`${inputPath}: expected no source animations.`);
  }
  const sourceWorld = normalizedWorldBounds(document, `${model} source`);

  const transforms = [dedup(), flatten(), join(), weld()];
  if (variant === "mobile") {
    transforms.push(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: model === "cargo" ? 0.85 : 0.9,
        error: 0.0015,
        lockBorder: true,
      }),
    );
  }
  transforms.push(
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: variant === "mobile" ? [1024, 1024] : [2048, 2048],
      quality: variant === "mobile" ? 37 : 82,
      effort: 6,
    }),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );

  await document.transform(...transforms);
  const outputWorld = normalizedWorldBounds(document, `${model} ${variant}`);
  const maxBoundsShift = Math.max(
    ...sourceWorld.bounds.min.map((value, axis) => Math.abs(value - outputWorld.bounds.min[axis])),
    ...sourceWorld.bounds.max.map((value, axis) => Math.abs(value - outputWorld.bounds.max[axis])),
  );
  if (variant === "mobile" && maxBoundsShift > 0.002) {
    console.warn(`${model} mobile simplification changed a world bound by ${maxBoundsShift.toFixed(6)} normalized lengths.`);
  }
  const outputTriangles = triangleCount(document);
  await io.write(outputPath, document);
  const outputBytes = await readFile(outputPath);
  return {
    file: outputName,
    source: path.relative(root, inputPath).replaceAll(path.sep, "/"),
    sourceBytes: sourceBytes.byteLength,
    sourceSha256: sha256(sourceBytes),
    bytes: outputBytes.byteLength,
    sha256: sha256(outputBytes),
    triangles: outputTriangles,
    worldBounds: outputWorld.bounds,
    maxWorldBoundsShiftFromNormalizedSource: maxBoundsShift,
    normalization: {
      upAxis: "+Y",
      bowAxis: "-Z",
      lengthMeters: 1,
      waterlineY: 0,
    },
  };
}

const variants = {};
for (const model of models) {
  variants[model] = {};
  for (const variant of ["desktop", "mobile"]) {
    variants[model][variant] = await build(model, variant);
  }
}

const desktopBytes = variants.cargo.desktop.bytes + variants.tanker.desktop.bytes;
const mobileBytes = variants.cargo.mobile.bytes + variants.tanker.mobile.bytes;
const manifest = {
  schemaVersion: 1,
  generatedBy: "scripts/optimize_licensed_models.mjs",
  runtime: {
    three: "0.180.x",
    compression: "EXT_meshopt_compression",
    textureFormat: "EXT_texture_webp",
  },
  optimization: {
    desktop: { maxTextureDimension: 2048, webpQuality: 82, simplifiesGeometry: false },
    mobile: {
      maxTextureDimension: 1024,
      webpQuality: 37,
      simplificationRatio: { cargo: 0.85, tanker: 0.9 },
      simplificationError: 0.0015,
    },
  },
  normalization: {
    upAxis: "+Y",
    bowAxis: "-Z",
    lengthMeters: 1,
    waterlineY: 0,
  },
  modelNotes: {
    cargo: {
      waterlinePlacement: "6.34 raw source units above the keel; illustrative visual placement, not a certified draught.",
    },
    tanker: {
      waterlinePlacement: "Source waterline at Z=0; normalized to Three.js Y=0.",
    },
  },
  budgets: {
    desktopPairBytes: desktopBytes,
    desktopPairBudgetBytes: 6 * 1000 * 1000,
    mobilePairBytes: mobileBytes,
    mobilePairBudgetBytes: 3 * 1000 * 1000,
    desktopWithinBudget: desktopBytes <= 6 * 1000 * 1000,
    mobileWithinBudget: mobileBytes <= 3 * 1000 * 1000,
  },
  models: variants,
};
await writeFile(path.join(outputDir, "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
if (!manifest.budgets.desktopWithinBudget || !manifest.budgets.mobileWithinBudget) {
  throw new Error("Optimized model pair exceeds its configured byte budget.");
}
