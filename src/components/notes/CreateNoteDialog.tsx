
import { useState, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  color: z.string().default("yellow"),
  associationType: z.enum(["none", "project", "client", "task"]).default("none"),
  associationId: z.string().optional(),
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
  const { addNote, currentUser, projects, clients, tasks } = useAppContext();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState("yellow");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "",
      content: "",
      color: "yellow",
      associationType: "none",
      associationId: "",
    },
  });

  const onSubmit = (data: NoteFormData) => {
    if (!currentUser) return;

    const noteData: any = {
      title: data.title,
      content: data.content,
      color: selectedColor,
      userId: currentUser.auth_user_id,
      archived: false,
    };

    // Add association fields based on selection
    if (data.associationType === "project" && data.associationId) {
      noteData.projectId = data.associationId;
    } else if (data.associationType === "client" && data.associationId) {
      noteData.clientId = data.associationId;
    } else if (data.associationType === "task" && data.associationId) {
      noteData.taskId = data.associationId;
    }

    addNote(noteData);

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

  const associationType = form.watch("associationType");

  const getAssociationOptions = () => {
    switch (associationType) {
      case "project":
        return projects.map(p => ({ id: p.id, name: p.name }));
      case "client":
        return clients.map(c => ({ id: c.id, name: c.name }));
      case "task":
        return tasks.map(t => ({ id: t.id, name: t.title }));
      default:
        return [];
    }
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
              name="associationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associate With</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select association type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {associationType !== "none" && (
              <FormField
                control={form.control}
                name="associationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Select {associationType.charAt(0).toUpperCase() + associationType.slice(1)}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${associationType}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getAssociationOptions().map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                  </div>
                  <FormControl>
                    <Textarea
                      ref={textareaRef}
                      placeholder="Write your note here..."
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
