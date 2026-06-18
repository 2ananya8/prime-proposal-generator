import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";

export function StringListEditor({ value, onChange, placeholder = "Add item", multiline = false }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; multiline?: boolean }) {
  const set = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)));
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex gap-2">
          {multiline ? <Textarea value={item} onChange={(e) => set(i, e.target.value)} className="min-h-[60px]" /> : <Input value={item} onChange={(e) => set(i, e.target.value)} placeholder={placeholder} />}
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, ""])}><Plus className="h-4 w-4 mr-1" />Add</Button>
    </div>
  );
}

export function ObjectListEditor<T extends Record<string, any>>({ value, onChange, fields, template }: { value: T[]; onChange: (v: T[]) => void; fields: { key: keyof T; label: string; textarea?: boolean }[]; template: T }) {
  const set = (i: number, key: keyof T, v: string) => onChange(value.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
  return (
    <div className="space-y-3">
      {value.map((item, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button></div>
          {fields.map((f) => (
            <div key={String(f.key)} className="space-y-1">
              <label className="text-xs font-medium">{f.label}</label>
              {f.textarea
                ? <Textarea value={(item[f.key] as string) ?? ""} onChange={(e) => set(i, f.key, e.target.value)} />
                : <Input value={(item[f.key] as string) ?? ""} onChange={(e) => set(i, f.key, e.target.value)} />}
            </div>
          ))}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { ...template }])}><Plus className="h-4 w-4 mr-1" />Add</Button>
    </div>
  );
}