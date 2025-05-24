
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline } from "lucide-react";

interface TextFormattingToolbarProps {
  onFormat: (type: 'bold' | 'italic' | 'underline') => void;
}

export function TextFormattingToolbar({ onFormat }: TextFormattingToolbarProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          onFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          onFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          onFormat('underline');
          break;
      }
    }
  };

  // Add keyboard listeners when component mounts
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex gap-1 mb-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onFormat('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onFormat('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onFormat('underline')}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>
    </div>
  );
}
