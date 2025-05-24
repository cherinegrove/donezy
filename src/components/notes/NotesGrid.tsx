import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Note } from "@/types";

interface NotesGridProps {
  userId: string;
}

export function NotesGrid({ userId }: NotesGridProps) {
  const { getNotesByUser } = useAppContext();
  const userNotes = getNotesByUser(userId);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {userNotes.map((note) => (
        <Card key={note.id} className="bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle>{note.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{note.content}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
