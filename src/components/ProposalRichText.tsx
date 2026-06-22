import { looksLikeHtml, plainTextField } from "@/lib/html-content";
import { RICH_TEXT_TABLE_CLASS } from "@/lib/rich-html-table";

const richTextClassName =
  `[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_li]:my-0.5 ${RICH_TEXT_TABLE_CLASS}`;

export function ProposalRichText({
  content,
  className = "text-[13px] leading-relaxed text-gray-800",
}: {
  content: string;
  className?: string;
}) {
  if (!content.trim()) return null;
  if (looksLikeHtml(content)) {
    return (
      <div
        className={`${className} ${richTextClassName}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <p className={`${className} whitespace-pre-wrap`}>{plainTextField(content)}</p>;
}
