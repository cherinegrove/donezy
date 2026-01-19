import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon } from 'lucide-react';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Link.configure({
          openOnClick: true,
          HTMLAttributes: {
            class: 'text-primary underline hover:text-primary/80 cursor-pointer',
          },
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none min-h-[80px] p-3 focus:outline-none break-words overflow-hidden [&_*]:break-words',
          style: 'word-break: break-word; overflow-wrap: anywhere;',
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

    return (
      <div className="border rounded-md bg-background">
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-1 border-b bg-muted/30">
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
          <span className="text-xs text-muted-foreground ml-2">
            Highlight text to add a link
          </span>
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
