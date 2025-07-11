import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

export const NotesCard = ({ onRemove }: { onRemove?: () => void }) => {
  const { notes, currentUser } = useAppContext();

  const userNotes = notes
    .filter(note => note.userId === currentUser?.id && !note.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <DashboardCard
      title="My Recent Notes"
      icon={<FileText className="h-4 w-4" />}
      onRemove={onRemove}
    >
      {userNotes.length > 0 ? (
        <div className="space-y-2">
          {userNotes.slice(0, 4).map((note) => (
            <div key={note.id} className="p-2 bg-muted rounded-md">
              <p className="text-sm font-medium truncate">{note.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(note.updatedAt), "MMM dd")}
              </p>
            </div>
          ))}
          {userNotes.length > 4 && (
            <p className="text-xs text-muted-foreground">
              +{userNotes.length - 4} more notes
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No notes yet</p>
      )}
    </DashboardCard>
  );
};