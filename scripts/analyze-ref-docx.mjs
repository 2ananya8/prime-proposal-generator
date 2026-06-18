import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const docxPath = "c:/Users/COMPUTER/Downloads/Web_Application__Infrastructure_VAPT_Source2T_V1_0 (1).docx";
const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
const files = Object.keys(zip.files);

function read(rel) {
  const f = zip.file(rel);
  return f ? f.async("string") : null;
}

const doc = await read("word/document.xml");
const headers = files.filter((f) => f.startsWith("word/header") && f.endsWith(".xml"));
console.log("headers:", headers);

for (const h of headers) {
  const xml = await read(h);
  console.log("\n===", h, "===");
  const extents = [...xml.matchAll(/cx=\"(\d+)\" cy=\"(\d+)\"/g)].map((m) => ({
    cx: +m[1], cy: +m[2], cxIn: (+m[1] / 914400).toFixed(3), cyIn: (+m[2] / 914400).toFixed(3),
  }));
  console.log("images EMU:", extents);
  const pos = [...xml.matchAll(/wp:posOffset>(-?\d+)</g)].map((m) => +m[1]);
  console.log("posOffset twips-ish:", pos.map((p) => ({ val: p, in: (p / 914400).toFixed(3) })));
}

const sect = doc?.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
console.log("\n=== sectPr (document) ===");
console.log(sect?.[0]?.replace(/></g, ">\n<"));

const settings = read("word/settings.xml");
const hdrFtr = settings?.match(/<w:hdrShapeDefaults[\s\S]*?<\/w:hdrShapeDefaults>/);
console.log("\n=== hdrShapeDefaults ===");
console.log(hdrFtr?.[0] ?? "none");
