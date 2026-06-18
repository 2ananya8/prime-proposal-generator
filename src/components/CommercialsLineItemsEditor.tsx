import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
  EMPTY_COMMERCIAL_LINE_ITEM,
  updateCommercialLineItem,
  type CommercialLineItem,
  type CommercialLineItemField,
} from "@/lib/commercials-line-item";

type CommercialsLineItemsEditorProps = {
  lineItems: CommercialLineItem[];
  onChange: (items: CommercialLineItem[]) => void;
};

export function CommercialsLineItemsEditor({ lineItems, onChange }: CommercialsLineItemsEditorProps) {
  const updateLine = (index: number, patch: Partial<CommercialLineItem>) => {
    onChange(lineItems.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const updateNumeric = (index: number, field: CommercialLineItemField, value: string) => {
    const parsed = value === "" ? 0 : Number(value);
    onChange(
      lineItems.map((item, i) =>
        i === index ? updateCommercialLineItem(item, field, parsed) : item,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-1">Description</th>
            <th className="pb-1 w-16">Qty</th>
            <th className="pb-1 w-28">Rate (INR)</th>
            <th className="pb-1 w-28 text-right">Amount (INR)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li, i) => (
            <tr key={i}>
              <td className="pr-2 py-1">
                <Input
                  value={li.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                />
              </td>
              <td className="pr-2">
                <Input
                  type="number"
                  value={li.qty}
                  onChange={(e) => updateNumeric(i, "qty", e.target.value)}
                />
              </td>
              <td className="pr-2">
                <Input
                  type="number"
                  value={li.rate}
                  onChange={(e) => updateNumeric(i, "rate", e.target.value)}
                />
              </td>
              <td className="pr-2">
                <Input
                  type="number"
                  className="text-right"
                  value={li.amount}
                  onChange={(e) => updateNumeric(i, "amount", e.target.value)}
                />
              </td>
              <td>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(lineItems.filter((_, j) => j !== i))}
                >
                  ×
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...lineItems, { ...EMPTY_COMMERCIAL_LINE_ITEM }])}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add line
      </Button>
    </div>
  );
}
