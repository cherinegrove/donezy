import { useState, useEffect, useCallback } from "react";
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
import { Search, FolderKanban, CheckSquare, User, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "project" | "task" | "user";
  path: string;
  status?: string;
  priority?: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const { projects, tasks, users, clients } = useAppContext();

  // Global keyboard shortcut (Cmd+K or Ctrl+K)
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

  // Smart search algorithm with fuzzy matching
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search projects
    projects.forEach(project => {
      const projectName = project.name.toLowerCase();
      const projectDesc = project.description.toLowerCase();
      const client = clients.find(c => c.id === project.clientId);
      const clientName = client?.name.toLowerCase() || "";

      if (
        projectName.includes(searchTerm) || 
        projectDesc.includes(searchTerm) ||
        clientName.includes(searchTerm) ||
        project.status.toLowerCase().includes(searchTerm)
      ) {
        searchResults.push({
          id: project.id,
          title: project.name,
          subtitle: client?.name || "No client",
          type: "project",
          path: `/projects/${project.id}`,
          status: project.status,
        });
      }
    });

    // Search tasks
    tasks.forEach(task => {
      const taskTitle = task.title.toLowerCase();
      const taskDesc = task.description?.toLowerCase() || "";
      const project = projects.find(p => p.id === task.projectId);
      const projectName = project?.name.toLowerCase() || "";

      if (
        taskTitle.includes(searchTerm) || 
        taskDesc.includes(searchTerm) ||
        projectName.includes(searchTerm) ||
        task.status.toLowerCase().includes(searchTerm) ||
        task.priority.toLowerCase().includes(searchTerm)
      ) {
        searchResults.push({
          id: task.id,
          title: task.title,
          subtitle: project?.name || "No project",
          type: "task",
          path: `/tasks/${task.id}`,
          status: task.status,
          priority: task.priority,
        });
      }
    });

    // Search users
    users.forEach(user => {
      const userName = user.name.toLowerCase();
      const userEmail = user.email.toLowerCase();
      const jobTitle = user.jobTitle?.toLowerCase() || "";

      if (
        userName.includes(searchTerm) || 
        userEmail.includes(searchTerm) ||
        jobTitle.includes(searchTerm)
      ) {
        searchResults.push({
          id: user.id,
          title: user.name,
          subtitle: user.email,
          type: "user",
          path: `/users/${user.id}`,
        });
      }
    });

    // Sort by relevance (exact matches first)
    searchResults.sort((a, b) => {
      const aExact = a.title.toLowerCase() === searchTerm;
      const bExact = b.title.toLowerCase() === searchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aStarts = a.title.toLowerCase().startsWith(searchTerm);
      const bStarts = b.title.toLowerCase().startsWith(searchTerm);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return 0;
    });

    setResults(searchResults.slice(0, 20)); // Limit to top 20 results
  }, [projects, tasks, users, clients]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setSearchQuery("");
    navigate(path);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FolderKanban className="h-4 w-4" />;
      case "task":
        return <CheckSquare className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const groupedResults = {
    projects: results.filter(r => r.type === "project"),
    tasks: results.filter(r => r.type === "task"),
    users: results.filter(r => r.type === "user"),
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search projects, tasks, users..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6">
            <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching for projects, tasks, or team members
            </p>
          </div>
        </CommandEmpty>

        {groupedResults.projects.length > 0 && (
          <>
            <CommandGroup heading="Projects">
              {groupedResults.projects.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.path)}
                  className="flex items-center gap-2"
                >
                  {getIcon(result.type)}
                  <div className="flex-1">
                    <div className="font-medium">{result.title}</div>
                    <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                  </div>
                  {result.status && (
                    <Badge variant="outline" className="text-xs">
                      {result.status}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedResults.tasks.length > 0 && (
          <>
            <CommandGroup heading="Tasks">
              {groupedResults.tasks.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.path)}
                  className="flex items-center gap-2"
                >
                  {getIcon(result.type)}
                  <div className="flex-1">
                    <div className="font-medium">{result.title}</div>
                    <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                  </div>
                  <div className="flex gap-1">
                    {result.priority && (
                      <Badge 
                        variant={result.priority === "high" ? "destructive" : "outline"} 
                        className="text-xs"
                      >
                        {result.priority}
                      </Badge>
                    )}
                    {result.status && (
                      <Badge variant="secondary" className="text-xs">
                        {result.status}
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedResults.users.length > 0 && (
          <CommandGroup heading="Team Members">
            {groupedResults.users.map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result.path)}
                className="flex items-center gap-2"
              >
                {getIcon(result.type)}
                <div className="flex-1">
                  <div className="font-medium">{result.title}</div>
                  <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
