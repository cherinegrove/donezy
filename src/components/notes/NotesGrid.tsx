
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { Note } from "@/types";
import { NoteCard } from "./NoteCard";
import { EditNoteDialog } from "./EditNoteDialog";

interface NotesGridProps {
  showArchived?: boolean;
}

export function NotesGrid({ showArchived = false }: NotesGridProps) {
  const { notes } = useAppContext();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setEditDialogOpen(true);
  };

  // Filter notes based on archived status
  const filteredNotes = notes.filter(note => 
    showArchived ? note.archived : !note.archived
  );

  if (filteredNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          {showArchived ? 'No archived notes' : 'No notes yet'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {showArchived 
            ? 'Notes you archive will appear here.' 
            : 'Create your first note to get started!'
          }
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredNotes.map((note) => (
          <NoteCard 
            key={note.id} 
            note={note} 
            onEdit={handleEditNote}
            showArchived={showArchived}
          />
        ))}
      </div>
      
      {selectedNote && (
        <EditNoteDialog
          note={selectedNote}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedNote(null);
          }}
        />
      )}
    </>
  );
}
