import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "/prime-proposal-generator/";
const outDir = join(process.cwd(), "dist", "client");
const indexPath = join(outDir, "index.html");

function patchHtml(html) {
  let patched = html;
  if (!patched.includes("<base ")) {
    patched = patched.replace(
      /<head>/i,
      `<head><base href="${BASE}"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />`,
    );
  }
  return patched;
}

const indexHtml = patchHtml(readFileSync(indexPath, "utf8"));
writeFileSync(indexPath, indexHtml);
copyFileSync(indexPath, join(outDir, "404.html"));
writeFileSync(join(outDir, ".nojekyll"), "");

console.log("GitHub Pages: patched index.html, wrote 404.html and .nojekyll in dist/client");
