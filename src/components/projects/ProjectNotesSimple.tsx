import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Save, 
  FileText, 
  Calendar, 
  Edit, 
  Trash2, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Tag, 
  X,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface ProjectNotesProps {
  projectId: string;
}

export function ProjectNotesSimple({ projectId }: ProjectNotesProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Available tags from all notes
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags))).sort();

  useEffect(() => {
    loadNotes();
  }, [projectId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter notes based on selected tag
  useEffect(() => {
    if (tagFilter === '' || tagFilter === 'all') {
      setFilteredNotes(notes);
    } else {
      setFilteredNotes(notes.filter(note => note.tags && note.tags.includes(tagFilter)));
    }
  }, [notes, tagFilter]);

  const saveNote = async () => {
    if (!noteTitle.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a note title",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      if (selectedNote) {
        // Update existing note
        const { error } = await supabase
          .from('project_notes')
          .update({
            title: noteTitle,
            content: noteContent,
            tags: noteTags,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNote.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Note updated successfully"
        });
      } else {
        // Create new note
        const { error } = await supabase
          .from('project_notes')
          .insert({
            project_id: projectId,
            title: noteTitle,
            content: noteContent,
            tags: noteTags
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Note saved successfully"
        });
      }

      setNoteTitle('');
      setNoteContent('');
      setNoteTags([]);
      setSelectedNote(null);
      setIsCreating(false);
      loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startNewNote = () => {
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setIsCreating(true);
  };

  const editNote = (note: Note) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags || []);
    setIsCreating(true);
  };

  const cancelEdit = () => {
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setIsCreating(false);
  };

  const addTag = () => {
    if (newTag.trim() && !noteTags.includes(newTag.trim())) {
      setNoteTags([...noteTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNoteTags(noteTags.filter(tag => tag !== tagToRemove));
  };

  const handleNewTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('project_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note deleted successfully"
      });

      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setNoteTitle('');
        setNoteContent('');
        setNoteTags([]);
        setIsCreating(false);
      }
      
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
          
          {/* Tag Filter */}
          <div className="flex items-center gap-2 pt-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notes</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {filteredNotes.map((note) => (
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
                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {note.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{note.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
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
              
              {filteredNotes.length === 0 && notes.length > 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No notes with this tag</p>
                  <p className="text-sm">Try selecting a different tag filter</p>
                </div>
              )}

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
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="space-y-2">
                  {/* Current Tags */}
                  {noteTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {noteTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Add New Tag */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={handleNewTagKeyPress}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTag}
                      disabled={!newTag.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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