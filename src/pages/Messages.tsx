
import { useAppContext } from "@/contexts/AppContext";
import { MessageList } from "@/components/messages/MessageList";
import { MessageView } from "@/components/messages/MessageView";
import { Message } from "@/types";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const Messages = () => {
  const { messages, currentUser, clients, projects, tasks, users, getTaskById } = useAppContext();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const { messageId } = useParams<{ messageId?: string }>();
  const navigate = useNavigate();
  
  // Filters
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Get all tasks that have comments
  const tasksWithComments = tasks.filter(task => task.comments && task.comments.length > 0);
  
  // Filter messages to show only those that involve the current user
  const userMessages = messages.filter(
    (msg) => {
      // Base filter for current user's messages
      const isUserMessage = msg.senderId === currentUser?.id || 
        msg.recipientIds.includes(currentUser?.id || "");
      
      // Apply additional filters
      let matchesFilters = true;
      
      if (clientFilter && clientFilter !== "all" && msg.clientId !== clientFilter) {
        matchesFilters = false;
      }
      
      if (projectFilter && projectFilter !== "all" && msg.projectId !== projectFilter) {
        matchesFilters = false;
      }
      
      if (taskFilter && taskFilter !== "all" && msg.taskId !== taskFilter) {
        matchesFilters = false;
      }
      
      if (userFilter && userFilter !== "all") {
        // Filter by sender or recipient
        if (userFilter !== msg.senderId && !msg.recipientIds.includes(userFilter)) {
          matchesFilters = false;
        }
      }
      
      if (statusFilter && statusFilter !== "all") {
        if (statusFilter === "read" && !msg.read) {
          matchesFilters = false;
        }
        if (statusFilter === "unread" && msg.read) {
          matchesFilters = false;
        }
      }
      
      // Only show messages that are related to task comments (mentions)
      // In a real application, we would have a better way to identify messages
      // that are task comment mentions vs other types of messages
      const isCommentMention = msg.commentId !== undefined;
      
      return isUserMessage && matchesFilters && isCommentMention;
    }
  ).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Handle message selection from URL
  useEffect(() => {
    if (messageId) {
      const msgFromUrl = messages.find(m => m.id === messageId);
      if (msgFromUrl) {
        setSelectedMessage(msgFromUrl);
      }
    }
  }, [messageId, messages]);
  
  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    navigate(`/messages/${message.id}`);
  };
  
  const handleReply = () => {
    if (!selectedMessage || !currentUser) return;
    
    // In a real app, this would reply directly to the original comment
    console.log("Reply to comment on task:", selectedMessage.taskId);
  };

  // Get the count of unread messages
  const unreadCount = userMessages.filter(msg => !msg.read).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Task comments that mention you
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Badge variant="secondary" className="text-base py-1 px-3">
            {unreadCount} unread
          </Badge>
        )}
      </div>
      
      {/* Horizontal filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects
              .filter(project => clientFilter === "all" || project.clientId === clientFilter)
              .map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        
        <Select value={taskFilter} onValueChange={setTaskFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Tasks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            {tasksWithComments
              .filter(task => {
                const project = projects.find(p => p.id === task.projectId);
                return (projectFilter === "all" || task.projectId === projectFilter) &&
                       (clientFilter === "all" || (project && project.clientId === clientFilter));
              })
              .map(task => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Messages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {userMessages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <MessageList 
              messages={userMessages}
              onSelect={handleSelectMessage}
              selectedMessageId={selectedMessage?.id}
            />
          </div>
          
          <div className="md:col-span-2">
            {selectedMessage ? (
              <MessageView message={selectedMessage} onReply={handleReply} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] border rounded-md">
                <p className="text-muted-foreground">Select a message to view details</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] border rounded-md">
          <p className="text-lg text-muted-foreground">No messages found</p>
          <p className="text-sm text-muted-foreground mt-1">When someone mentions you in a task comment, it will appear here</p>
        </div>
      )}
    </div>
  );
};

export default Messages;
