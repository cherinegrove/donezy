
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
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

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  color: z.string().default("yellow"),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface CreateNoteDialogProps {
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

export function CreateNoteDialog({ open, onOpenChange }: CreateNoteDialogProps) {
  const { addNote, currentUser } = useAppContext();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState("yellow");

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "",
      content: "",
      color: "yellow",
    },
  });

  const onSubmit = (data: NoteFormData) => {
    if (!currentUser) return;

    addNote({
      title: data.title,
      content: data.content,
      color: selectedColor,
      userId: currentUser.id,
      archived: false,
    });

    toast({
      title: "Note created",
      description: `${data.title} has been created successfully.`,
    });

    form.reset();
    setSelectedColor("yellow");
    onOpenChange(false);
  };

  const insertCheckbox = () => {
    const currentContent = form.getValues("content");
    const cursorPosition = document.activeElement as HTMLTextAreaElement;
    const newContent = currentContent + (currentContent ? "\n" : "") + "☐ ";
    form.setValue("content", newContent);
  };

  const insertBulletPoint = () => {
    const currentContent = form.getValues("content");
    const newContent = currentContent + (currentContent ? "\n" : "") + "• ";
    form.setValue("content", newContent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
          <DialogDescription>
            Create a new sticky note with colors and formatting options.
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
                  <div className="flex gap-2 mb-2">
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
                  <FormControl>
                    <Textarea
                      placeholder="Write your note here... Use ☐ for checkboxes and • for bullet points"
                      rows={8}
                      {...field}
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
              <Button type="submit">Create Note</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
