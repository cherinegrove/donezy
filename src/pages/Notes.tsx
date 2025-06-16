
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { NotesGrid } from "@/components/notes/NotesGrid";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { Button } from "@/components/ui/button";
import { Plus, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Notes() {
  const { currentUser, notes } = useAppContext();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Notes</h1>
          <p className="text-muted-foreground">Please log in to view your notes.</p>
        </div>
      </div>
    );
  }

  const archivedCount = notes.filter(note => note.archived).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">
            {showArchived ? 'Archived Notes' : 'My Notes'}
          </h1>
          {archivedCount > 0 && (
            <Button
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Archived
              <Badge variant="secondary">{archivedCount}</Badge>
            </Button>
          )}
        </div>
        {!showArchived && (
          <Button 
            variant="default"
            onClick={() => setCreateDialogOpen(true)}
            className="bg-[var(--button-primary-color)] text-[var(--button-text-color)] hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Note
          </Button>
        )}
      </div>
      
      <NotesGrid showArchived={showArchived} />
      
      <CreateNoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
