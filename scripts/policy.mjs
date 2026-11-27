// npm run policy:prior
// npm run policy:freeze -- <export.json> [more.json ...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

// Node strips TypeScript types itself; this only resolves the extensionless imports in lib/.
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".")) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});
const { freezePolicy, priorFile } = await import("../lib/study/freeze.ts");

const path = (name) => fileURLToPath(new URL(`../data/${name}`, import.meta.url));
const PRIOR = path("policy.prior.json");
const FROZEN = path("policy.frozen.json");
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const write = (file, value) => {
  mkdirSync(path(""), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`);
};

const [command, ...files] = process.argv.slice(2);
if (command === "prior") {
  const prior = priorFile();
  write(PRIOR, prior);
  console.log(`wrote ${PRIOR} (hash ${prior.hash}, ${prior.provenance})`);
} else if (command === "freeze" && files.length > 0) {
  // A frozen policy is never silently replaced: delete it by hand if you really mean to.
  if (existsSync(FROZEN)) throw new Error(`${FROZEN} already exists`);
  const logs = files.map(read);
  const frozen = freezePolicy(read(PRIOR), {
    participants: logs.flatMap((l) => l.participants),
    events: logs.flatMap((l) => l.events),
  });
  write(FROZEN, frozen);
  console.log(`wrote ${FROZEN} (hash ${frozen.hash})`);
  console.log(JSON.stringify({ pilot: frozen.pilot, marginals: frozen.marginals, weightShift: frozen.weightShift }, null, 1));
  if (frozen.pilot.participants < 8) console.warn("WARNING: fewer than 8 usable pilot participants.");
} else {
  console.error("usage: policy.mjs prior | freeze <export.json> [...]");
  process.exit(1);
}
