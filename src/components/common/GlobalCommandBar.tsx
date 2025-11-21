import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  CheckSquare,
  Folder,
  Users,
  StickyNote,
  Mail,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function GlobalCommandBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { tasks, projects, clients, notes, messages } = useAppContext();

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  // Search results grouped by type
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();

    const taskResults = tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      )
      .slice(0, 5);

    const projectResults = projects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      )
      .slice(0, 5);

    const clientResults = clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
      )
      .slice(0, 5);

    const noteResults = notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content?.toLowerCase().includes(query)
      )
      .slice(0, 5);

    const messageResults = messages
      .filter(
        (m) =>
          m.content.toLowerCase().includes(query)
      )
      .slice(0, 5);

    return {
      tasks: taskResults,
      projects: projectResults,
      clients: clientResults,
      notes: noteResults,
      messages: messageResults,
    };
  }, [searchQuery, tasks, projects, clients, notes, messages]);

  const handleSelect = (type: string, id: string) => {
    setOpen(false);
    setSearchQuery("");

    switch (type) {
      case "task":
        navigate(`/tasks/${id}`);
        break;
      case "project":
        navigate(`/projects/${id}`);
        break;
      case "client":
        navigate(`/clients/${id}`);
        break;
      case "note":
        navigate(`/notes`);
        break;
      case "message":
        navigate(`/messages`);
        break;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search tasks, projects, clients, notes..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {!searchQuery && (
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => navigate("/tasks")}>
              <CheckSquare className="mr-2 h-4 w-4" />
              View All Tasks
            </CommandItem>
            <CommandItem onSelect={() => navigate("/projects")}>
              <Folder className="mr-2 h-4 w-4" />
              View All Projects
            </CommandItem>
            <CommandItem onSelect={() => navigate("/clients")}>
              <Users className="mr-2 h-4 w-4" />
              View All Clients
            </CommandItem>
            <CommandItem onSelect={() => navigate("/notes")}>
              <StickyNote className="mr-2 h-4 w-4" />
              View All Notes
            </CommandItem>
          </CommandGroup>
        )}

        {searchResults && (
          <>
            {searchResults.tasks.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Tasks">
                  {searchResults.tasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      onSelect={() => handleSelect("task", task.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        <span className="truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                          {task.priority}
                        </Badge>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.dueDate), "MMM d")}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {searchResults.projects.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Projects">
                  {searchResults.projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      onSelect={() => handleSelect("project", project.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        <span className="truncate">{project.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {project.status}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {searchResults.clients.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Clients">
                  {searchResults.clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      onSelect={() => handleSelect("client", client.id)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span className="truncate">{client.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {client.email}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {searchResults.notes.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Notes">
                  {searchResults.notes.map((note) => (
                    <CommandItem
                      key={note.id}
                      onSelect={() => handleSelect("note", note.id)}
                    >
                      <StickyNote className="mr-2 h-4 w-4" />
                      <span className="truncate">{note.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {searchResults.messages.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Messages">
                  {searchResults.messages.map((message) => (
                    <CommandItem
                      key={message.id}
                      onSelect={() => handleSelect("message", message.id)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      <span className="truncate">{message.content.substring(0, 50)}...</span>
                      {!message.read && (
                        <AlertCircle className="ml-2 h-3 w-3 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
