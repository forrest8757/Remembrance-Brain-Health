import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir, rename, writeFile } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const sharedBuildOptions = {
  platform: "node",
  bundle: true,
  format: "esm",
  outExtension: { ".js": ".mjs" },
  logLevel: "info",
  // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
  // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
  // Examples of unbundleable packages:
  // - uses native modules and loads them dynamically (e.g. sharp)
  // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
  external: [
    "*.node",
    "sharp",
    "better-sqlite3",
    "sqlite3",
    "canvas",
    "bcrypt",
    "argon2",
    "fsevents",
    "re2",
    "farmhash",
    "xxhash-addon",
    "bufferutil",
    "utf-8-validate",
    "ssh2",
    "cpu-features",
    "dtrace-provider",
    "isolated-vm",
    "lightningcss",
    "pg-native",
    "oracledb",
    "mongodb-client-encryption",
    "nodemailer",
    "handlebars",
    "knex",
    "typeorm",
    "protobufjs",
    "onnxruntime-node",
    "@tensorflow/*",
    "@prisma/client",
    "@mikro-orm/*",
    "@grpc/*",
    "@swc/*",
    "@aws-sdk/*",
    "@azure/*",
    "@opentelemetry/*",
    "@google-cloud/*",
    "@google/*",
    "googleapis",
    "firebase-admin",
    "@parcel/watcher",
    "@sentry/profiling-node",
    "@tree-sitter/*",
    "aws-sdk",
    "classic-level",
    "dd-trace",
    "ffi-napi",
    "grpc",
    "hiredis",
    "kerberos",
    "leveldown",
    "miniflare",
    "mysql2",
    "newrelic",
    "odbc",
    "piscina",
    "realm",
    "ref-napi",
    "rocksdb",
    "sass-embedded",
    "sequelize",
    "serialport",
    "snappy",
    "tinypool",
    "usb",
    "workerd",
    "wrangler",
    "zeromq",
    "zeromq-prebuilt",
    "playwright",
    "puppeteer",
    "puppeteer-core",
    "electron",
  ],
  sourcemap: "linked",
  plugins: [
    // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
    esbuildPluginPino({ transports: ["pino-pretty"] }),
  ],
  // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
  },
};

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    ...sharedBuildOptions,
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    outdir: distDir,
  });

  // Vercel's zero-config Express framework detection type-checks and
  // transpiles src/*.ts itself, one file at a time, without bundling — it
  // never touches the workspace packages' TypeScript source that our own
  // "workspace" package.json exports resolve to, so the deployed function
  // can't load them at runtime (and separately, its type-checker has real
  // bugs with this project's structure). We sidestep all of that entirely by
  // authoring the Vercel Build Output API (v3) directly: a pre-bundled,
  // plain-JS handler (the Express app, no app.listen()) with no TypeScript
  // involved. Since the app itself mounts all routes under /api already,
  // the routes below don't need to rewrite anything.
  await buildVercelFunction();
}

async function buildVercelFunction() {
  const outputDir = path.resolve(artifactDir, ".vercel/output");
  await rm(outputDir, { recursive: true, force: true });

  const funcDir = path.resolve(outputDir, "functions/index.func");
  await mkdir(funcDir, { recursive: true });

  await esbuild({
    ...sharedBuildOptions,
    entryPoints: [path.resolve(artifactDir, "src/app.ts")],
    outdir: funcDir,
  });
  // esbuild names outdir output after the entry point ("app.ts" -> "app.mjs");
  // the Vercel Function config below expects it named per its "handler" field.
  await rename(path.join(funcDir, "app.mjs"), path.join(funcDir, "index.mjs"));
  await rename(
    path.join(funcDir, "app.mjs.map"),
    path.join(funcDir, "index.mjs.map"),
  );

  await writeFile(
    path.join(funcDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs24.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
      },
      null,
      2,
    ),
  );

  await mkdir(path.join(outputDir, "static"), { recursive: true });

  await writeFile(
    path.join(outputDir, "config.json"),
    JSON.stringify(
      {
        version: 3,
        routes: [{ src: "/(.*)", dest: "/index" }],
      },
      null,
      2,
    ),
  );
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
