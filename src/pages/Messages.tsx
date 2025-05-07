
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/messages/MessageList";
import { MessageView } from "@/components/messages/MessageView";
import { ComposeMessageDialog } from "@/components/messages/ComposeMessageDialog";
import { Message } from "@/types";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Messages = () => {
  const { messages, currentUser, sendMessage, clients, projects, tasks, users } = useAppContext();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { messageId } = useParams<{ messageId?: string }>();
  const navigate = useNavigate();
  
  // Filters
  const [clientFilter, setClientFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [taskFilter, setTaskFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Filter messages to show only those that involve the current user
  const userMessages = messages.filter(
    (msg) => {
      // Base filter for current user's messages
      const isUserMessage = msg.senderId === currentUser?.id || 
        msg.recipientIds.includes(currentUser?.id || "");
      
      // Apply additional filters
      let matchesFilters = true;
      
      if (clientFilter && msg.clientId !== clientFilter) {
        matchesFilters = false;
      }
      
      if (projectFilter && msg.projectId !== projectFilter) {
        matchesFilters = false;
      }
      
      if (taskFilter && msg.taskId !== taskFilter) {
        matchesFilters = false;
      }
      
      if (userFilter) {
        // Filter by sender or recipient
        if (userFilter !== msg.senderId && !msg.recipientIds.includes(userFilter)) {
          matchesFilters = false;
        }
      }
      
      if (statusFilter) {
        if (statusFilter === "read" && !msg.read) {
          matchesFilters = false;
        }
        if (statusFilter === "unread" && msg.read) {
          matchesFilters = false;
        }
      }
      
      return isUserMessage && matchesFilters;
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
    if (!selectedMessage) return;
    
    // In a real app, this would add to a thread
    // Here we just send a new message
    sendMessage({
      senderId: currentUser?.id || "",
      recipientIds: [selectedMessage.senderId],
      subject: `Re: ${selectedMessage.subject}`,
      content: "This is a reply to your message.",
      clientId: selectedMessage.clientId,
      projectId: selectedMessage.projectId,
      taskId: selectedMessage.taskId,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Communicate with your team and clients
          </p>
        </div>
        <Button onClick={() => setIsComposeOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>
      
      {/* Horizontal filters */}
      <div className="grid grid-cols-5 gap-4">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Clients</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Projects</SelectItem>
            {projects
              .filter(project => !clientFilter || project.clientId === clientFilter)
              .map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        
        <Select value={taskFilter} onValueChange={setTaskFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Tasks</SelectItem>
            {tasks
              .filter(task => !projectFilter || task.projectId === projectFilter)
              .map(task => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger>
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Users</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Messages</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
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
              <p className="text-muted-foreground">Select a message or start a new conversation</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsComposeOpen(true)}
              >
                New Message
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <ComposeMessageDialog 
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
      />
    </div>
  );
};

export default Messages;
