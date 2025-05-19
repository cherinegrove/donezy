
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const NOTE_COLORS = [
  { value: "bg-yellow-100", label: "Yellow", border: "border-yellow-200" },
  { value: "bg-blue-100", label: "Blue", border: "border-blue-200" },
  { value: "bg-green-100", label: "Green", border: "border-green-200" },
  { value: "bg-pink-100", label: "Pink", border: "border-pink-200" },
  { value: "bg-purple-100", label: "Purple", border: "border-purple-200" },
  { value: "bg-orange-100", label: "Orange", border: "border-orange-200" },
];

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNoteDialog({ open, onOpenChange }: CreateNoteDialogProps) {
  const { addNote, currentUser } = useAppContext();
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-yellow-100");
  
  const handleCreateNote = () => {
    if (!content.trim()) {
      toast({
        title: "Cannot create empty note",
        description: "Please add some content to your note",
        variant: "destructive",
      });
      return;
    }
    
    if (currentUser) {
      addNote({
        userId: currentUser.id,
        content,
        color: selectedColor,
        position: { x: 0, y: 0 },
        archived: false,
      });
      
      toast({
        title: "Note created",
        description: "Your note has been created successfully",
      });
      
      // Reset form and close dialog
      setContent("");
      setSelectedColor("bg-yellow-100");
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your note here..."
            className="min-h-[150px] resize-none"
          />
          
          <div>
            <Label className="mb-2 block">Choose a color</Label>
            <RadioGroup 
              value={selectedColor} 
              onValueChange={setSelectedColor}
              className="flex flex-wrap gap-2"
            >
              {NOTE_COLORS.map((color) => (
                <div key={color.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={color.value}
                    id={color.value}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={color.value}
                    className={`h-8 w-8 rounded-full cursor-pointer flex items-center justify-center ${color.value} ${color.border} ${selectedColor === color.value ? 'ring-2 ring-primary' : ''}`}
                  />
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateNote}>
            Create Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
