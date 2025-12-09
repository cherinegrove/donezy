import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Edit, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextEditor } from "./RichTextEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProjectNote {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  timestamp: string;
  mentionedUserIds: string[];
}

interface ProjectNotesProps {
  projectId: string;
}

export function ProjectNotes({ projectId }: ProjectNotesProps) {
  const { toast } = useToast();
  const { users, currentUser } = useAppContext();
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ProjectNote | null>(null);
  const [editedNoteContent, setEditedNoteContent] = useState("");
  
  // This is a mock function - in a real app, this would come from useAppContext
  const getProjectNotes = (projectId: string): ProjectNote[] => {
    // Mock data - in a real implementation this would be fetched from context/API
    return [
      {
        id: "note1",
        projectId,
        userId: "user1",
        content: "Started on the first phase of the project. Need to discuss timeline with @user2",
        timestamp: new Date().toISOString(),
        mentionedUserIds: ["user2"]
      },
      {
        id: "note2", 
        projectId,
        userId: "user2",
        content: "Client requested changes to the original scope. @user1 please update the project brief.",
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        mentionedUserIds: ["user1"]
      }
    ];
  };
  
  // Mock function to add a note
  const addProjectNote = (note: Omit<ProjectNote, "id" | "timestamp">) => {
    console.log("Adding note:", note);
    toast({
      title: "Note Added",
      description: "Project note has been added successfully."
    });
    // In a real app, this would add the note to the state/database
  };
  
  // Mock function to update a note
  const updateProjectNote = (noteId: string, content: string) => {
    console.log("Updating note:", noteId, content);
    toast({
      title: "Note Updated",
      description: "Project note has been updated successfully."
    });
    // In a real app, this would update the note in the state/database
  };
  
  // Mock function to delete a note
  const deleteProjectNote = (noteId: string) => {
    console.log("Deleting note:", noteId);
    toast({
      title: "Note Deleted",
      description: "Project note has been deleted successfully."
    });
    // In a real app, this would delete the note from the state/database
  };
  
  const notes = getProjectNotes(projectId);
  
  const getUserById = (userId: string) => {
    return users.find(user => user.auth_user_id === userId) || {
      id: userId,
      name: "Unknown User",
      avatar: ""
    };
  };
  
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    // Parse mentions using @username pattern
    const mentionRegex = /@(\w+)/g;
    const mentions = [...newNote.matchAll(mentionRegex)].map(match => match[1]);
    
    // Find user IDs for the mentioned usernames
    const mentionedUserIds = mentions
      .map(username => users.find(user => user.name.toLowerCase() === username.toLowerCase())?.id)
      .filter(Boolean) as string[];
    
    if (currentUser) {
      addProjectNote({
        projectId,
        userId: currentUser.auth_user_id,
        content: newNote,
        mentionedUserIds
      });
      
      setNewNote("");
      setIsAddingNote(false);
    }
  };
  
  const handleEditNote = (note: ProjectNote) => {
    setSelectedNote(note);
    setEditedNoteContent(note.content);
    setIsEditingNote(true);
  };
  
  const handleDeleteNoteClick = (note: ProjectNote) => {
    setSelectedNote(note);
    setIsDeleteDialogOpen(true);
  };
  
  const handleSaveEdit = () => {
    if (selectedNote && editedNoteContent.trim()) {
      updateProjectNote(selectedNote.id, editedNoteContent);
      setSelectedNote(null);
      setEditedNoteContent("");
      setIsEditingNote(false);
    }
  };
  
  const handleDeleteConfirm = () => {
    if (selectedNote) {
      deleteProjectNote(selectedNote.id);
      setSelectedNote(null);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const formatNoteContent = (content: string) => {
    // Replace @mentions with styled spans
    return content.replace(/@(\w+)/g, (match, username) => {
      return `<span class="text-primary font-medium">@${username}</span>`;
    });
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Notes</CardTitle>
        <Button size="sm" onClick={() => setIsAddingNote(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
      </CardHeader>
      
      <CardContent>
        {notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map(note => {
              const user = getUserById(note.userId);
              return (
                <div key={note.id} className="p-4 bg-muted/30 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    
                    {/* Show edit/delete buttons if current user is the author */}
                    {currentUser && currentUser.auth_user_id === note.userId && (
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditNote(note)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteNoteClick(note)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: formatNoteContent(note.content) }}
                  />
                  
                  {note.mentionedUserIds.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>Mentioned: {note.mentionedUserIds.map(id => 
                        getUserById(id).name
                      ).join(", ")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="mt-2 text-sm font-medium">No notes yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add notes to keep track of important project information
            </p>
          </div>
        )}
      </CardContent>
      
      {/* Add Note Dialog */}
      <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Project Note</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <RichTextEditor
              content={newNote}
              onChange={setNewNote}
              placeholder="Write your note here... Use @username to mention team members"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Use @username to mention team members
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingNote(false)}>Cancel</Button>
            <Button onClick={handleAddNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Note Dialog */}
      <Dialog open={isEditingNote} onOpenChange={setIsEditingNote}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <RichTextEditor
              content={editedNoteContent}
              onChange={setEditedNoteContent}
              placeholder="Edit your note..."
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Use @username to mention team members
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingNote(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Note Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete this note?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
