import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  appendMilestone,
  formatMilestonePercentField,
  isMilestonePercentTotalOverMax,
  isMilestonePercentTotalValid,
  milestonePercentTotal,
  MILESTONE_PERCENT_MAX,
  updateMilestonePercent,
  type Milestone,
} from "@/lib/milestones";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

type MilestonesEditorProps = {
  value: Milestone[];
  onChange: (milestones: Milestone[]) => void;
};

export function MilestonesEditor({ value, onChange }: MilestonesEditorProps) {
  const total = milestonePercentTotal(value);
  const totalValid = isMilestonePercentTotalValid(value);
  const totalOverMax = isMilestonePercentTotalOverMax(value);

  const handlePercentChange = (index: number, raw: string) => {
    const prevTotal = milestonePercentTotal(value);
    const next = updateMilestonePercent(value, index, raw);
    onChange(next);
    const nextTotal = milestonePercentTotal(next);
    if (prevTotal <= MILESTONE_PERCENT_MAX && nextTotal > MILESTONE_PERCENT_MAX) {
      toast.error(milestoneTotalOverMaxMessage(nextTotal));
    }
  };

  return (
    <div className="space-y-3">
      {value.map((item, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Milestone</label>
            <Input
              value={item.label}
              onChange={(e) =>
                onChange(value.map((m, j) => (j === i ? { ...m, label: e.target.value } : m)))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">%</label>
            <Input
              type="text"
              inputMode="decimal"
              value={formatMilestonePercentField(item.percent)}
              onChange={(e) => handlePercentChange(i, e.target.value)}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(appendMilestone(value))}>
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
      <p
        className={cn(
          "text-sm font-medium",
          totalValid ? "text-green-600 dark:text-green-500" : "text-destructive",
        )}
      >
        Total: {total}%
        {totalOverMax
          ? ` — cannot be more than ${MILESTONE_PERCENT_MAX}%`
          : totalValid
            ? " — ready"
            : ` — must equal ${MILESTONE_PERCENT_MAX}%`}
      </p>
    </div>
  );
}

export function milestoneTotalErrorMessage(): string {
  return `Milestone percentages must add up to exactly ${MILESTONE_PERCENT_MAX}%`;
}

export function milestoneTotalOverMaxMessage(total: number): string {
  return `Total cannot be more than ${MILESTONE_PERCENT_MAX}% (currently ${total}%)`;
}
