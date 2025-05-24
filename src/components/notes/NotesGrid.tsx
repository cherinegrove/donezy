
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { Note } from "@/types";
import { NoteCard } from "./NoteCard";
import { EditNoteDialog } from "./EditNoteDialog";

export function NotesGrid() {
  const { notes } = useAppContext();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setEditDialogOpen(true);
  };

  // Filter out archived notes for main view
  const activeNotes = notes.filter(note => !note.archived);

  if (activeNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No notes yet</h3>
        <p className="text-sm text-muted-foreground">Create your first note to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {activeNotes.map((note) => (
          <NoteCard key={note.id} note={note} onEdit={handleEditNote} />
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
