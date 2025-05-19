import { useState, useRef, useEffect } from "react";
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
  const [currentPosition, setCurrentPosition] = useState(note.position);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Update the card position when the note position changes from props
  useEffect(() => {
    setCurrentPosition(note.position);
  }, [note.position]);
  
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
  
  // Improved drag handling for smoother response
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't allow dragging when editing or clicking on buttons
    if (isEditing || 
        e.target instanceof HTMLButtonElement || 
        (e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('.dropdown-menu')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    
    // Calculate offset of mouse position relative to the note card
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Apply styles immediately for better visual feedback
    if (nodeRef.current) {
      nodeRef.current.style.zIndex = '50';
      nodeRef.current.style.opacity = '0.8';
      nodeRef.current.style.transition = 'none'; // Remove transition during drag for instant response
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate new position based on mouse coordinates and offset
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      
      // Update the current position state
      setCurrentPosition({ x: newX, y: newY });
      
      if (nodeRef.current) {
        // Apply the transform directly for immediate visual feedback
        nodeRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      
      if (nodeRef.current) {
        nodeRef.current.style.zIndex = '';
        nodeRef.current.style.opacity = '';
        nodeRef.current.style.transition = ''; // Restore transition
      }
      
      // Only update position in the context if it has changed
      if (currentPosition.x !== note.position.x || currentPosition.y !== note.position.y) {
        onMove(note.id, currentPosition);
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  return (
    <Card 
      ref={nodeRef}
      className={cn(
        "w-[250px] shadow-md",
        note.color,
        isDragging ? "z-50 opacity-80 shadow-lg cursor-grabbing" : "z-10 cursor-grab hover:shadow-lg",
        note.archived ? "opacity-60" : "",
        "absolute select-none"
      )}
      style={{ 
        transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`,
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease, opacity 0.2s ease',
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
                    
                    {NOTE_COLORS.map((color) => (
                      <DropdownMenuItem 
                        key={color.value}
                        onClick={() => handleChangeColor(color.value)}
                        className="dropdown-menu"
                      >
                        <div className={`h-4 w-4 rounded-full mr-2 ${color.value}`} />
                        {color.label}
                      </DropdownMenuItem>
                    ))}
                    
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
