import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../..", import.meta.url));
const packagePath = join(root, "package.json");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

test("ArgOS pins the exact frozen ArgCore package", async () => {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  assert.equal(
    packageJson.dependencies?.["@kelziejordan/argcore"],
    "1.0.0-argcore-004",
  );
});

test("ArgOS contains no copied ArgCore runtime implementation", async () => {
  const files = await walk(root);
  const prohibited = files
    .map((file) => relative(root, file).replaceAll("\\", "/"))
    .filter((path) =>
      /^src\/(argcore|vendor\/argcore)(\/|$)/.test(path) ||
      /^src\/runtime\/(admission|grants|index|lifecycle|provenance)\.js$/.test(path),
    );

  assert.deepEqual(prohibited, []);
});

test("ArgOS adapter is the only Core-named runtime integration module", async () => {
  const files = await walk(join(root, "src"));
  const coreIntegrationFiles = files
    .map((file) => relative(root, file).replaceAll("\\", "/"))
    .filter((path) => /argcore/i.test(path));

  assert.deepEqual(coreIntegrationFiles, ["src/runtime/argcore-adapter.js"]);
});
