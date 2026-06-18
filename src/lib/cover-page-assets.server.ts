import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerCoverAssetDiskLoader } from "./cover-page-assets";

function resolveAssetsDir(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), "public", "assets"),
    path.join(process.cwd(), "proposal-wizard-fixed", "public", "assets"),
    path.resolve(moduleDir, "../../../public/assets"),
    path.resolve(moduleDir, "../../../../public/assets"),
    path.resolve(moduleDir, "../../public/assets"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error(`Cover assets folder not found. cwd=${process.cwd()}`);
}

function tryReadFile(...names: string[]): Uint8Array | null {
  const assetsDir = resolveAssetsDir();
  for (const name of names) {
    const full = path.join(assetsDir, name);
    if (fs.existsSync(full)) return new Uint8Array(fs.readFileSync(full));
  }
  return null;
}

registerCoverAssetDiskLoader(tryReadFile);

export * from "./cover-page-assets";
