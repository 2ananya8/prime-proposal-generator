import {
  buildCommercialsTableRows,
  COMMERCIALS_TABLE_HEADERS,
} from "@/lib/commercials-table";
import type { ProposalPreviewData } from "@/lib/proposal-preview";

const ACCENT = "#D5E8F0";

type CommercialsTableProps = {
  commercials: ProposalPreviewData["commercials"];
  className?: string;
  cellClassName?: string;
};

export function CommercialsTable({
  commercials,
  className = "w-full text-[13px] border-collapse",
  cellClassName = "px-3 py-2 border border-gray-300 align-top",
}: CommercialsTableProps) {
  const rows = buildCommercialsTableRows(commercials);

  return (
    <div className="overflow-x-auto rounded border border-gray-300">
      <table className={className}>
        <thead>
          <tr style={{ backgroundColor: ACCENT }}>
            {COMMERCIALS_TABLE_HEADERS.map((header) => (
              <th key={header} className={`text-left font-semibold ${cellClassName}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.kind === "line") {
              return (
                <tr key={i} className={i % 2 === 1 ? "bg-gray-50" : undefined}>
                  <td className={cellClassName}>{row.description || "—"}</td>
                  <td className={cellClassName}>{row.qty || "—"}</td>
                  <td className={cellClassName}>{row.rate || "—"}</td>
                  <td className={cellClassName}>{row.amount || "—"}</td>
                </tr>
              );
            }

            return (
              <tr key={i}>
                <td
                  colSpan={3}
                  className={`${cellClassName} text-left ${row.bold ? "font-semibold" : "font-medium"}`}
                >
                  {row.label}
                </td>
                <td className={`${cellClassName} ${row.bold ? "font-semibold" : ""}`}>{row.amount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
