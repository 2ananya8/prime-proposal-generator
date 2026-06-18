import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "dist", "client");
const indexPath = join(outDir, "index.html");

copyFileSync(indexPath, join(outDir, "404.html"));
writeFileSync(join(outDir, ".nojekyll"), "");

console.log("GitHub Pages: wrote 404.html and .nojekyll in dist/client");
