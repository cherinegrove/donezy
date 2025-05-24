
import { useAppContext } from "@/contexts/AppContext";
import { NotesGrid } from "@/components/notes/NotesGrid";

export default function Notes() {
  const { currentUser } = useAppContext();

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
      <NotesGrid />
    </div>
  );
}
