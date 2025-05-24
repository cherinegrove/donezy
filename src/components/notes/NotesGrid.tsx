import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Note } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditNoteDialog } from "./EditNoteDialog";

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
}

function NoteCard({ note, onEdit }: NoteCardProps) {
  return (
    <Card className="bg-card text-card-foreground shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{note.title}</CardTitle>
          {note.color && (
            <Badge variant="secondary" style={{ backgroundColor: note.color }}>
              {note.color}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{note.content}</p>
      </CardContent>
      <div className="p-4 flex justify-end">
        <button
          onClick={() => onEdit(note)}
          className="text-blue-500 hover:text-blue-700 focus:outline-none"
        >
          Edit
        </button>
      </div>
    </Card>
  );
}

export function NotesGrid() {
  const { notes } = useAppContext();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setEditDialogOpen(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onEdit={handleEditNote} />
      ))}
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
    </div>
  );
}
