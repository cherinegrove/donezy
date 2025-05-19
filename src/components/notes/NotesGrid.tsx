
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Note } from "@/types";
import { NoteCard } from "./NoteCard";
import { Button } from "@/components/ui/button";
import { Archive, Plus } from "lucide-react";
import { CreateNoteDialog } from "./CreateNoteDialog";

export function NotesGrid() {
  const { currentUser, getNotesByUser } = useAppContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      setNotes(getNotesByUser(currentUser.id, showArchived));
    }
  }, [currentUser, getNotesByUser, showArchived]);
  
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {notes.map((note) => (
            <NoteCard 
              key={note.id} 
              note={note}
            />
          ))}
        </div>
      )}
      
      <CreateNoteDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </div>
  );
}
