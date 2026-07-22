import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon, Bold, Italic, List, ListOrdered, Smile } from 'lucide-react';
import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CommentEditorProps {
  content: string;
  onChange: (content: string) => void;
  onPaste?: (e: ClipboardEvent) => void;
  placeholder?: string;
  users?: Array<{ id: string; name: string }>;
  onMentionQuery?: (query: string) => void;
}

export interface CommentEditorRef {
  focus: () => void;
  getHTML: () => string;
  getText: () => string;
  clearContent: () => void;
  insertMention: (user: { id: string; name: string }) => void;
}

export const CommentEditor = forwardRef<CommentEditorRef, CommentEditorProps>(
  ({ content, onChange, onPaste, placeholder = "Add a comment..." }, ref) => {
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

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

    const handleEmojiClick = (emoji: string) => {
      if (editor) {
        editor.chain().focus().insertContent(emoji).run();
      }
      setShowEmojiPicker(false);
    };

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          bulletList: {
            HTMLAttributes: {
              class: 'list-disc list-inside ml-4',
            },
          },
          orderedList: {
            HTMLAttributes: {
              class: 'list-decimal list-inside ml-4',
            },
          },
          listItem: {
            HTMLAttributes: {
              class: 'mb-1',
            },
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-500 underline hover:text-blue-600 cursor-pointer',
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
          },
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm dark:prose-invert max-w-none min-h-[80px] p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 break-words [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4',
        },
        handlePaste: (view, event) => {
          // Check for images in clipboard
          const items = event.clipboardData?.items;
          if (items) {
            for (const item of Array.from(items)) {
              if (item.type.startsWith('image/')) {
                // Let the parent handle image paste
                if (onPaste) {
                  onPaste(event as unknown as ClipboardEvent);
                }
                return true;
              }
            }
          }
          return false;
        },
      },
    });

    useImperativeHandle(ref, () => ({
      focus: () => editor?.chain().focus().run(),
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      clearContent: () => editor?.commands.clearContent(),
      insertMention: (user: { id: string; name: string }) => {
        if (!editor) return;
        
        // Get current position and text
        const { from } = editor.state.selection;
        const textBefore = editor.state.doc.textBetween(0, from, '\n');
        const lastAtIndex = textBefore.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
          // Delete from @ to cursor and insert the mention
          const firstName = user.name.split(' ')[0];
          editor
            .chain()
            .focus()
            .deleteRange({ from: lastAtIndex, to: from })
            .insertContent(`@${firstName} `)
            .run();
        }
      },
    }));

    useEffect(() => {
      if (editor && content === '' && editor.getHTML() !== '<p></p>') {
        editor.commands.clearContent();
      }
    }, [content, editor]);

    if (!editor) {
      return null;
    }

    const addLink = () => {
      if (linkUrl) {
        const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
        editor.chain().focus().setLink({ href: url }).run();
        setLinkUrl('');
        setShowLinkInput(false);
      }
    };

    const removeLink = () => {
      editor.chain().focus().unsetLink().run();
      setShowLinkInput(false);
    };

    const hasSelection = editor.state.selection.from !== editor.state.selection.to;

    const commonEmojis = ["👍", "❤️", "😄", "👀", "🙏", "✨", "🚀", "💯", "🤔", "😅", "🎉", "📝"];

    return (
      <div className="border rounded-md bg-background">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/30">
          <Button
            type="button"
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
            className="h-7 px-2"
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
            className="h-7 px-2"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            type="button"
            variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
            className="h-7 px-2"
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
            className="h-7 px-2"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('link') ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                title={hasSelection ? "Add link to selected text" : "Select text first to add a link"}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {hasSelection ? "Add link to selected text:" : "Select text first, then add a link"}
                </p>
                <Input
                  placeholder="Enter URL (e.g., https://example.com)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addLink} disabled={!linkUrl.trim() || !hasSelection}>
                    Add Link
                  </Button>
                  {editor.isActive('link') && (
                    <Button size="sm" variant="outline" onClick={removeLink}>
                      Remove Link
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="relative">
            <Button
              type="button"
              variant={showEmojiPicker ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add Emoji"
              className="h-7 px-2"
            >
              <Smile className="h-4 w-4" />
            </Button>

            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute top-10 -right-2 z-50 bg-background border border-input rounded-lg p-3 shadow-lg w-48"
              >
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-xl hover:bg-muted p-1 rounded transition text-center"
                      type="button"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">or type in editor</p>
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
        
        {!editor.getText() && (
          <div className="absolute top-[45px] left-3 text-muted-foreground pointer-events-none text-sm">
            {placeholder}
          </div>
        )}
      </div>
    );
  }
);

CommentEditor.displayName = 'CommentEditor';
