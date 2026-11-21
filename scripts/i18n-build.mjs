import fs from "node:fs";
import path from "node:path";

const [, , trFile] = process.argv;
const file = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "src/lib/shared/i18n/pl.ts");
const current = fs.readFileSync(file, "utf8");
const { PL } = await import(file);
const extra = JSON.parse(fs.readFileSync(trFile, "utf8"));
const merged = { ...PL, ...extra };
const patterns = current.slice(current.indexOf("export const PL_PATTERNS"));
const body = Object.entries(merged)
  .sort(([a], [b]) => a.localeCompare(b, "uk"))
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join("\n");
fs.writeFileSync(file, `export const PL: Record<string, string> = {\n${body}\n};\n\n${patterns}`);
console.log(Object.keys(merged).length);
