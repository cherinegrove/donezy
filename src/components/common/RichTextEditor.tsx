import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Smile } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import "./RichTextEditor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export function RichTextEditor({ value, onChange, placeholder = "Add a comment...", onSubmit }: RichTextEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: "list-disc list-inside" } },
        orderedList: { HTMLAttributes: { class: "list-decimal list-inside" } },
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-500 underline hover:text-blue-600 cursor-pointer" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert max-w-none w-full p-3 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-24",
      },
    },
  });

  // Handle emoji insertion
  const handleEmojiClick = (emoji: string) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji).run();
    }
    setShowEmojiPicker(false);
  };

  // Handle link insertion
  const insertLink = () => {
    const url = window.prompt("Enter URL:");
    if (url && editor) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEmojiPicker]);

  if (!editor) return null;

  const commonEmojis = ["👍", "❤️", "😄", "👀", "🙏", "✨", "🚀", "💯", "🤔", "😅", "🎉", "📝"];

  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap border-b pb-2">
        <Button
          size="sm"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="w-px bg-border" />

        <Button
          size="sm"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px bg-border" />

        <Button
          size="sm"
          variant="ghost"
          onClick={insertLink}
          title="Insert Link"
          className="h-8 w-8 p-0"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <div className="relative">
          <Button
            size="sm"
            variant={showEmojiPicker ? "secondary" : "ghost"}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Add Emoji"
            className="h-8 w-8 p-0"
          >
            <Smile className="h-4 w-4" />
          </Button>

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute top-10 right-0 z-50 bg-background border border-input rounded-lg p-3 shadow-lg"
            >
              <div className="grid grid-cols-6 gap-2">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-xl hover:bg-muted p-1 rounded transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Click any emoji or type directly</p>
            </div>
          )}
        </div>
      </div>

      <EditorContent editor={editor} />

      {onSubmit && (
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={onSubmit}
          >
            Post Comment
          </Button>
        </div>
      )}
    </div>
  );
}
