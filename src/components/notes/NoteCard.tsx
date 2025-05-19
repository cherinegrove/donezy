
import { useState, useRef } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Note } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Archive, Edit, Trash, Check, X, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  onMove: (id: string, position: { x: number; y: number }) => void;
}

export function NoteCard({ note, onMove }: NoteCardProps) {
  const { updateNote, archiveNote, unarchiveNote, deleteNote } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(note.content);
  const [isDragging, setIsDragging] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(note.content);
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
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (nodeRef.current && !isEditing) {
      setIsDragging(true);
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = note.position.x;
      const startTop = note.position.y;
      
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const newX = startLeft + (e.clientX - startX);
          const newY = startTop + (e.clientY - startY);
          
          if (nodeRef.current) {
            nodeRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
          }
        }
      };
      
      const handleMouseUp = (e: MouseEvent) => {
        setIsDragging(false);
        const finalX = startLeft + (e.clientX - startX);
        const finalY = startTop + (e.clientY - startY);
        onMove(note.id, { x: finalX, y: finalY });
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };
  
  return (
    <Card 
      ref={nodeRef}
      className={cn(
        "w-[250px] shadow-md transition-all duration-200",
        note.color,
        isDragging ? "z-50 opacity-80" : "z-10",
        note.archived ? "opacity-60" : "",
        "absolute cursor-move"
      )}
      style={{ 
        transform: `translate(${note.position.x}px, ${note.position.y}px)` 
      }}
      onMouseDown={handleMouseDown}
    >
      <CardContent className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[100px] resize-none bg-transparent border-primary/20"
              autoFocus
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
            <div className="whitespace-pre-wrap break-words min-h-[100px]">
              {note.content}
            </div>
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
                      className="h-7 w-7"
                    >
                      <span className="sr-only">Open menu</span>
                      <div className="h-3 w-3 rounded-full bg-primary/80" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={handleArchive}>
                      <Archive className="mr-2 h-4 w-4" />
                      {note.archived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                    
                    {NOTE_COLORS.map((color) => (
                      <DropdownMenuItem 
                        key={color.value}
                        onClick={() => handleChangeColor(color.value)}
                      >
                        <div className={`h-4 w-4 rounded-full mr-2 ${color.value}`} />
                        {color.label}
                      </DropdownMenuItem>
                    ))}
                    
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
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
