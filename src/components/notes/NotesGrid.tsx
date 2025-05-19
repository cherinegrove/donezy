
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Note } from "@/types";
import { NoteCard } from "./NoteCard";
import { Button } from "@/components/ui/button";
import { Archive, Plus } from "lucide-react";
import { CreateNoteDialog } from "./CreateNoteDialog";

export function NotesGrid() {
  const { currentUser, getNotesByUser, updateNotePosition } = useAppContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      setNotes(getNotesByUser(currentUser.id, showArchived));
    }
  }, [currentUser, getNotesByUser, showArchived]);
  
  const handleNoteMove = (id: string, position: { x: number; y: number }) => {
    updateNotePosition(id, position);
  };
  
  const calculatePosition = (index: number): { x: number; y: number } => {
    // Create a grid pattern that's responsive to the container width
    const containerWidth = window.innerWidth > 1200 ? 1100 : window.innerWidth - 100;
    const noteWidth = 270; // Note width + margin
    const columns = Math.max(1, Math.floor(containerWidth / noteWidth));
    
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    return { 
      x: col * noteWidth + 20,
      y: row * 220 + 20
    };
  };
  
  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Notes</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
          
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>
      
      <div 
        className="relative min-h-[calc(100vh-200px)]"
      >
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10">
            <p className="text-muted-foreground mb-4">You don't have any {showArchived ? "archived " : ""}notes yet.</p>
            {!showArchived && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Note
              </Button>
            )}
          </div>
        ) : (
          notes.map((note, index) => {
            // If the note doesn't have a position, calculate one
            const position = note.position.x === 0 && note.position.y === 0 
              ? calculatePosition(index)
              : note.position;
              
            const updatedNote = {...note, position};
            
            return (
              <NoteCard 
                key={note.id} 
                note={updatedNote}
                onMove={handleNoteMove}
              />
            );
          })
        )}
      </div>
      
      <CreateNoteDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </div>
  );
}
