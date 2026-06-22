import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { StringListEditor } from "@/components/ListEditor";
import type { ClientResearch } from "@/lib/client-research";

type Props = {
  research: ClientResearch;
  onChange: (research: ClientResearch) => void;
  onUseLogo?: (dataUrl: string) => void;
  clientLogo?: string | null;
};

export function ClientResearchForm({ research, onChange, onUseLogo, clientLogo }: Props) {
  const patch = (partial: Partial<ClientResearch>) => onChange({ ...research, ...partial });

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Company name</Label>
          <Input value={research.company_name} onChange={(e) => patch({ company_name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Website</Label>
          <Input
            value={research.website}
            onChange={(e) => patch({ website: e.target.value })}
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label>Industry</Label>
          <Input value={research.industry} onChange={(e) => patch({ industry: e.target.value })} placeholder="e.g. FinTech" />
        </div>
        <div className="space-y-1">
          <Label>Headquarters</Label>
          <Input value={research.hq} onChange={(e) => patch({ hq: e.target.value })} placeholder="City, Country" />
        </div>
        <div className="space-y-1">
          <Label>Company size</Label>
          <Input value={research.size} onChange={(e) => patch({ size: e.target.value })} placeholder="e.g. 500–1000 employees" />
        </div>
        <div className="space-y-1">
          <Label>Founded</Label>
          <Input value={research.founded} onChange={(e) => patch({ founded: e.target.value })} placeholder="e.g. 2012" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>About the company</Label>
        <RichTextEditor
          className="min-h-[140px]"
          value={research.about}
          onChange={(html) => patch({ about: html })}
          placeholder="Brief company overview used in the executive summary…"
        />
      </div>

      <div className="space-y-1">
        <Label>Key offerings / products</Label>
        <StringListEditor
          value={research.key_offerings}
          onChange={(v) => patch({ key_offerings: v })}
          placeholder="Product or service"
        />
      </div>

      {(research.logo_url || research.logo_data_url) && (
        <div className="rounded-md border p-3 space-y-2">
          <Label>Discovered logo</Label>
          <div className="flex items-center gap-4 flex-wrap">
            <img
              src={research.logo_data_url || research.logo_url || ""}
              alt={`${research.company_name} logo`}
              className="h-14 max-w-[200px] object-contain border rounded bg-white p-1"
            />
            {research.logo_data_url && onUseLogo && research.logo_data_url !== clientLogo && (
              <Button type="button" size="sm" variant="outline" onClick={() => onUseLogo(research.logo_data_url!)}>
                Use as client logo
              </Button>
            )}
            {clientLogo && research.logo_data_url === clientLogo && (
              <span className="text-xs text-emerald-700">Logo applied to proposal</span>
            )}
          </div>
          {research.logo_url && (
            <p className="text-xs text-muted-foreground truncate">Source: {research.logo_url}</p>
          )}
        </div>
      )}

      {research.sources.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          <span className="font-medium text-foreground">Sources</span>
          <ul className="list-disc pl-4">
            {research.sources.map((url) => (
              <li key={url} className="truncate">
                <a href={url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
