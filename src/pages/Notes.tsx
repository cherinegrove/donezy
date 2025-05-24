
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { NotesGrid } from "@/components/notes/NotesGrid";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Notes() {
  const { currentUser } = useAppContext();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Notes</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Note
        </Button>
      </div>
      
      <NotesGrid />
      
      <CreateNoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
