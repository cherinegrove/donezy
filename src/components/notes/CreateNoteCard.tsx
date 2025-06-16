
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateNoteCardProps {
  onNoteCreated?: () => void;
}

export function CreateNoteCard({ onNoteCreated }: CreateNoteCardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for your note",
        variant: "destructive",
      });
      return;
    }

    // Here you would save the note to your backend/context
    console.log("Saving note:", { title, content });
    
    toast({
      title: "Success",
      description: "Note created successfully",
    });

    // Reset form
    setTitle("");
    setContent("");
    setIsCreating(false);
    
    if (onNoteCreated) {
      onNoteCreated();
    }
  };

  const handleCancel = () => {
    setTitle("");
    setContent("");
    setIsCreating(false);
  };

  if (isCreating) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Input
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Textarea
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
      onClick={() => setIsCreating(true)}
    >
      <CardContent className="flex flex-col items-center justify-center py-12">
      <Plus className="h-12 w-12 mb-4" style={{ color: "#8E44AD" }} />
        <h3 className="text-lg font-semibold mb-2">Create New Note</h3>
        <p className="text-sm text-muted-foreground text-center">
          Click here to add a new note
        </p>
      </CardContent>
    </Card>
  );
}
