import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  applyTemplateToServiceForm,
  parsePastedTemplateText,
  readTemplateFile,
  SERVICE_FIELD_LABELS,
  TEMPLATE_FILE_ACCEPT,
  isAllowedTemplateFile,
  type ParsedTemplateDocument,
  type ServiceFieldKey,
} from "@/lib/template-document-parser";
import {
  approachToHtml,
  benefitsToHtml,
  listFieldHtml,
  setListFieldHtml,
} from "@/lib/service-field-helpers";
import { Upload, ChevronDown, ChevronUp, ImagePlus } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";

export type ServiceFormValue = {
  name: string;
  service_type: string;
  short_code: string;
  approach_methodology: { name: string; description: string }[];
  executive_summary_template: string;
  project_objectives: string[];
  expected_benefits: string[];
  deliverables: string[];
  prerequisites: string[];
  timeline_phases: string[];
  extra_sections: { title: string; content: string }[];
};

export const emptyService: ServiceFormValue = {
  name: "", service_type: "", short_code: "",
  approach_methodology: [{ name: "", description: "" }],
  executive_summary_template: "{{client_name}} has engaged Prime Infoserv for {{scope}}. {{client_summary}}",
  project_objectives: [], expected_benefits: [], deliverables: [],
  prerequisites: [],
  timeline_phases: [], extra_sections: [],
};

const SERVICE_SECTION_IMAGE_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";
const SERVICE_SECTION_IMAGE_MAX_BYTES = 2_000_000;

const ALLOWED_IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function validateSectionImageFile(file: File): string | null {
  const ext = fileExtension(file.name);
  const mime = file.type.toLowerCase();
  if (!ALLOWED_IMAGE_EXT.has(ext) && (!mime || !ALLOWED_IMAGE_MIME.has(mime))) {
    return "Only image files (PNG, JPG, WEBP, GIF) are allowed.";
  }
  if (!mime.startsWith("image/")) {
    return "Only image files are allowed.";
  }
  if (file.size > SERVICE_SECTION_IMAGE_MAX_BYTES) {
    return "Image must be smaller than 2 MB.";
  }
  return null;
}

async function readImageAsDataUrl(file: File): Promise<string> {
  const fail = validateSectionImageFile(file);
  if (fail) throw new Error(fail);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !/^data:image\//i.test(result)) {
        reject(new Error("Could not read a valid image file."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function appendCenteredImage(html: string, dataUrl: string): string {
  const imageHtml = `<p style="text-align:center;"><img src="${dataUrl}" alt="Section image" /></p>`;
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>") return imageHtml;
  return `${html}\n${imageHtml}`;
}

function imageCountFromHtml(html: string): number {
  if (!html?.trim()) return 0;
  return [...html.matchAll(/<img\b/gi)].length;
}

export function ServiceForm({ value, onChange }: { value: ServiceFormValue; onChange: (v: ServiceFormValue) => void }) {
  const [showOptional, setShowOptional] = useState(
    !!(value.project_objectives.length || value.expected_benefits.length || value.deliverables.length || value.prerequisites.length || value.executive_summary_template),
  );
  const set = <K extends keyof ServiceFormValue>(k: K, v: ServiceFormValue[K]) => onChange({ ...value, [k]: v });

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ParsedTemplateDocument | null>(null);
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [imageStatus, setImageStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAllowedTemplateFile(file)) {
      setParsed(null);
      setImportStatus({ ok: false, msg: "Only .txt and .docx files are allowed." });
      e.target.value = "";
      return;
    }
    setImporting(true);
    setImportStatus(null);
    try {
      const doc = await readTemplateFile(file);
      setParsed(doc);
      setImportStatus({
        ok: true,
        msg: `Read ${doc.sections.length} section(s). ${Object.keys(doc.byField).length} mapped to form fields — click Extract & fill form to apply.`,
      });
    } catch (err) {
      setParsed(null);
      setImportStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed to read file.",
      });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  function handlePasteChange(text: string) {
    setImportText(text);
    if (!text.trim()) {
      setParsed(null);
      setImportStatus(null);
      return;
    }
    const doc = parsePastedTemplateText(text);
    setParsed(doc);
  }

  function handleExtract() {
    const doc = parsed ?? (importText.trim() ? parsePastedTemplateText(importText) : null);
    if (!doc?.sections.length) {
      setImportStatus({ ok: false, msg: "Please paste or upload a document first." });
      return;
    }
    try {
      onChange(applyTemplateToServiceForm(doc, value));
      setParsed(doc);
      setShowOptional(true);
      setImportOpen(false);

      const filled = (Object.keys(doc.byField) as ServiceFieldKey[]).map((k) => SERVICE_FIELD_LABELS[k]);
      const extras = doc.unmatched.length;
      setImportStatus({
        ok: true,
        msg: [
          filled.length ? `Filled: ${filled.join(", ")}` : null,
          extras ? `${extras} section(s) added under Custom Sections` : null,
          "All fields remain editable.",
        ].filter(Boolean).join(" "),
      });
    } catch (err: unknown) {
      setImportStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Extraction failed. Please try again.",
      });
    }
  }

  function fieldLabelForSection(section: ParsedTemplateDocument["sections"][0]): string {
    const entry = (Object.entries(parsed?.byField ?? {}) as [ServiceFieldKey, { normalizedTitle: string }][])
      .find(([, s]) => s.normalizedTitle === section.normalizedTitle);
    if (entry) return SERVICE_FIELD_LABELS[entry[0]];
    if (parsed?.unmatched.some((u) => u.normalizedTitle === section.normalizedTitle)) return "Custom section";
    return "—";
  }

  const addImageToHtml = async (currentHtml: string, apply: (nextHtml: string) => void) => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = SERVICE_SECTION_IMAGE_ACCEPT;
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await readImageAsDataUrl(file);
        apply(appendCenteredImage(currentHtml, dataUrl));
        setImageStatus({ ok: true, msg: "Image added and center-aligned." });
      } catch (err) {
        setImageStatus({ ok: false, msg: err instanceof Error ? err.message : "Image upload failed." });
      }
    };
    picker.click();
  };

  const addImageButton = (onClick: () => void, htmlValue: string) => (
    <div className="mt-3 flex items-center justify-end gap-2">
      {imageCountFromHtml(htmlValue) > 0 ? (
        <span className="text-xs text-muted-foreground">
          {imageCountFromHtml(htmlValue)} image{imageCountFromHtml(htmlValue) > 1 ? "s" : ""} added
        </span>
      ) : null}
      <Button type="button" variant="outline" size="sm" onClick={onClick}>
        <ImagePlus className="h-4 w-4 mr-1" />
        Add image
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Import panel */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <button
            type="button"
            onClick={() => setImportOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            <Upload className="h-4 w-4" />
            Import from past proposal or template
            {importOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </button>
        </CardHeader>
        {importOpen && (
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1">
              <Label>Paste document text</Label>
              <Textarea
                value={importText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder="Paste the content of a past proposal or service template here…"
                className="min-h-[140px]"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">or upload a file</span>
              <input ref={fileRef} type="file" accept={TEMPLATE_FILE_ACCEPT} className="hidden" onChange={handleFileChange} />
              <Button type="button" variant="outline" size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
                {importing ? "Reading…" : "Choose .txt / .docx"}
              </Button>
            </div>
            {parsed && parsed.sections.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Sections read from document</p>
                <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {parsed.sections.map((sec) => (
                    <li key={sec.normalizedTitle} className="flex justify-between gap-2">
                      <span className="font-medium truncate">{sec.title}</span>
                      <span className="text-muted-foreground shrink-0">{fieldLabelForSection(sec)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button type="button" onClick={handleExtract} disabled={importing} className="w-full">
              Extract & fill form
            </Button>
          </CardContent>
        )}
        {importStatus && (
          <div className={`mx-4 mb-3 text-sm rounded-md px-3 py-2 ${importStatus.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {importStatus.msg}
          </div>
        )}
      </Card>
      {imageStatus && (
        <div className={`text-sm rounded-md px-3 py-2 border ${imageStatus.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {imageStatus.msg}
        </div>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Basics</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Service Name *</Label><Input value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="Web Application Penetration Testing" /></div>
            <div className="space-y-1"><Label>Service Type *</Label><Input value={value.service_type} onChange={(e) => set("service_type", e.target.value)} placeholder="WAPT / VAPT / ISO / SOC" /></div>
          </div>
          <div className="space-y-1"><Label>Short Code</Label><Input value={value.short_code} onChange={(e) => set("short_code", e.target.value)} placeholder="WAPT" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Approach & Methodology *</CardTitle></CardHeader>
        <CardContent>
          <RichTextEditor
            value={approachToHtml(value.approach_methodology)}
            onChange={(html) => set("approach_methodology", [{ name: "", description: html }])}
            placeholder="Describe your approach and methodology — use headings or bullet lists as needed"
          />
          {addImageButton(() => {
            void addImageToHtml(
              approachToHtml(value.approach_methodology),
              (nextHtml) => set("approach_methodology", [{ name: "", description: nextHtml }]),
            );
          }, approachToHtml(value.approach_methodology))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
        <Switch checked={showOptional} onCheckedChange={setShowOptional} />
        <span className="text-sm font-medium">Add more sections (executive summary template, objectives, benefits, deliverables, prerequisites, custom sections)</span>
      </div>

      {showOptional && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Executive Summary Template</CardTitle></CardHeader>
            <CardContent>
              <RichTextEditor value={value.executive_summary_template} onChange={(html) => set("executive_summary_template", html)} placeholder="Use {{client_name}}, {{client_summary}}, {{scope}}" />
              <p className="text-xs text-muted-foreground mt-2">Supports placeholders: <code>{"{{client_name}}"}</code>, <code>{"{{client_summary}}"}</code>, <code>{"{{scope}}"}</code></p>
              {addImageButton(() => {
                void addImageToHtml(value.executive_summary_template, (nextHtml) => set("executive_summary_template", nextHtml));
              }, value.executive_summary_template)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Project Objectives</CardTitle></CardHeader>
            <CardContent>
              <RichTextEditor
                value={listFieldHtml(value.project_objectives)}
                onChange={(html) => set("project_objectives", setListFieldHtml(html))}
                placeholder="List project objectives — use the bullet list button in the toolbar"
              />
              {addImageButton(() => {
                void addImageToHtml(
                  listFieldHtml(value.project_objectives),
                  (nextHtml) => set("project_objectives", setListFieldHtml(nextHtml)),
                );
              }, listFieldHtml(value.project_objectives))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Expected Benefits</CardTitle></CardHeader>
            <CardContent>
              <RichTextEditor
                value={benefitsToHtml(value.expected_benefits)}
                onChange={(html) => set("expected_benefits", setListFieldHtml(html))}
                placeholder="List expected benefits — use the bullet list button in the toolbar"
              />
              {addImageButton(() => {
                void addImageToHtml(
                  benefitsToHtml(value.expected_benefits),
                  (nextHtml) => set("expected_benefits", setListFieldHtml(nextHtml)),
                );
              }, benefitsToHtml(value.expected_benefits))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Deliverables</CardTitle></CardHeader>
            <CardContent>
              <RichTextEditor
                value={listFieldHtml(value.deliverables)}
                onChange={(html) => set("deliverables", setListFieldHtml(html))}
                placeholder="List deliverables — use the bullet list button in the toolbar"
              />
              {addImageButton(() => {
                void addImageToHtml(
                  listFieldHtml(value.deliverables),
                  (nextHtml) => set("deliverables", setListFieldHtml(nextHtml)),
                );
              }, listFieldHtml(value.deliverables))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Prerequisites</CardTitle></CardHeader>
            <CardContent>
              <RichTextEditor
                value={listFieldHtml(value.prerequisites)}
                onChange={(html) => set("prerequisites", setListFieldHtml(html))}
                placeholder="List prerequisites — use headings or bullet lists as needed (e.g. From Prime Infoserv, From Client)"
              />
              {addImageButton(() => {
                void addImageToHtml(
                  listFieldHtml(value.prerequisites),
                  (nextHtml) => set("prerequisites", setListFieldHtml(nextHtml)),
                );
              }, listFieldHtml(value.prerequisites))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Custom Sections</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {value.extra_sections.map((sec, i) => (
                <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Input
                      value={sec.title}
                      onChange={(e) => set("extra_sections", value.extra_sections.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                      placeholder="Section title"
                    />
                    <Button type="button" variant="ghost" size="icon" className="ml-2 shrink-0" onClick={() => set("extra_sections", value.extra_sections.filter((_, j) => j !== i))}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </Button>
                  </div>
                  <RichTextEditor
                    value={sec.content}
                    onChange={(html) => set("extra_sections", value.extra_sections.map((x, j) => j === i ? { ...x, content: html } : x))}
                    placeholder="Section content…"
                  />
                  {addImageButton(() => {
                    void addImageToHtml(
                      sec.content,
                      (nextHtml) => set("extra_sections", value.extra_sections.map((x, j) => j === i ? { ...x, content: nextHtml } : x)),
                    );
                  }, sec.content)}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => set("extra_sections", [...value.extra_sections, { title: "", content: "" }])}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add section
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
