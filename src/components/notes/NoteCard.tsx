import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Archive, Delete, ArchiveRestore } from "lucide-react";
import { Note } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NoteCardProps {
  note: Note;
  onEdit?: (note: Note) => void;
  showArchived?: boolean;
}

const NOTE_COLORS = {
  yellow: "bg-yellow-100 border-yellow-200",
  blue: "bg-blue-100 border-blue-200", 
  green: "bg-green-100 border-green-200",
  pink: "bg-pink-100 border-pink-200",
  purple: "bg-purple-100 border-purple-200",
  orange: "bg-orange-100 border-orange-200",
};

export function NoteCard({ note, onEdit, showArchived = false }: NoteCardProps) {
  const { updateNote, deleteNote } = useAppContext();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    deleteNote(note.id);
    toast({
      title: "Note deleted",
      description: "The note has been successfully deleted.",
    });
    setShowDeleteDialog(false);
  };

  const handleArchive = () => {
    updateNote(note.id, { archived: true });
    toast({
      title: "Note archived",
      description: "The note has been archived.",
    });
  };

  const handleUnarchive = () => {
    updateNote(note.id, { archived: false });
    toast({
      title: "Note unarchived",
      description: "The note has been restored to your active notes.",
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(note);
    }
  };

  const handleCheckboxToggle = (lineIndex: number) => {
    const lines = note.content.split('\n');
    const line = lines[lineIndex];
    
    if (line.includes('☐')) {
      lines[lineIndex] = line.replace('☐', '☑');
    } else if (line.includes('☑')) {
      lines[lineIndex] = line.replace('☑', '☐');
    }
    
    const newContent = lines.join('\n');
    updateNote(note.id, { content: newContent });
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      // Handle checkboxes
      if (line.includes('☐') || line.includes('☑')) {
        const isChecked = line.includes('☑');
        const text = line.replace(/[☐☑]\s*/, '');
        return (
          <div key={index} className="flex items-center gap-2 mb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheckboxToggle(index);
              }}
              className="text-sm hover:bg-gray-200 rounded px-1 transition-colors"
            >
              <span className={`${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                {isChecked ? '☑' : '☐'}
              </span>
            </button>
            <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
              {text}
            </span>
          </div>
        );
      }
      
      // Handle bullet points
      if (line.trim().startsWith('•')) {
        const text = line.replace('•', '').trim();
        return (
          <div key={index} className="flex items-start gap-2 mb-1">
            <span className="text-sm mt-0.5">•</span>
            <span className="text-sm">{text}</span>
          </div>
        );
      }
      
      // Handle text formatting (bold, italic, underline)
      if (line.trim()) {
        let formattedLine = line;
        
        // Handle bold text **text**
        formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Handle italic text *text*
        formattedLine = formattedLine.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        
        // Handle underline text __text__
        formattedLine = formattedLine.replace(/__(.*?)__/g, '<u>$1</u>');
        
        return (
          <p 
            key={index} 
            className="text-sm mb-1"
            dangerouslySetInnerHTML={{ __html: formattedLine }}
          />
        );
      }
      
      return <br key={index} />;
    });
  };

  const colorClass = NOTE_COLORS[note.color as keyof typeof NOTE_COLORS] || NOTE_COLORS.yellow;

  return (
    <>
      <Card 
        className={`h-fit min-h-[200px] max-h-[300px] transform rotate-0 hover:rotate-1 transition-all duration-200 hover:shadow-lg cursor-pointer ${colorClass} border-2 ${showArchived ? 'opacity-75' : ''}`}
        style={{ transform: `rotate(${Math.random() * 4 - 2}deg)` }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-sm line-clamp-2 pr-2">
              {note.title || 'Untitled Note'}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-70 hover:opacity-100">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-3 w-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                {showArchived ? (
                  <DropdownMenuItem onClick={handleUnarchive}>
                    <ArchiveRestore className="h-3 w-3 mr-2" />
                    Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="h-3 w-3 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Delete className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-32 overflow-hidden">
            {renderContent(note.content)}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {new Date(note.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{note.title || 'this note'}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
