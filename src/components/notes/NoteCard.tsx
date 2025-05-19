import { useState, useRef } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Note } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Archive, Edit, Trash, Check, X, SquarePen, 
  Bold, Italic, Underline, List, ListOrdered, SquareDashed
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NOTE_COLORS = [
  { value: "bg-yellow-100", label: "Yellow" },
  { value: "bg-blue-100", label: "Blue" },
  { value: "bg-green-100", label: "Green" },
  { value: "bg-pink-100", label: "Pink" },
  { value: "bg-purple-100", label: "Purple" },
  { value: "bg-orange-100", label: "Orange" },
];

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const { updateNote, archiveNote, unarchiveNote, deleteNote } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(note.content);
    // Focus the textarea after a brief delay to allow it to render
    setTimeout(() => textareaRef.current?.focus(), 50);
  };
  
  const handleSave = () => {
    if (editedContent.trim() !== "") {
      updateNote(note.id, { 
        content: editedContent,
        updatedAt: new Date().toISOString(),
      });
    }
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(note.content);
  };
  
  const handleArchive = () => {
    if (note.archived) {
      unarchiveNote(note.id);
    } else {
      archiveNote(note.id);
    }
  };
  
  const handleChangeColor = (color: string) => {
    updateNote(note.id, { color });
  };

  // Text formatting functions
  const applyFormatting = (format: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = editedContent.substring(start, end);
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
      editedContent.substring(0, start) + 
      formattedText + 
      editedContent.substring(end);
    
    setEditedContent(newContent);
    
    // After formatting is applied, reset selection to after the formatted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = start + formattedText.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };
  
  // Parse content with markdown-like formatting
  const renderFormattedContent = (text: string) => {
    // Replace markdown syntax with HTML
    let formattedText = text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Underline
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Checkboxes (unchecked)
      .replace(/\[ \] (.*?)(?:\n|$)/g, '<div class="flex items-start"><input type="checkbox" disabled class="mt-1 mr-2" /> <span>$1</span></div>')
      // Checkboxes (checked)
      .replace(/\[x\] (.*?)(?:\n|$)/g, '<div class="flex items-start"><input type="checkbox" checked disabled class="mt-1 mr-2" /> <span>$1</span></div>')
      // Bullet lists
      .replace(/- (.*?)(?:\n|$)/g, '<li class="ml-5">$1</li>')
      // Numbered lists
      .replace(/(\d+)\. (.*?)(?:\n|$)/g, '<li value="$1" class="ml-5">$2</li>')
      // Wrap lists in ul/ol tags
      .replace(/(<li class="ml-5">.*?<\/li>)+/g, '<ul class="list-disc my-2">$&</ul>')
      .replace(/(<li value="\d+" class="ml-5">.*?<\/li>)+/g, '<ol class="list-decimal my-2">$&</ol>');
      
    return { __html: formattedText };
  };
  
  return (
    <Card 
      className={cn(
        "w-full h-full shadow-md",
        note.color,
        note.archived ? "opacity-60" : "",
      )}
    >
      <CardContent className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2 bg-background/50 p-1 rounded">
              <TooltipProvider>
                <div className="flex space-x-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
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
                        className="h-7 w-7"
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
                        className="h-7 w-7"
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
                        className="h-7 w-7"
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
                        className="h-7 w-7"
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
                        className="h-7 w-7"
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
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[100px] resize-none bg-transparent border-primary/20"
            />
            
            <div className="flex justify-end space-x-2">
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div 
              className="whitespace-pre-wrap break-words min-h-[100px]"
              dangerouslySetInnerHTML={renderFormattedContent(note.content)}
            />
            <div className="flex items-center justify-between pt-2 border-t border-primary/10">
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={handleEdit}
                >
                  <SquarePen className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 dropdown-menu"
                    >
                      <span className="sr-only">Open menu</span>
                      <div className="h-3 w-3 rounded-full bg-primary/80" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 dropdown-menu">
                    <DropdownMenuItem onClick={handleArchive} className="dropdown-menu">
                      <Archive className="mr-2 h-4 w-4" />
                      {note.archived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem className="dropdown-menu font-medium">
                      Note Color
                    </DropdownMenuItem>
                    
                    <div className="grid grid-cols-3 gap-1 p-2 dropdown-menu">
                      {NOTE_COLORS.map((color) => (
                        <button
                          key={color.value}
                          className={cn(
                            "w-full h-6 rounded",
                            color.value,
                            note.color === color.value ? "ring-2 ring-primary" : ""
                          )}
                          onClick={() => handleChangeColor(color.value)}
                        />
                      ))}
                    </div>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive dropdown-menu"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
