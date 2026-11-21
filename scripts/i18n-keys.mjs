import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const CYR = /[А-Яа-яІіЇїЄєҐґ]/;
const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "src");
const SKIP = /lib[\\/]server[\\/](mail|prompt|demo|autoria)\.ts$|lib[\\/]shared[\\/](calc|autoriaMatch|i18n|auctionFees|copyright|cars)\.ts$|lib[\\/]shared[\\/]i18n[\\/]|config[\\/]brand\.ts$|app[\\/]layout\.tsx$/;
const IGNORE = /_KEY|DATABASE_URL|Postgres|бази з такою назвою|база не відповідає|Claude Console|^used original|^new aftermarket|^new original|не пройшов перевірку типу/;
const TABLES = /lib[\\/]shared[\\/](lotText|lessons)\.ts$|config[\\/]analysis\.ts$/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

export function collectKeys() {
  const keys = new Map();
  const add = (k, file) => {
    if (CYR.test(k) && !IGNORE.test(k) && !keys.has(k)) keys.set(k, path.relative(root, file));
  };
  for (const file of walk(root)) {
    if (SKIP.test(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    if (!CYR.test(src)) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const server = /app[\\/]api[\\/]|lib[\\/]server[\\/]/.test(file);
    const table = TABLES.test(file);
    const visit = (n, inL) => {
      if (ts.isCallExpression(n)) {
        const name = n.expression.getText(sf);
        if (name.startsWith("console.")) return;
        if (name === "t" && n.arguments[0] && (ts.isStringLiteral(n.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(n.arguments[0]))) add(n.arguments[0].text, file);
        if (name === "L") return n.arguments.forEach((a) => visit(a, true));
        if (server && name === "fail") {
          const msg = n.arguments[1];
          if (msg && (ts.isStringLiteral(msg) || ts.isNoSubstitutionTemplateLiteral(msg))) add(msg.text, file);
        }
      }
      if ((inL || table) && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))) {
        const p = n.parent;
        if (!(p && ts.isPropertyAssignment(p) && p.name === n)) add(n.text, file);
      }
      if (server && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !(n.parent && ts.isPropertyAssignment(n.parent) && n.parent.name === n)) add(n.text, file);
      if (server && ts.isVariableDeclaration(n) && /MESSAGE$/.test(n.name.getText(sf)) && n.initializer && ts.isStringLiteral(n.initializer)) add(n.initializer.text, file);
      if (/lib[\\/]shared[\\/]errors\.ts$/.test(file) && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))) add(n.text, file);
      ts.forEachChild(n, (c) => visit(c, inL));
    };
    visit(sf, false);
  }
  return keys;
}

if (process.argv[1] && process.argv[1].endsWith("i18n-keys.mjs")) {
  const keys = collectKeys();
  const mode = process.argv[2];
  if (mode === "missing") {
    const { PL } = await import(path.join(root, "lib/shared/i18n/pl.ts"));
    const missing = [...keys].filter(([k]) => !(k in PL));
    console.log(JSON.stringify(Object.fromEntries(missing), null, 1));
    console.error(`missing ${missing.length} of ${keys.size}`);
  } else console.log(JSON.stringify(Object.fromEntries(keys), null, 1));
}
