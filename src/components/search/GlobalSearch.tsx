import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Search, FolderKanban, CheckSquare, User, Users, FileText, Mail, Clock, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSmartAutocomplete } from "@/hooks/useSmartAutocomplete";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  metadata?: string;
  type: "project" | "task" | "user" | "client" | "team" | "note" | "message" | "timeEntry";
  path: string;
  status?: string;
  priority?: string;
  score?: number;
}

interface GlobalSearchProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  initialQuery?: string;
}

export function GlobalSearch({ externalOpen, onExternalOpenChange, initialQuery = "" }: GlobalSearchProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const navigate = useNavigate();
  const { 
    projects, 
    tasks, 
    users, 
    clients, 
    teams, 
    notes, 
    messages, 
    timeEntries,
    currentUser 
  } = useAppContext();

  // Sync initial query when it changes
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  // Build searchable data with access control
  const searchableData = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      metadata: Record<string, any>;
    }> = [];

    // Add projects (user has access to their own, collaborated, or watched projects)
    projects.forEach(project => {
      const client = clients.find(c => c.id === project.clientId);
      const hasAccess = 
        project.ownerId === currentUser?.id ||
        project.collaboratorIds?.includes(currentUser?.id || '') ||
        project.watcherIds?.includes(currentUser?.id || '');
      
      if (hasAccess) {
        items.push({
          id: project.id,
          label: `${project.name} ${project.description} ${client?.name || ''} ${project.status}`,
          metadata: {
            type: 'project',
            title: project.name,
            subtitle: client?.name || 'No client',
            status: project.status,
            path: `/projects/${project.id}`,
          },
        });
      }
    });

    // Add tasks (user has access to assigned, collaborated, or watched tasks)
    tasks.forEach(task => {
      const project = projects.find(p => p.id === task.projectId);
      const hasAccess = 
        task.assigneeId === currentUser?.id ||
        task.collaboratorIds?.includes(currentUser?.id || '') ||
        task.watcherIds?.includes(currentUser?.id || '') ||
        project?.ownerId === currentUser?.id;
      
      if (hasAccess) {
        items.push({
          id: task.id,
          label: `${task.title} ${task.description || ''} ${project?.name || ''} ${task.status} ${task.priority}`,
          metadata: {
            type: 'task',
            title: task.title,
            subtitle: project?.name || 'No project',
            status: task.status,
            priority: task.priority,
            path: `/tasks/${task.id}`,
          },
        });
      }
    });

    // Add users (all users visible in organization)
    users.forEach(user => {
      items.push({
        id: user.id,
        label: `${user.name} ${user.email} ${user.jobTitle || ''}`,
        metadata: {
          type: 'user',
          title: user.name,
          subtitle: user.email,
          metadata: user.jobTitle || '',
          path: `/users/${user.id}`,
        },
      });
    });

    // Add clients (visible to all)
    clients.forEach(client => {
      items.push({
        id: client.id,
        label: `${client.name} ${client.email} ${client.company || ''}`,
        metadata: {
          type: 'client',
          title: client.name,
          subtitle: client.email,
          metadata: client.company,
          status: client.status,
          path: `/clients/${client.id}`,
        },
      });
    });

    // Add teams (user's teams)
    teams.forEach(team => {
      const isMember = currentUser?.teamIds?.includes(team.id);
      if (isMember) {
        items.push({
          id: team.id,
          label: `${team.name} ${team.description || ''}`,
          metadata: {
            type: 'team',
            title: team.name,
            subtitle: team.description || 'Team',
            path: `/team`,
          },
        });
      }
    });

    // Add notes (user's own notes)
    notes.forEach(note => {
      if (note.userId === currentUser?.id) {
        items.push({
          id: note.id,
          label: `${note.title} ${note.content || ''}`,
          metadata: {
            type: 'note',
            title: note.title,
            subtitle: note.content?.substring(0, 50) || 'Note',
            path: `/notes`,
          },
        });
      }
    });

    // Add messages (user's messages)
    messages.forEach(message => {
      const isRelevant = 
        message.senderId === currentUser?.id ||
        message.recipientIds?.includes(currentUser?.id || '');
      
      if (isRelevant) {
        const fromUser = users.find(u => u.id === message.senderId);
        const contentPreview = message.content.substring(0, 50);
        items.push({
          id: message.id,
          label: `${message.content}`,
          metadata: {
            type: 'message',
            title: contentPreview,
            subtitle: `From: ${fromUser?.name || 'Unknown'}`,
            path: `/messages`,
          },
        });
      }
    });

    // Add time entries (user's own time entries)
    timeEntries.forEach(entry => {
      if (entry.userId === currentUser?.id) {
        const project = projects.find(p => p.id === entry.projectId);
        const task = tasks.find(t => t.id === entry.taskId);
        items.push({
          id: entry.id,
          label: `${project?.name || ''} ${task?.title || ''} ${entry.notes || ''}`,
          metadata: {
            type: 'timeEntry',
            title: `${project?.name || 'Time Entry'} - ${task?.title || 'No task'}`,
            subtitle: entry.notes || 'Time tracking',
            metadata: `${entry.duration ? Math.round(entry.duration / 60) : 0} min`,
            path: `/time-tracking`,
          },
        });
      }
    });

    return items;
  }, [projects, tasks, users, clients, teams, notes, messages, timeEntries, currentUser]);

  // Use smart autocomplete for fuzzy matching
  const { suggestions, setSearchTerm } = useSmartAutocomplete({
    options: searchableData,
    maxSuggestions: 50,
    enableFuzzyMatch: true,
  });

  // Update search term for smart autocomplete
  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery, setSearchTerm]);

  // Convert suggestions to search results
  const results = useMemo(() => {
    return suggestions.map(suggestion => ({
      id: suggestion.id,
      title: suggestion.metadata.title,
      subtitle: suggestion.metadata.subtitle,
      metadata: suggestion.metadata.metadata,
      type: suggestion.metadata.type,
      path: suggestion.metadata.path,
      status: suggestion.metadata.status,
      priority: suggestion.metadata.priority,
    }));
  }, [suggestions]);

  // Global keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

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
      case "client":
        return <Briefcase className="h-4 w-4" />;
      case "team":
        return <Users className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      case "message":
        return <Mail className="h-4 w-4" />;
      case "timeEntry":
        return <Clock className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const groupedResults = {
    projects: results.filter(r => r.type === "project"),
    tasks: results.filter(r => r.type === "task"),
    users: results.filter(r => r.type === "user"),
    clients: results.filter(r => r.type === "client"),
    teams: results.filter(r => r.type === "team"),
    notes: results.filter(r => r.type === "note"),
    messages: results.filter(r => r.type === "message"),
    timeEntries: results.filter(r => r.type === "timeEntry"),
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search anything... (⌘K)" 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6">
            <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching for projects, tasks, clients, teams, notes, messages, or time entries
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
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                  </div>
                  {result.status && (
                    <Badge variant="outline" className="text-xs shrink-0">
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
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
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
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{result.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                  {result.metadata && (
                    <div className="text-xs text-muted-foreground/60 truncate">{result.metadata}</div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {groupedResults.clients.length > 0 && (
          <>
            <CommandGroup heading="Clients">
              {groupedResults.clients.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.path)}
                  className="flex items-center gap-2"
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                  </div>
                  {result.status && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {result.status}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedResults.teams.length > 0 && (
          <>
            <CommandGroup heading="Teams">
              {groupedResults.teams.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.path)}
                  className="flex items-center gap-2"
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedResults.notes.length > 0 && (
          <>
            <CommandGroup heading="Notes">
              {groupedResults.notes.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.path)}
                  className="flex items-center gap-2"
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedResults.messages.length > 0 && (
          <>
            <CommandGroup heading="Messages">
              {groupedResults.messages.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.path)}
                  className="flex items-center gap-2"
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedResults.timeEntries.length > 0 && (
          <CommandGroup heading="Time Entries">
            {groupedResults.timeEntries.map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result.path)}
                className="flex items-center gap-2"
              >
                {getIcon(result.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{result.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                </div>
                {result.metadata && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {result.metadata}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
