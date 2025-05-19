
import { useState, useRef } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Bold, Italic, Underline, List, ListOrdered, SquareDashed 
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NOTE_COLORS = [
  { value: "bg-yellow-100", label: "Yellow", border: "border-yellow-200" },
  { value: "bg-blue-100", label: "Blue", border: "border-blue-200" },
  { value: "bg-green-100", label: "Green", border: "border-green-200" },
  { value: "bg-pink-100", label: "Pink", border: "border-pink-200" },
  { value: "bg-purple-100", label: "Purple", border: "border-purple-200" },
  { value: "bg-orange-100", label: "Orange", border: "border-orange-200" },
];

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNoteDialog({ open, onOpenChange }: CreateNoteDialogProps) {
  const { addNote, currentUser } = useAppContext();
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-yellow-100");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleCreateNote = () => {
    if (!content.trim()) {
      toast({
        title: "Cannot create empty note",
        description: "Please add some content to your note",
        variant: "destructive",
      });
      return;
    }
    
    if (currentUser) {
      addNote({
        userId: currentUser.id,
        content,
        color: selectedColor,
        position: { x: 0, y: 0 },
        archived: false,
      });
      
      toast({
        title: "Note created",
        description: "Your note has been created successfully",
      });
      
      // Reset form and close dialog
      setContent("");
      setSelectedColor("bg-yellow-100");
      onOpenChange(false);
    }
  };
  
  // Text formatting functions
  const applyFormatting = (format: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    let formattedText = '';
    let cursorOffset = 0;
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        cursorOffset = 2;
        break;
      case 'bullet':
        formattedText = selectedText
          .split('\n')
          .map(line => line.trim() ? `- ${line}` : line)
          .join('\n');
        cursorOffset = 2;
        break;
      case 'number':
        formattedText = selectedText
          .split('\n')
          .map((line, i) => line.trim() ? `${i + 1}. ${line}` : line)
          .join('\n');
        cursorOffset = 3;
        break;
      case 'checkbox':
        formattedText = selectedText
          .split('\n')
          .map(line => line.trim() ? `[ ] ${line}` : line)
          .join('\n');
        cursorOffset = 4;
        break;
    }
    
    const newContent = 
      content.substring(0, start) + 
      formattedText + 
      content.substring(end);
    
    setContent(newContent);
    
    // After formatting is applied, reset selection to after the formatted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = start + formattedText.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-background/70 p-1 rounded flex items-center justify-between mb-2">
            <TooltipProvider>
              <div className="flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => applyFormatting('bold')}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bold</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => applyFormatting('italic')}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Italic</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => applyFormatting('underline')}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Underline</TooltipContent>
                </Tooltip>
              </div>
            
              <div className="flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => applyFormatting('bullet')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bullet List</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => applyFormatting('number')}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Numbered List</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => applyFormatting('checkbox')}
                    >
                      <SquareDashed className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Checkbox</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
          
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your note here..."
            className="min-h-[150px] resize-none"
          />
          
          <div>
            <Label className="mb-2 block">Choose a color</Label>
            <RadioGroup 
              value={selectedColor} 
              onValueChange={setSelectedColor}
              className="flex flex-wrap gap-2"
            >
              {NOTE_COLORS.map((color) => (
                <div key={color.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={color.value}
                    id={color.value}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={color.value}
                    className={`h-8 w-8 rounded-full cursor-pointer flex items-center justify-center ${color.value} ${color.border} ${selectedColor === color.value ? 'ring-2 ring-primary' : ''}`}
                  />
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateNote}>
            Create Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
