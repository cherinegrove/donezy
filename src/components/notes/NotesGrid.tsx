
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Note } from "@/types";
import { NoteCard } from "./NoteCard";
import { Button } from "@/components/ui/button";
import { Archive, Plus, Layers, LayoutGrid } from "lucide-react";
import { CreateNoteDialog } from "./CreateNoteDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function NotesGrid() {
  const { currentUser, getNotesByUser, updateNotePosition } = useAppContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "stacked">("stacked");
  
  useEffect(() => {
    if (currentUser) {
      setNotes(getNotesByUser(currentUser.id, showArchived));
    }
  }, [currentUser, getNotesByUser, showArchived]);
  
  const handleNoteMove = (id: string, position: { x: number; y: number }) => {
    updateNotePosition(id, position);
  };
  
  const calculatePosition = (index: number): { x: number; y: number } => {
    if (viewMode === "grid") {
      // Create a grid pattern
      const columns = Math.floor(window.innerWidth / 280);
      const col = index % columns;
      const row = Math.floor(index / columns);
      return { 
        x: col * 270,
        y: row * 220
      };
    } else {
      // Create a stacked pattern with slight offset
      return { 
        x: 20 + (index % 3) * 10,
        y: 20 + (index % 5) * 10
      };
    }
  };
  
  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Notes</h1>
        <div className="flex items-center gap-4">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "grid" | "stacked")}>
            <ToggleGroupItem value="stacked" aria-label="Stacked view">
              <Layers className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
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
