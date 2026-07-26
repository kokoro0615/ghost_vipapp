import fs from "node:fs";

const manifestPath = ".next/server/middleware-manifest.json";
const outputPath = ".next/server/middleware.js.nft.json";

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch {
  process.exit(0);
}

const middleware = manifest?.middleware?.["/"];
if (!middleware) process.exit(0);

const files = new Set();
for (const item of middleware.files ?? []) {
  if (typeof item === "string" && item.startsWith("server/edge/")) {
    files.add(item.slice("server/".length));
  } else {
    files.add(item);
  }
}
files.add("edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_1pjtva3.js");
files.add("edge/chunks/[root-of-the-server]__1q9nw-8._.js");
files.add("edge/chunks/node_modules_next_dist_esm_build_templates_edge-wrapper_0h-u1c1.js");

fs.writeFileSync(outputPath, JSON.stringify({
  version: 1,
  files: [...files],
}));
