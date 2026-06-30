import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ProposalRichText } from "@/components/ProposalRichText";
import { plainTextField } from "@/lib/html-content";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onRegenerate: () => void;
  disabled?: boolean;
};

export function TwoPageLetterBodyEditor({ value, onChange, onRegenerate, disabled }: Props) {
  if (disabled) {
    return (
      <div className="space-y-1 border-t pt-4">
        <Label>Letter body</Label>
        <div className="rounded-md border p-3 min-h-[120px]">
          {plainTextField(value) ? (
            <ProposalRichText content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Letter body</Label>
        <Button type="button" variant="outline" size="sm" onClick={onRegenerate}>
          Regenerate from template
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Built from the fields above. Edit directly here, or regenerate after changing client or engagement details.
      </p>
      <RichTextEditor value={value} onChange={onChange} className="min-h-[280px]" />
    </div>
  );
}
