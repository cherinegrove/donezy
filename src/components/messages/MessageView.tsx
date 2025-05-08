
import { useAppContext } from "@/contexts/AppContext";
import { Message, Task } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { PlusIcon } from "lucide-react";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";

interface MessageViewProps {
  message: Message;
  onReply: () => void;
}

export function MessageView({ message, onReply }: MessageViewProps) {
  const { getUserById, users, getProjectById, getClientById, tasks, addComment, currentUser } = useAppContext();
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  // Task creation states
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isSubtask, setIsSubtask] = useState(false);
  
  // Mention states
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const sender = getUserById(message.senderId);
  
  // Get related entities from message metadata
  const task = tasks.find(t => t.id === message.taskId);
  const project = message.projectId ? getProjectById(message.projectId) : 
                 (task ? getProjectById(task.projectId) : null);
  const client = message.clientId ? getClientById(message.clientId) : 
               (project ? getClientById(project.clientId) : null);
  
  // Check if current user is a client user and has access to this message
  const isClientUser = currentUser?.role === 'client';
  const userHasAccess = !isClientUser || (client && currentUser?.clientId === client.id);
  
  // If the user doesn't have access to this message, don't show it
  if (isClientUser && !userHasAccess) {
    return (
      <div className="flex flex-col h-full border rounded-md p-8 items-center justify-center">
        <p className="text-lg text-muted-foreground">You don't have access to view this message.</p>
      </div>
    );
  }
  
  const handleStartReply = () => {
    setIsReplying(true);
  };
  
  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyContent("");
  };
  
  const handleSendReply = () => {
    if (replyContent.trim() && task) {
      // Add comment to the task
      addComment(task.id, currentUser?.id || "", replyContent);
      
      setIsReplying(false);
      setReplyContent("");
      onReply();
    }
  };

  // Handle textarea content change to detect @ mentions
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setReplyContent(text);
    
    // Get cursor position
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    // Check for @ mentions
    if (cursorPos > 0) {
      const textBeforeCursor = text.substring(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1 && (atIndex === 0 || /\s/.test(textBeforeCursor[atIndex - 1]))) {
        const query = textBeforeCursor.substring(atIndex + 1);
        
        if (query.length > 0 && !query.includes(' ')) {
          setMentionQuery(query);
          setMentionOpen(true);
          
          // Calculate mention dropdown position based on textarea and cursor
          if (textareaRef.current) {
            const cursorCoords = getCaretCoordinates(textareaRef.current, atIndex);
            setMentionPosition({
              top: cursorCoords.top + 20,  // Add some offset below the @
              left: cursorCoords.left
            });
          }
          
          return;
        }
      }
    }
    
    setMentionOpen(false);
  };
  
  // Get caret (cursor) coordinates in the textarea
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    // Create a mirror div with same styling as textarea
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(element);
    
    // Copy styles from textarea to mirror div
    mirror.style.width = element.offsetWidth + 'px';
    mirror.style.padding = style.padding;
    mirror.style.border = style.border;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontSize = style.fontSize;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.position = 'absolute';
    mirror.style.top = '-9999px';
    
    document.body.appendChild(mirror);
    
    // Add text content up to the caret position
    const textBeforeCaret = element.value.substring(0, position);
    mirror.textContent = textBeforeCaret;
    
    // Add a span at the end to mark the position
    const caretSpan = document.createElement('span');
    caretSpan.textContent = '|';
    mirror.appendChild(caretSpan);
    
    const caretRect = caretSpan.getBoundingClientRect();
    const textareaRect = element.getBoundingClientRect();
    
    document.body.removeChild(mirror);
    
    return {
      top: caretRect.top - textareaRect.top + element.scrollTop,
      left: caretRect.left - textareaRect.left + element.scrollLeft
    };
  };
  
  // Handle user selection from the mention dropdown
  const handleSelectUser = (user: { id: string; name: string }) => {
    if (!textareaRef.current) return;
    
    const text = replyContent;
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // Find the position of the @ symbol before cursor
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      // Replace the @query with @username
      const newText = 
        beforeCursor.substring(0, atIndex) + 
        `@${user.name} ` + 
        afterCursor;
      
      setReplyContent(newText);
      
      // Focus back on textarea and set cursor after the inserted mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = atIndex + user.name.length + 2; // +2 for @ and space
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
    }
    
    setMentionOpen(false);
  };

  // Open task creation dialog for creating a subtask
  const handleCreateSubtask = () => {
    if (!task) return;
    
    setIsSubtask(true);
    setIsCreateTaskOpen(true);
  };
  
  // Open task creation dialog for creating a new task
  const handleCreateTask = () => {
    if (!project) return;
    
    setIsSubtask(false);
    setIsCreateTaskOpen(true);
  };
  
  // Filter users based on mention query
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-4 border-b">
        <div className="mt-3 flex justify-between items-start">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={sender?.avatar} />
              <AvatarFallback>
                {sender?.name.slice(0, 2) || 'UN'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <p className="font-medium">{sender?.name || 'Unknown User'}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(message.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {task && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCreateSubtask}
                className="text-xs"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Create Subtask
              </Button>
            )}
            
            {project && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleCreateTask}
                className="text-xs"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Create Task
              </Button>
            )}
          </div>
        </div>
        
        {/* Related context information */}
        {(client || project || task) && (
          <div className="mt-3 space-y-2">
            <Separator />
            <div className="flex flex-wrap gap-2">
              {client && (
                <Badge variant="outline" className="bg-blue-50">
                  <Link to={`/clients/${client.id}`} className="hover:underline">
                    Client: {client.name}
                  </Link>
                </Badge>
              )}
              
              {project && (
                <Badge variant="outline" className="bg-green-50">
                  <Link to={`/projects/${project.id}`} className="hover:underline">
                    Project: {project.name}
                  </Link>
                </Badge>
              )}
              
              {task && (
                <Badge variant="outline" className="bg-purple-50">
                  <Link to={`/projects/${task.projectId}?taskId=${task.id}`} className="hover:underline">
                    Task: {task.title}
                  </Link>
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 flex-1 overflow-auto">
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
      
      {isReplying ? (
        <div className="p-4 border-t space-y-3 relative">
          <Textarea
            ref={textareaRef}
            placeholder="Type your reply... Use @username to mention users"
            value={replyContent}
            onChange={handleTextareaChange}
            rows={4}
          />
          
          {/* Mention Dropdown */}
          {mentionOpen && filteredUsers.length > 0 && (
            <div 
              className="absolute z-50 bg-popover border rounded-md shadow-md"
              style={{
                top: `${mentionPosition.top}px`,
                left: `${mentionPosition.left}px`,
                minWidth: '200px'
              }}
            >
              <Command>
                <CommandGroup>
                  {filteredUsers.map((user) => (
                    <CommandItem
                      key={user.id}
                      onSelect={() => handleSelectUser(user)}
                      className="flex items-center gap-2 p-2 cursor-pointer"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelReply}>
              Cancel
            </Button>
            <Button onClick={handleSendReply}>
              Send Reply
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t">
          <Button onClick={handleStartReply} className="w-full">
            Reply
          </Button>
        </div>
      )}
      
      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        defaultProjectId={project?.id}
        isSubtask={isSubtask}
        defaultParentTaskId={isSubtask && task ? task.id : undefined}
      />
    </div>
  );
}
