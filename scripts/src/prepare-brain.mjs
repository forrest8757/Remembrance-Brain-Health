import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { Accessor, Document, getBounds, NodeIO } from "@gltf-transform/core";
import { KHRMeshQuantization } from "@gltf-transform/extensions";
import { dedup, prune, quantize, simplify, weld } from "@gltf-transform/functions";
import sharp from "sharp";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MeshoptSimplifier } from "meshoptimizer";
import { brainZoneColor } from "../../artifacts/remembrance/src/lib/brain-palette.ts";

const SOURCE_DIR = path.resolve(process.env.BRAIN_SOURCE_DIR ?? "/tmp/brain-source");
const OBJ_PATH = path.resolve(process.env.BRAIN_OBJ_PATH ?? path.join(SOURCE_DIR, "base.obj"));
// Default to the shared pastel learning zones; neutral and source textures stay opt-in.
const USE_TEXTURES = process.env.BRAIN_USE_TEXTURES === "true";
const USE_ZONES = !USE_TEXTURES && process.env.BRAIN_COLOR_MODE !== "neutral";
const OUTPUT_PATH = path.resolve(
  process.env.BRAIN_OUTPUT_PATH ??
    path.resolve(process.cwd(), "../artifacts/remembrance/public/models/brain.glb"),
);

// The OBJ is intentionally kept outside the repository. This script only reads it and writes the
// optimized, self-contained GLB. A 1024px atlas is sufficient for the 2-unit normalized model and
// keeps the model comfortably under the requested size budget.
const TEXTURE_SIZE = 1024;
const SIMPLIFY_RATIO = 0.18;
const SIMPLIFY_ERROR = 0.01;

const REQUIRED_FILES = [
  OBJ_PATH,
  ...(USE_TEXTURES
    ? ["texture_diffuse.png", "texture_normal.png", "texture_roughness.png"].map(
        (name) => path.join(SOURCE_DIR, name),
      )
    : []),
];

const fail = (message) => {
  throw new Error(`[prepare-brain] ${message}`);
};

async function assertSourceFiles() {
  for (const filePath of REQUIRED_FILES) {
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      fail(`missing source file: ${filePath}`);
    }
    if (!stat.isFile()) fail(`source path is not a regular file: ${filePath}`);
  }
}

function mergeObjGeometry(meshes) {
  const attributes = ["position", "normal", "uv"];
  const arrays = Object.fromEntries(attributes.map((name) => [name, []]));
  let vertexCount = 0;

  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    if (!position || !normal || !uv) {
      fail("OBJLoader did not produce position, normal, and UV attributes for every mesh");
    }
    if (position.count !== normal.count || position.count !== uv.count) {
      fail("OBJLoader produced mismatched position, normal, and UV counts");
    }
    for (const name of attributes) arrays[name].push(geometry.getAttribute(name).array);
    vertexCount += position.count;
  }

  const merged = {};
  for (const name of attributes) {
    const sourceArrays = arrays[name];
    const ArrayType = sourceArrays[0].constructor;
    const length = sourceArrays.reduce((total, array) => total + array.length, 0);
    const result = new ArrayType(length);
    let offset = 0;
    for (const array of sourceArrays) {
      result.set(array, offset);
      offset += array.length;
    }
    merged[name] = result;
  }

  return { ...merged, vertexCount };
}

function normalizePositions(sourcePositions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < sourcePositions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], sourcePositions[i + axis]);
      max[axis] = Math.max(max[axis], sourcePositions[i + axis]);
    }
  }

  const dimensions = max.map((value, axis) => value - min[axis]);
  const sourceMaxDimension = Math.max(...dimensions);
  if (!Number.isFinite(sourceMaxDimension) || sourceMaxDimension <= 0) {
    fail("OBJ has no usable position bounds");
  }

  const center = min.map((value, axis) => (value + max[axis]) / 2);
  const scale = 2 / sourceMaxDimension;
  const positions = new Float32Array(sourcePositions.length);
  for (let i = 0; i < sourcePositions.length; i += 3) {
    positions[i] = (sourcePositions[i] - center[0]) * scale;
    positions[i + 1] = (sourcePositions[i + 1] - center[1]) * scale;
    positions[i + 2] = (sourcePositions[i + 2] - center[2]) * scale;
  }

  return {
    positions,
    sourceBounds: { min, max },
    sourceDimensions: dimensions,
    sourceMaxDimension,
    center,
    scale,
  };
}

async function resizeDiffuse(filePath) {
  return sharp(filePath)
    .resize(TEXTURE_SIZE, TEXTURE_SIZE, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

async function resizeNormal(filePath) {
  return sharp(filePath)
    .resize(TEXTURE_SIZE, TEXTURE_SIZE, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function createMetalRoughness(filePath) {
  const { data, info } = await sharp(filePath)
    .resize(TEXTURE_SIZE, TEXTURE_SIZE, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // glTF stores metallic-roughness as B=metallic and G=roughness. The source metallic map is
  // nearly black and the requested material is explicitly non-metallic, so use a black metallic
  // channel and preserve the source roughness atlas in green. Red is set to white (AO-neutral).
  const packed = Buffer.alloc(data.length * 3);
  for (let i = 0; i < data.length; i++) {
    packed[i * 3] = 255;
    packed[i * 3 + 1] = data[i];
    packed[i * 3 + 2] = 0;
  }

  return sharp(packed, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
    .toBuffer();
}

function makeAccessor(document, buffer, name, array, type) {
  return document
    .createAccessor(name, buffer)
    .setArray(array)
    .setType(type);
}

async function main() {
  await assertSourceFiles();

  const objPath = OBJ_PATH;
  const objText = await fs.readFile(objPath, "utf8");
  const loaded = new OBJLoader().parse(objText);
  const meshes = loaded.children.filter(
    (child) => child.isMesh && child.geometry?.getAttribute("position"),
  );
  if (meshes.length === 0) fail("OBJLoader did not find any renderable mesh");

  const source = mergeObjGeometry(meshes);
  if (source.vertexCount % 3 !== 0) fail("OBJLoader output is not a triangle list");
  const normalized = normalizePositions(source.position);

  const document = new Document();
  const buffer = document.createBuffer("brain geometry");
  const position = makeAccessor(
    document,
    buffer,
    "POSITION",
    normalized.positions,
    Accessor.Type.VEC3,
  );
  const normal = makeAccessor(document, buffer, "NORMAL", source.normal, Accessor.Type.VEC3);
  const uv = makeAccessor(document, buffer, "TEXCOORD_0", source.uv, Accessor.Type.VEC2);

  const diffuseBytes = USE_TEXTURES ? await resizeDiffuse(path.join(SOURCE_DIR, "texture_diffuse.png")) : null;
  const normalBytes = USE_TEXTURES ? await resizeNormal(path.join(SOURCE_DIR, "texture_normal.png")) : null;
  const metalRoughnessBytes = USE_TEXTURES ? await createMetalRoughness(
    path.join(SOURCE_DIR, "texture_roughness.png"),
  ) : null;

  const diffuseTexture = USE_TEXTURES ? document
    .createTexture("brain multicolor atlas")
    .setMimeType("image/jpeg")
    .setImage(diffuseBytes) : null;
  const normalTexture = USE_TEXTURES ? document
    .createTexture("brain normal atlas")
    .setMimeType("image/png")
    .setImage(normalBytes) : null;
  const metalRoughnessTexture = USE_TEXTURES ? document
    .createTexture("brain roughness atlas")
    .setMimeType("image/png")
    .setImage(metalRoughnessBytes) : null;

  const material = document
    .createMaterial(USE_TEXTURES ? "brain multicolor matte" : USE_ZONES ? "brain pastel learning zones" : "brain neutral matte")
    // Linear RGB; matches the warm-neutral sRGB material in the still renderer.
    .setBaseColorFactor(USE_TEXTURES || USE_ZONES ? [1, 1, 1, 1] : [0.65, 0.59, 0.53, 1])
    .setBaseColorTexture(diffuseTexture)
    .setNormalTexture(normalTexture)
    .setNormalScale(0.65)
    .setMetallicFactor(0)
    .setRoughnessFactor(0.82)
    .setMetallicRoughnessTexture(metalRoughnessTexture)
    .setDoubleSided(false);

  const primitive = document
    .createPrimitive()
    .setAttribute("POSITION", position)
    .setAttribute("NORMAL", normal)
    .setAttribute("TEXCOORD_0", uv)
    .setMaterial(material);
  if (USE_ZONES) {
    const colors = new Float32Array(normalized.positions.length);
    for (let p = 0; p < normalized.positions.length; p += 3) {
      const rgb = brainZoneColor(
        normalized.positions[p], normalized.positions[p + 1], normalized.positions[p + 2],
      );
      // glTF vertex colors use linear RGB, unlike CSS and our palette swatches.
      for (let channel = 0; channel < 3; channel++) {
        const value = rgb[channel];
        colors[p + channel] = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      }
    }
    primitive.setAttribute("COLOR_0", makeAccessor(document, buffer, "COLOR_0", colors, Accessor.Type.VEC3));
  }
  const mesh = document.createMesh("brain").addPrimitive(primitive);
  const node = document.createNode("brain").setMesh(mesh);
  const scene = document.createScene("brain scene").addChild(node);
  document.getRoot().setDefaultScene(scene);

  // Welding makes shared OBJ vertices indexable before simplification. No meshopt or Draco
  // compression is applied: the resulting GLB contains ordinary glTF accessors and needs no
  // browser decoder beyond the standard GLB loader. KHR_mesh_quantization is a core glTF-loader
  // optimization, not a runtime decoder.
  await document.transform(
    weld({ overwrite: true }),
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: SIMPLIFY_RATIO,
      error: SIMPLIFY_ERROR,
      lockBorder: true,
    }),
    quantize({
      quantizePosition: 14,
      quantizeNormal: 8,
      quantizeTexcoord: 14,
      quantizationVolume: "mesh",
    }),
    dedup(),
    prune(),
  );

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
  const glb = await io.writeBinary(document);
  await fs.writeFile(OUTPUT_PATH, glb);

  const finalPosition = primitive.getAttribute("POSITION");
  const finalIndices = primitive.getIndices();
  const finalBounds = getBounds(node);
  const triangleCount = finalIndices
    ? Math.floor(finalIndices.getCount() / 3)
    : Math.floor(finalPosition.getCount() / 3);
  const report = {
    source: objPath,
    output: OUTPUT_PATH,
    orientation: "OBJLoader source orientation preserved; Y is up; no rotation applied",
    sourceVertices: source.vertexCount,
    sourceTriangles: source.vertexCount / 3,
    sourceBounds: normalized.sourceBounds,
    sourceDimensions: normalized.sourceDimensions,
    normalization: {
      centeredAt: normalized.center,
      scale: normalized.scale,
      maxDimension: 2,
    },
    bounds: finalBounds,
    vertices: finalPosition.getCount(),
    triangles: triangleCount,
    textures: USE_TEXTURES ? {
      size: `${TEXTURE_SIZE}x${TEXTURE_SIZE}`,
      diffuseBytes: diffuseBytes?.byteLength,
      normalBytes: normalBytes?.byteLength,
      metalRoughnessBytes: metalRoughnessBytes?.byteLength,
    } : null,
    outputBytes: glb.byteLength,
    colorMode: USE_ZONES ? "five illustrative pastel learning zones" : USE_TEXTURES ? "texture atlas" : "neutral",
    compression: "vertex weld + meshoptimizer simplification + KHR_mesh_quantization; no meshopt/draco decoder",
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});