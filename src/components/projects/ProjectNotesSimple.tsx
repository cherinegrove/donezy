import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, FileText, Calendar, Edit, Trash2, Bold, Italic, List, ListOrdered } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ProjectNotesProps {
  projectId: string;
}

export function ProjectNotesSimple({ projectId }: ProjectNotesProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // For now, just show some placeholder data since the table is just created
    setNotes([]);
  }, [projectId]);

  const saveNote = () => {
    if (!noteTitle.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a note title",
        variant: "destructive"
      });
      return;
    }

    // For now, just show success message
    toast({
      title: "Note Saved",
      description: "Note functionality will be available once the database is fully synced"
    });

    setNoteTitle('');
    setNoteContent('');
    setSelectedNote(null);
    setIsCreating(false);
  };

  const startNewNote = () => {
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    setIsCreating(true);
  };

  const editNote = (note: Note) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsCreating(true);
  };

  const cancelEdit = () => {
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    setIsCreating(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Notes List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Notes
            </CardTitle>
            <Button size="sm" onClick={startNewNote} disabled={loading}>
              <Plus className="h-4 w-4 mr-1" />
              New Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedNote?.id === note.id ? 'border-primary bg-muted/50' : ''
                  }`}
                  onClick={() => editNote(note)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{note.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.updated_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Delete functionality placeholder
                        toast({
                          title: "Delete Note",
                          description: "Delete functionality will be available once the database is fully synced"
                        });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {note.content.substring(0, 100)}...
                  </div>
                </div>
              ))}
              
              {notes.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No notes yet</p>
                  <p className="text-sm">Click "New Note" to get started</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Note Editor */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {selectedNote ? 'Edit Note' : isCreating ? 'New Note' : 'Select a Note'}
            </CardTitle>
            {isCreating && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={cancelEdit} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={saveNote} disabled={loading}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Note
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isCreating ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Note Title</label>
                <Input
                  placeholder="Enter note title..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Content</label>
                <div className="border rounded-lg">
                  {/* Simple Toolbar */}
                  <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
                    <Button variant="ghost" size="sm">
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-border" />
                    <Button variant="ghost" size="sm">
                      <List className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Start writing your note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="min-h-[300px] border-none resize-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a note to view or edit</p>
                <p className="text-sm">Or create a new note to get started</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}