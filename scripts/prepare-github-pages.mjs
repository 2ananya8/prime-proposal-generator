import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "/prime-proposal-generator/";
const outDir = join(process.cwd(), "dist", "client");
const indexPath = join(outDir, "index.html");

/** Runs before the app bundle so PKCE reset links (?code=) can exchange in a new tab. */
const PKCE_BRIDGE_SCRIPT = `<script>
(function(){try{var p=new URLSearchParams(location.search);if(!p.get("code"))return;var prefix="prime_pkce_bridge:";for(var i=0;i<localStorage.length;i++){var key=localStorage.key(i);if(key&&key.indexOf(prefix)===0){var storageKey=key.slice(prefix.length);var value=localStorage.getItem(key);if(value)sessionStorage.setItem(storageKey,value);}}}catch(e){}})();
</script>`;

function patchHtml(html) {
  let patched = html;
  if (!patched.includes("<base ")) {
    patched = patched.replace(
      /<head>/i,
      `<head><base href="${BASE}"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />${PKCE_BRIDGE_SCRIPT}`,
    );
  } else if (!patched.includes("prime_pkce_bridge")) {
    patched = patched.replace(/<head>/i, `<head>${PKCE_BRIDGE_SCRIPT}`);
  }
  return patched;
}

const indexHtml = patchHtml(readFileSync(indexPath, "utf8"));
writeFileSync(indexPath, indexHtml);
copyFileSync(indexPath, join(outDir, "404.html"));
writeFileSync(join(outDir, ".nojekyll"), "");

console.log("GitHub Pages: patched index.html, wrote 404.html and .nojekyll in dist/client");
