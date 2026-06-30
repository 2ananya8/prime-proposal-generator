import { RichTextEditor } from "@/components/RichTextEditor";
import { ProposalRichText } from "@/components/ProposalRichText";
import { Label } from "@/components/ui/label";
import { plainTextField } from "@/lib/html-content";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function TwoPageEngagementScopeEditor({ value, onChange, disabled }: Props) {
  if (disabled) {
    return (
      <div className="space-y-1">
        <Label>Engagement scope</Label>
        <div className="rounded-md border p-3 min-h-[80px]">
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
    <div className="space-y-1">
      <Label>Engagement scope</Label>
      <RichTextEditor
        value={value}
        onChange={onChange}
        className="min-h-[140px]"
        placeholder="Describe the engagement scope"
      />
    </div>
  );
}
