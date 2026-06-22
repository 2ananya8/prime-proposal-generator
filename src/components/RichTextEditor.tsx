import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { RICH_TEXT_TABLE_CLASS } from "@/lib/rich-html-table";
import {
  Columns,
  Columns2,
  Plus,
  Rows,
  Table as TableIcon,
  Trash2,
} from "lucide-react";

const TOOLBAR_BTN = "p-1 rounded hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const ACTIVE = "bg-muted text-foreground";

type Props = {
  value: string; // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

export function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Enter content…" }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate({ editor: ed }) {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value ?? "");
    }
  }, [value, editor]);

  if (!editor) return null;

  const inTable = editor.isActive("table");

  const btn = (active: boolean, action: () => void, title: string, children: React.ReactNode, disabled = false) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) action();
      }}
      className={cn(TOOLBAR_BTN, active && ACTIVE)}
    >
      {children}
    </button>
  );

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b bg-muted/30 text-sm">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold", <b>B</b>)}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic", <i>I</i>)}
        {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "Underline", <u>U</u>)}

        <span className="w-px h-4 bg-border mx-1" />

        {btn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), "Align left",
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>)}
        {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "Center",
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>)}
        {btn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), "Align right",
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>)}
        {btn(editor.isActive({ textAlign: "justify" }), () => editor.chain().focus().setTextAlign("justify").run(), "Justify",
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>)}

        <span className="w-px h-4 bg-border mx-1" />

        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Bullet list",
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>)}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Numbered list",
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" fontSize="7" fill="currentColor" stroke="none">1.</text><text x="2" y="14" fontSize="7" fill="currentColor" stroke="none">2.</text><text x="2" y="20" fontSize="7" fill="currentColor" stroke="none">3.</text></svg>)}

        <span className="w-px h-4 bg-border mx-1" />

        <select
          className="text-xs bg-transparent border border-border rounded px-1 py-0.5 cursor-pointer"
          value={
            editor.isActive("heading", { level: 1 }) ? "h1" :
            editor.isActive("heading", { level: 2 }) ? "h2" :
            editor.isActive("heading", { level: 3 }) ? "h3" : "p"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <span className="w-px h-4 bg-border mx-1" />

        {btn(inTable, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), "Insert table", <TableIcon className="h-3.5 w-3.5" />)}
        {btn(false, () => editor.chain().focus().addRowAfter().run(), "Add row below", <Plus className="h-3.5 w-3.5" />, !inTable)}
        {btn(false, () => editor.chain().focus().deleteRow().run(), "Delete row", <Rows className="h-3.5 w-3.5" />, !inTable)}
        {btn(false, () => editor.chain().focus().addColumnAfter().run(), "Add column right", <Columns2 className="h-3.5 w-3.5" />, !inTable)}
        {btn(false, () => editor.chain().focus().deleteColumn().run(), "Delete column", <Columns className="h-3.5 w-3.5" />, !inTable)}
        {btn(false, () => editor.chain().focus().deleteTable().run(), "Delete table", <Trash2 className="h-3.5 w-3.5" />, !inTable)}

        <span className="w-px h-4 bg-border mx-1" />

        {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), "Inline code",
          <span className="font-mono text-xs">&lt;&gt;</span>)}
      </div>

      <EditorContent
        editor={editor}
        className={cn(
          "rich-text-editor p-3 min-h-[120px] text-sm leading-relaxed focus-within:outline-none",
          RICH_TEXT_TABLE_CLASS,
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[96px]",
          "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-2",
          "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-2",
          "[&_.ProseMirror_li]:list-item [&_.ProseMirror_li]:my-0.5",
          "[&_.ProseMirror_li_p]:my-0",
          "[&_.ProseMirror_ul_ul]:list-[circle] [&_.ProseMirror_ol_ol]:list-[lower-alpha]",
          "[&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-2",
          "[&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-2",
          "[&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:my-1",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          "[&_.ProseMirror_table]:table-fixed",
          "[&_.ProseMirror_selectedCell]:outline [&_.ProseMirror_selectedCell]:outline-2 [&_.ProseMirror_selectedCell]:outline-primary/40",
        )}
      />
    </div>
  );
}
