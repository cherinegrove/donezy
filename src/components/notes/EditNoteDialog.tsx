import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
import { Note } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, List } from "lucide-react";
import { TextFormattingToolbar } from "./TextFormattingToolbar";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  color: z.string().default("yellow"),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface EditNoteDialogProps {
  note: Note;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLOR_OPTIONS = [
  { name: "yellow", class: "bg-yellow-100 border-yellow-200", label: "Yellow" },
  { name: "blue", class: "bg-blue-100 border-blue-200", label: "Blue" },
  { name: "green", class: "bg-green-100 border-green-200", label: "Green" },
  { name: "pink", class: "bg-pink-100 border-pink-200", label: "Pink" },
  { name: "purple", class: "bg-purple-100 border-purple-200", label: "Purple" },
  { name: "orange", class: "bg-orange-100 border-orange-200", label: "Orange" },
];

export function EditNoteDialog({ note, open, onOpenChange }: EditNoteDialogProps) {
  const { updateNote } = useAppContext();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState(note.color || "yellow");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: note.title,
      content: note.content,
      color: note.color || "yellow",
    },
  });

  useEffect(() => {
    if (note) {
      form.reset({
        title: note.title,
        content: note.content,
        color: note.color || "yellow",
      });
      setSelectedColor(note.color || "yellow");
    }
  }, [note, form]);

  const onSubmit = (data: NoteFormData) => {
    updateNote(note.id, {
      title: data.title,
      content: data.content,
      color: selectedColor,
    });

    toast({
      title: "Note updated",
      description: `${data.title} has been updated successfully.`,
    });

    onOpenChange(false);
  };

  const insertCheckbox = () => {
    const currentContent = form.getValues("content");
    const newContent = currentContent + (currentContent ? "\n" : "") + "☐ ";
    form.setValue("content", newContent);
    
    // Focus the textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newContent.length, newContent.length);
      }
    }, 0);
  };

  const insertBulletPoint = () => {
    const currentContent = form.getValues("content");
    const newContent = currentContent + (currentContent ? "\n" : "") + "• ";
    form.setValue("content", newContent);
    
    // Focus the textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newContent.length, newContent.length);
      }
    }, 0);
  };

  // Store selection when textarea selection changes
  const handleSelectionChange = () => {
    if (textareaRef.current) {
      setSelectionStart(textareaRef.current.selectionStart);
      setSelectionEnd(textareaRef.current.selectionEnd);
    }
  };

  const handleTextFormat = (type: 'bold' | 'italic' | 'underline') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentValue = textarea.value;
    const start = selectionStart;
    const end = selectionEnd;
    const selectedText = currentValue.substring(start, end);
    
    let markers = { start: '', end: '' };
    switch (type) {
      case 'bold':
        markers = { start: '**', end: '**' };
        break;
      case 'italic':
        markers = { start: '*', end: '*' };
        break;
      case 'underline':
        markers = { start: '__', end: '__' };
        break;
    }
    
    if (selectedText) {
      // Check if text is already formatted
      const beforeText = currentValue.substring(Math.max(0, start - markers.start.length), start);
      const afterText = currentValue.substring(end, end + markers.end.length);
      
      if (beforeText === markers.start && afterText === markers.end) {
        // Remove formatting
        const newContent = 
          currentValue.substring(0, start - markers.start.length) + 
          selectedText + 
          currentValue.substring(end + markers.end.length);
        form.setValue("content", newContent);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - markers.start.length, end - markers.start.length);
        }, 0);
      } else {
        // Add formatting
        const formattedText = `${markers.start}${selectedText}${markers.end}`;
        const newContent = currentValue.substring(0, start) + formattedText + currentValue.substring(end);
        form.setValue("content", newContent);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + markers.start.length, end + markers.start.length);
        }, 0);
      }
    } else {
      // No text selected, insert markers and position cursor between them
      const formatMarkers = markers.start + markers.end;
      const newContent = currentValue.substring(0, start) + formatMarkers + currentValue.substring(end);
      form.setValue("content", newContent);
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPosition = start + markers.start.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription>
            Update your note with colors and formatting options.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Note Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Color</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_OPTIONS.map((color) => (
                  <Badge
                    key={color.name}
                    variant={selectedColor === color.name ? "default" : "outline"}
                    className={`cursor-pointer p-2 ${color.class} border-2 ${
                      selectedColor === color.name ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedColor(color.name)}
                  >
                    {color.label}
                  </Badge>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={insertCheckbox}
                      >
                        <CheckSquare className="h-4 w-4 mr-1" />
                        Checkbox
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={insertBulletPoint}
                      >
                        <List className="h-4 w-4 mr-1" />
                        Bullet
                      </Button>
                    </div>
                    <TextFormattingToolbar onFormat={handleTextFormat} textareaRef={textareaRef} />
                  </div>
                  <FormControl>
                    <Textarea
                      ref={textareaRef}
                      placeholder="Write your note here... Select text and use formatting buttons or Ctrl+B/I/U"
                      rows={8}
                      {...field}
                      onSelect={handleSelectionChange}
                      onKeyUp={handleSelectionChange}
                      onMouseUp={handleSelectionChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Note</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
