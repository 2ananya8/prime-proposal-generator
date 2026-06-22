import {
  buildCommercialsTableRows,
  COMMERCIALS_TABLE_HEADERS,
} from "@/lib/commercials-table";
import type { ProposalPreviewData } from "@/lib/proposal-preview";
import {
  PROPOSAL_TABLE_BODY_CELL_CLASS,
  PROPOSAL_TABLE_CLASS,
  PROPOSAL_TABLE_HEADER_CELL_CLASS,
  PROPOSAL_TABLE_WRAPPER_CLASS,
} from "@/lib/rich-html-table";

type CommercialsTableProps = {
  commercials: ProposalPreviewData["commercials"];
  className?: string;
  cellClassName?: string;
};

export function CommercialsTable({
  commercials,
  className = PROPOSAL_TABLE_CLASS,
  cellClassName = PROPOSAL_TABLE_BODY_CELL_CLASS,
}: CommercialsTableProps) {
  const rows = buildCommercialsTableRows(commercials);

  return (
    <div className={PROPOSAL_TABLE_WRAPPER_CLASS}>
      <table className={className}>
        <thead>
          <tr>
            {COMMERCIALS_TABLE_HEADERS.map((header) => (
              <th key={header} className={PROPOSAL_TABLE_HEADER_CELL_CLASS}>
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
