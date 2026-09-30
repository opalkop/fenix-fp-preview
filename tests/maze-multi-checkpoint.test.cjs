"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const html = read("modules/maze-studio/index.html");
const ui = read("modules/maze-studio/maze.js");
const engine = read("modules/maze-studio/maze-engine.js");
const renderer = read("modules/maze-studio/maze-render-fix.js");
const core = read("modules/maze-studio/maze-core.js");

for (let index = 1; index <= 5; index++) {
  assert.match(html, new RegExp(`id="checkpointAsset${index}"`));
  assert.match(html, new RegExp(`id="checkpointScale${index}"`));
}
assert.match(ui, /checkpointAssets:\s*checkpoints/);
assert.match(ui, /checkpointAssetRef:\s*checkpoints\[0\]/);
assert.match(ui, /checkpointScale:\s*checkpoints\[0\]/);
assert.match(engine, /checkpointIndex:\s*i/);
assert.match(engine, /assetRef:\s*checkpoint\.assetRef/);
assert.match(engine, /assetScale:\s*checkpoint\.scale/);
assert.match(renderer, /z\.checkpointIndex \?\? index/);
assert.match(core, /checkpointRefs/);

console.log(
  "PASS maze-multi-checkpoint: five UI slots, modern serialization, legacy aliases, ordered engine metadata and asset loading.",
);
