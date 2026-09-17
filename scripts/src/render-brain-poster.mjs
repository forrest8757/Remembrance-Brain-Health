import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import sharp from "sharp";
import { Color } from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { getBrainDomain } from "../../artifacts/remembrance/src/lib/brain-domains.ts";

const SOURCE_DIR = path.resolve(process.env.BRAIN_SOURCE_DIR ?? "/tmp/brain-source");
const OBJ_PATH = path.resolve(process.env.BRAIN_OBJ_PATH ?? path.join(SOURCE_DIR, "base.obj"));
const USE_TEXTURES = process.env.BRAIN_USE_TEXTURES === "true";
const focusDomain = getBrainDomain(
  process.env.BRAIN_FOCUS_INDEX === undefined ? null : Number(process.env.BRAIN_FOCUS_INDEX),
);
const neutralColor = new Color(0.65, 0.59, 0.53).convertLinearToSRGB();
const NEUTRAL_RGB = [neutralColor.r, neutralColor.g, neutralColor.b].map((value) => value * 255);
const OUTPUT_PATH = path.resolve(
  process.env.BRAIN_POSTER_PATH ??
    path.resolve(process.cwd(), "../artifacts/remembrance/public/models/brain-poster.png"),
);
const WIDTH = 700;
const HEIGHT = 700;
const SUPERSAMPLE = 2;
const RASTER_WIDTH = WIDTH * SUPERSAMPLE;
const RASTER_HEIGHT = HEIGHT * SUPERSAMPLE;
const MODEL_MAX_DIMENSION = 2;
const ROTATION_Y = focusDomain?.view.rotation[1] ?? -0.65;
const ROTATION_X = focusDomain?.view.rotation[0] ?? 0.1;
const IMAGE_MARGIN = 0.08;
const COS_Y = Math.cos(ROTATION_Y);
const SIN_Y = Math.sin(ROTATION_Y);
const COS_X = Math.cos(ROTATION_X);
const SIN_X = Math.sin(ROTATION_X);
const EDGE_EPSILON = 0.002;
const NORMAL_SMOOTH_PASSES = 2;
const NORMAL_SMOOTH_BLEND = 0.65;

const fail = (message) => {
  throw new Error(`[render-brain-poster] ${message}`);
};

function getRenderableMeshes(object) {
  const meshes = object.children.filter(
    (child) => child.isMesh && child.geometry?.getAttribute("position"),
  );
  if (meshes.length === 0) fail("OBJLoader did not find a renderable mesh");
  return meshes;
}

function mergeAttributes(meshes) {
  const names = ["position", "normal", "uv"];
  const arrays = Object.fromEntries(names.map((name) => [name, []]));
  let vertexCount = 0;

  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    if (!position || !normal || !uv) {
      fail("OBJLoader output must contain position, normal, and UV attributes");
    }
    if (position.count !== normal.count || position.count !== uv.count) {
      fail("OBJLoader output has mismatched position, normal, and UV counts");
    }
    for (const name of names) arrays[name].push(geometry.getAttribute(name).array);
    vertexCount += position.count;
  }

  const merged = {};
  for (const name of names) {
    const sourceArrays = arrays[name];
    const ArrayType = sourceArrays[0].constructor;
    const size = sourceArrays.reduce((total, array) => total + array.length, 0);
    const result = new ArrayType(size);
    let offset = 0;
    for (const array of sourceArrays) {
      result.set(array, offset);
      offset += array.length;
    }
    merged[name] = result;
  }

  return { ...merged, vertexCount };
}

function normalizeAndRotate(sourcePositions) {
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
  const scale = MODEL_MAX_DIMENSION / sourceMaxDimension;
  const positions = new Float32Array(sourcePositions.length);
  const transformedBounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };

  for (let i = 0; i < sourcePositions.length; i += 3) {
    const x = (sourcePositions[i] - center[0]) * scale;
    const y = (sourcePositions[i + 1] - center[1]) * scale;
    const z = (sourcePositions[i + 2] - center[2]) * scale;

    // Keep the OBJ's Y-up coordinate system. Rotate around Y first for a three-quarter view,
    // then tilt around X just enough to reveal the upper cortical surface.
    const yawX = COS_Y * x + SIN_Y * z;
    const yawZ = -SIN_Y * x + COS_Y * z;
    const pitchY = COS_X * y - SIN_X * yawZ;
    const pitchZ = SIN_X * y + COS_X * yawZ;

    positions[i] = yawX;
    positions[i + 1] = pitchY;
    positions[i + 2] = pitchZ;
    for (const [axis, value] of [yawX, pitchY, pitchZ].entries()) {
      transformedBounds.min[axis] = Math.min(transformedBounds.min[axis], value);
      transformedBounds.max[axis] = Math.max(transformedBounds.max[axis], value);
    }
  }

  return {
    positions,
    sourceBounds: { min, max },
    sourceDimensions: dimensions,
    sourceMaxDimension,
    centeredAt: center,
    scale,
    transformedBounds,
  };
}

function smoothNormalsByPosition(positions, sourceNormals) {
  // OBJLoader intentionally emits an unindexed triangle list. Rebuild one-ring, area-weighted
  // normals from the shared positions instead of interpolating tiny OBJ normal discontinuities.
  // UV seams do not need to stay lighting seams on this organic, matte surface.
  const positionIndices = new Map();
  const uniqueIndices = new Int32Array(positions.length / 3);
  let uniquePositions = 0;
  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const p = vertex * 3;
    const key = `${Math.round(positions[p] * 1e6)},${Math.round(
      positions[p + 1] * 1e6,
    )},${Math.round(positions[p + 2] * 1e6)}`;
    let index = positionIndices.get(key);
    if (index === undefined) {
      index = uniquePositions++;
      positionIndices.set(key, index);
    }
    uniqueIndices[vertex] = index;
  }

  const accumulated = new Float64Array(uniquePositions * 3);
  for (let vertex = 0; vertex < uniqueIndices.length; vertex += 3) {
    const a = vertex * 3;
    const b = a + 3;
    const c = a + 6;
    const abX = positions[b] - positions[a];
    const abY = positions[b + 1] - positions[a + 1];
    const abZ = positions[b + 2] - positions[a + 2];
    const acX = positions[c] - positions[a];
    const acY = positions[c + 1] - positions[a + 1];
    const acZ = positions[c + 2] - positions[a + 2];
    const faceX = abY * acZ - abZ * acY;
    const faceY = abZ * acX - abX * acZ;
    const faceZ = abX * acY - abY * acX;
    const area = Math.hypot(faceX, faceY, faceZ);
    if (area < 1e-12) continue;
    for (const index of [uniqueIndices[vertex], uniqueIndices[vertex + 1], uniqueIndices[vertex + 2]]) {
      accumulated[index * 3] += faceX;
      accumulated[index * 3 + 1] += faceY;
      accumulated[index * 3 + 2] += faceZ;
    }
  }

  const uniqueNormals = new Float32Array(uniquePositions * 3);
  for (let index = 0; index < uniquePositions; index++) {
    const p = index * 3;
    const length = Math.hypot(accumulated[p], accumulated[p + 1], accumulated[p + 2]) || 1;
    uniqueNormals[p] = accumulated[p] / length;
    uniqueNormals[p + 1] = accumulated[p + 1] / length;
    uniqueNormals[p + 2] = accumulated[p + 2] / length;
  }

  // Smooth the one-ring result a couple of times with a conservative blend. This removes
  // high-frequency normal noise from the dense sculpt without flattening the broad sulci.
  let currentNormals = uniqueNormals;
  for (let pass = 0; pass < NORMAL_SMOOTH_PASSES; pass++) {
    const neighborSums = new Float64Array(uniquePositions * 3);
    const neighborCounts = new Uint32Array(uniquePositions);
    for (let vertex = 0; vertex < uniqueIndices.length; vertex += 3) {
      const a = uniqueIndices[vertex] * 3;
      const b = uniqueIndices[vertex + 1] * 3;
      const c = uniqueIndices[vertex + 2] * 3;
      for (const destination of [a, b, c]) {
        neighborSums[destination] += currentNormals[a] + currentNormals[b] + currentNormals[c];
        neighborSums[destination + 1] +=
          currentNormals[a + 1] + currentNormals[b + 1] + currentNormals[c + 1];
        neighborSums[destination + 2] +=
          currentNormals[a + 2] + currentNormals[b + 2] + currentNormals[c + 2];
        neighborCounts[destination / 3]++;
      }
    }
    const nextNormals = new Float32Array(uniquePositions * 3);
    for (let index = 0; index < uniquePositions; index++) {
      const p = index * 3;
      const count = neighborCounts[index] || 1;
      const averageX = neighborSums[p] / count;
      const averageY = neighborSums[p + 1] / count;
      const averageZ = neighborSums[p + 2] / count;
      const mixedX = currentNormals[p] * (1 - NORMAL_SMOOTH_BLEND) + averageX * NORMAL_SMOOTH_BLEND;
      const mixedY =
        currentNormals[p + 1] * (1 - NORMAL_SMOOTH_BLEND) + averageY * NORMAL_SMOOTH_BLEND;
      const mixedZ =
        currentNormals[p + 2] * (1 - NORMAL_SMOOTH_BLEND) + averageZ * NORMAL_SMOOTH_BLEND;
      const length = Math.hypot(mixedX, mixedY, mixedZ) || 1;
      nextNormals[p] = mixedX / length;
      nextNormals[p + 1] = mixedY / length;
      nextNormals[p + 2] = mixedZ / length;
    }
    currentNormals = nextNormals;
  }

  const normals = new Float32Array(sourceNormals.length);
  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const p = vertex * 3;
    const unique = uniqueIndices[vertex] * 3;
    normals[p] = currentNormals[unique];
    normals[p + 1] = currentNormals[unique + 1];
    normals[p + 2] = currentNormals[unique + 2];
  }
  return { normals, uniquePositions };
}

function rotateNormalInto(x, y, z, target) {
  const yawX = COS_Y * x + SIN_Y * z;
  const yawZ = -SIN_Y * x + COS_Y * z;
  target[0] = yawX;
  target[1] = COS_X * y - SIN_X * yawZ;
  target[2] = SIN_X * y + COS_X * yawZ;
}

function fract(value) {
  return value - Math.floor(value);
}

function sampleDiffuse(texture, u, v) {
  if (!texture) return NEUTRAL_RGB;
  const wrappedU = fract(u);
  const wrappedV = fract(v);
  // Bilinear filtering is deliberately clamped to the atlas edge instead of wrapping across
  // u=0/1. This avoids pulling unrelated colors into islands along the atlas boundary.
  const textureX = wrappedU * (texture.width - 1);
  const textureY = (1 - wrappedV) * (texture.height - 1);
  const x0 = Math.floor(textureX);
  const y0 = Math.floor(textureY);
  const x1 = Math.min(texture.width - 1, x0 + 1);
  const y1 = Math.min(texture.height - 1, y0 + 1);
  const tx = textureX - x0;
  const ty = textureY - y0;
  const topLeft = (y0 * texture.width + x0) * texture.channels;
  const topRight = (y0 * texture.width + x1) * texture.channels;
  const bottomLeft = (y1 * texture.width + x0) * texture.channels;
  const bottomRight = (y1 * texture.width + x1) * texture.channels;
  const result = [0, 0, 0];
  for (let channel = 0; channel < 3; channel++) {
    const top =
      texture.data[topLeft + channel] * (1 - tx) + texture.data[topRight + channel] * tx;
    const bottom =
      texture.data[bottomLeft + channel] * (1 - tx) + texture.data[bottomRight + channel] * tx;
    result[channel] = top * (1 - ty) + bottom * ty;
  }
  return result;
}

function normalizeVector(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function rasterize({ positions, normals, uvs, texture, vertexCount }) {
  const color = new Uint8ClampedArray(RASTER_WIDTH * RASTER_HEIGHT * 4);
  const depth = new Float32Array(RASTER_WIDTH * RASTER_HEIGHT);
  depth.fill(-Infinity);

  const transformedMin = [Infinity, Infinity];
  const transformedMax = [-Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    transformedMin[0] = Math.min(transformedMin[0], positions[i]);
    transformedMin[1] = Math.min(transformedMin[1], positions[i + 1]);
    transformedMax[0] = Math.max(transformedMax[0], positions[i]);
    transformedMax[1] = Math.max(transformedMax[1], positions[i + 1]);
  }

  const projectedWidth = transformedMax[0] - transformedMin[0];
  const projectedHeight = transformedMax[1] - transformedMin[1];
  const projectionScale =
    (Math.min(RASTER_WIDTH, RASTER_HEIGHT) * (1 - IMAGE_MARGIN * 2)) /
    Math.max(projectedWidth, projectedHeight);
  const projectedCenterX = (transformedMin[0] + transformedMax[0]) / 2;
  const projectedCenterY = (transformedMin[1] + transformedMax[1]) / 2;
  const focusTarget = [0, 0, 0];
  if (focusDomain) rotateNormalInto(...focusDomain.view.target, focusTarget);
  const focalLength = RASTER_HEIGHT / (2 * Math.tan((28 * Math.PI) / 360));
  // Match the live viewer: normalized mesh scale .91, 28-degree perspective
  // camera, with the chosen surface area centered before dollying closer.
  const projectX = (value, z) => focusDomain
    ? RASTER_WIDTH / 2 + (value - focusTarget[0]) * 0.91 * focalLength /
        (focusDomain.view.distance - (z - focusTarget[2]) * 0.91)
    : (value - projectedCenterX) * projectionScale + RASTER_WIDTH / 2;
  const projectY = (value, z) => focusDomain
    ? RASTER_HEIGHT / 2 - (value - focusTarget[1]) * 0.91 * focalLength /
        (focusDomain.view.distance - (z - focusTarget[2]) * 0.91)
    : RASTER_HEIGHT / 2 - (value - projectedCenterY) * projectionScale;

  const light = normalizeVector(-0.48, 0.78, 0.9);
  const ambient = 0.62;
  const diffuseStrength = 0.38;
  const positionA = [0, 0, 0];
  const positionB = [0, 0, 0];
  const positionC = [0, 0, 0];
  const normalA = [0, 0, 0];
  const normalB = [0, 0, 0];
  const normalC = [0, 0, 0];
  const uvA = [0, 0];
  const uvB = [0, 0];
  const uvC = [0, 0];
  const rotatedA = [0, 0, 0];
  const rotatedB = [0, 0, 0];
  const rotatedC = [0, 0, 0];

  for (let vertex = 0; vertex < vertexCount; vertex += 3) {
    const p = vertex * 3;
    const t = vertex * 2;

    positionA[0] = projectX(positions[p], positions[p + 2]);
    positionA[1] = projectY(positions[p + 1], positions[p + 2]);
    positionA[2] = positions[p + 2];
    positionB[0] = projectX(positions[p + 3], positions[p + 5]);
    positionB[1] = projectY(positions[p + 4], positions[p + 5]);
    positionB[2] = positions[p + 5];
    positionC[0] = projectX(positions[p + 6], positions[p + 8]);
    positionC[1] = projectY(positions[p + 7], positions[p + 8]);
    positionC[2] = positions[p + 8];

    const area =
      (positionB[0] - positionA[0]) * (positionC[1] - positionA[1]) -
      (positionB[1] - positionA[1]) * (positionC[0] - positionA[0]);
    if (Math.abs(area) < 0.0001) continue;

    normalA[0] = normals[p];
    normalA[1] = normals[p + 1];
    normalA[2] = normals[p + 2];
    normalB[0] = normals[p + 3];
    normalB[1] = normals[p + 4];
    normalB[2] = normals[p + 5];
    normalC[0] = normals[p + 6];
    normalC[1] = normals[p + 7];
    normalC[2] = normals[p + 8];
    rotateNormalInto(normalA[0], normalA[1], normalA[2], rotatedA);
    rotateNormalInto(normalB[0], normalB[1], normalB[2], rotatedB);
    rotateNormalInto(normalC[0], normalC[1], normalC[2], rotatedC);
    uvA[0] = uvs[t];
    uvA[1] = uvs[t + 1];
    uvB[0] = uvs[t + 2];
    uvB[1] = uvs[t + 3];
    uvC[0] = uvs[t + 4];
    uvC[1] = uvs[t + 5];

    const minX = Math.max(0, Math.ceil(Math.min(positionA[0], positionB[0], positionC[0]) - 0.5));
    const maxX = Math.min(
      RASTER_WIDTH - 1,
      Math.floor(Math.max(positionA[0], positionB[0], positionC[0]) - 0.5),
    );
    const minY = Math.max(0, Math.ceil(Math.min(positionA[1], positionB[1], positionC[1]) - 0.5));
    const maxY = Math.min(
      RASTER_HEIGHT - 1,
      Math.floor(Math.max(positionA[1], positionB[1], positionC[1]) - 0.5),
    );
    if (minX > maxX || minY > maxY) continue;

    const inverseArea = 1 / area;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const weightA =
          ((positionB[0] - px) * (positionC[1] - py) -
            (positionB[1] - py) * (positionC[0] - px)) *
          inverseArea;
        const weightB =
          ((positionC[0] - px) * (positionA[1] - py) -
            (positionC[1] - py) * (positionA[0] - px)) *
          inverseArea;
        const weightC = 1 - weightA - weightB;
        // OBJLoader emits an unindexed triangle list. Adjacent triangles therefore have
        // independently rounded edge equations; a tiny conservative epsilon prevents one-pixel
        // pinholes at shared edges. The z-buffer resolves the resulting one-pixel overlaps.
        if (
          weightA < -EDGE_EPSILON ||
          weightB < -EDGE_EPSILON ||
          weightC < -EDGE_EPSILON
        )
          continue;

        const pixel = y * RASTER_WIDTH + x;
        const z =
          weightA * positionA[2] + weightB * positionB[2] + weightC * positionC[2];
        if (z <= depth[pixel]) continue;
        depth[pixel] = z;

        const u = weightA * uvA[0] + weightB * uvB[0] + weightC * uvC[0];
        const v = weightA * uvA[1] + weightB * uvB[1] + weightC * uvC[1];
        const texel = sampleDiffuse(texture, u, v);
        const nx = weightA * rotatedA[0] + weightB * rotatedB[0] + weightC * rotatedC[0];
        const ny = weightA * rotatedA[1] + weightB * rotatedB[1] + weightC * rotatedC[1];
        const nz = weightA * rotatedA[2] + weightB * rotatedB[2] + weightC * rotatedC[2];
        const normalLength = Math.hypot(nx, ny, nz) || 1;
        const lambert = Math.max(0, (nx * light[0] + ny * light[1] + nz * light[2]) / normalLength);
        // A square-root response keeps grazing cortical facets from turning into black pinholes
        // while preserving a readable front-upper-left Lambert direction.
        const brightness = ambient + diffuseStrength * Math.sqrt(lambert);
        const output = pixel * 4;
        color[output] = Math.min(255, Math.round(texel[0] * brightness));
        color[output + 1] = Math.min(255, Math.round(texel[1] * brightness));
        color[output + 2] = Math.min(255, Math.round(texel[2] * brightness));
        color[output + 3] = 255;
      }
    }
  }

  return {
    color,
    projectionScale,
    projectedBounds: {
      min: [transformedMin[0], transformedMin[1]],
      max: [transformedMax[0], transformedMax[1]],
    },
  };
}

function repairInternalHoles(raw, width, height) {
  let repaired = 0;
  // Downsampling can leave a one-pixel transparent island where three independently rasterized
  // triangle edges meet. Fill only pixels surrounded by opaque neighbors, preserving the
  // antialiased outer silhouette and any intentional transparent background.
  for (let pass = 0; pass < 2; pass++) {
    const source = new Uint8ClampedArray(raw);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const pixel = (y * width + x) * 4;
        if (source[pixel + 3] >= 96) continue;
        let opaqueNeighbors = 0;
        let red = 0;
        let green = 0;
        let blue = 0;
        for (let offsetY = -1; offsetY <= 1; offsetY++) {
          for (let offsetX = -1; offsetX <= 1; offsetX++) {
            if (offsetX === 0 && offsetY === 0) continue;
            const neighbor = ((y + offsetY) * width + x + offsetX) * 4;
            if (source[neighbor + 3] < 220) continue;
            opaqueNeighbors++;
            red += source[neighbor];
            green += source[neighbor + 1];
            blue += source[neighbor + 2];
          }
        }
        if (opaqueNeighbors < 7) continue;
        raw[pixel] = Math.round(red / opaqueNeighbors);
        raw[pixel + 1] = Math.round(green / opaqueNeighbors);
        raw[pixel + 2] = Math.round(blue / opaqueNeighbors);
        raw[pixel + 3] = 255;
        repaired++;
      }
    }
  }
  return repaired;
}

async function main() {
  const objPath = OBJ_PATH;
  const diffusePath = path.join(SOURCE_DIR, "texture_diffuse.png");
  const [objText, diffuseInput] = await Promise.all([
    fs.readFile(objPath, "utf8"),
    USE_TEXTURES ? sharp(diffusePath)
      .resize(1024, 1024, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }) : null,
  ]);

  const object = new OBJLoader().parse(objText);
  const source = mergeAttributes(getRenderableMeshes(object));
  if (source.vertexCount % 3 !== 0) fail("OBJLoader output is not a triangle list");
  const normalized = normalizeAndRotate(source.position);
  const smoothed = smoothNormalsByPosition(source.position, source.normal);
  const rendered = rasterize({
    positions: normalized.positions,
    normals: smoothed.normals,
    uvs: source.uv,
    texture: diffuseInput ? {
      data: diffuseInput.data,
      width: diffuseInput.info.width,
      height: diffuseInput.info.height,
      channels: diffuseInput.info.channels,
    } : null,
    vertexCount: source.vertexCount,
  });

  const resized = await sharp(rendered.color, {
    raw: { width: RASTER_WIDTH, height: RASTER_HEIGHT, channels: 4 },
  })
    .resize(WIDTH, HEIGHT, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    // A very small final blur removes residual subpixel normal/edge sparkle while retaining
    // cortical folds; the source is rendered at 2x before this downsample.
    .blur(0.8)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const repairedPixels = repairInternalHoles(resized.data, WIDTH, HEIGHT);
  const poster = await sharp(resized.data, {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, poster);

  console.log(
    JSON.stringify(
      {
        source: objPath,
        diffuse: USE_TEXTURES ? diffusePath : null,
        output: OUTPUT_PATH,
        renderer: "CPU barycentric rasterizer with z-buffer",
        canvas: `${WIDTH}x${HEIGHT}`,
        sourceTriangles: source.vertexCount / 3,
        smoothedNormalPositions: smoothed.uniquePositions,
        sourceBounds: normalized.sourceBounds,
        normalizedBounds: normalized.transformedBounds,
        rotationRadians: { y: ROTATION_Y, x: ROTATION_X },
        focus: focusDomain?.region ?? null,
        orientation: focusDomain
          ? "Y-up source orientation retained; perspective educational focus"
          : "Y-up source orientation retained; orthographic three-quarter view",
        texture: diffuseInput ? `${diffuseInput.info.width}x${diffuseInput.info.height}` : "none — neutral matte",
        supersample: `${SUPERSAMPLE}x`,
        repairedInternalHoles: repairedPixels,
        posterBytes: poster.byteLength,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});