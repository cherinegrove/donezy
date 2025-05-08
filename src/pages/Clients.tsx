
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddClientDialog } from "@/components/clients/AddClientDialog";

const Clients = () => {
  const { clients, projects } = useAppContext();
  const navigate = useNavigate();
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  
  // Force component to re-render when clients change
  const [forceRender, setForceRender] = useState(0);
  
  // Force re-render when the component mounts and when clients change
  useEffect(() => {
    console.log("Clients component - clients updated:", clients);
    setForceRender(prev => prev + 1);
  }, [clients]); 
  
  const getProjectCount = (clientId: string) => {
    return projects.filter(project => project.clientId === clientId).length;
  };

  // Handle client dialog close and force a re-render
  const handleCloseClientDialog = () => {
    setIsAddClientDialogOpen(false);
    setForceRender(prev => prev + 1);
  };

  console.log("Current clients render:", clients, "Force render count:", forceRender); 

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client relationships
          </p>
        </div>
        <Button onClick={() => setIsAddClientDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <Card 
            key={client.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/clients/${client.id}`)}
          >
            <CardHeader>
              <CardTitle>{client.name}</CardTitle>
              <CardDescription>{client.contactName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Email</span>
                <span className="font-medium">{client.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Phone</span>
                <span className="font-medium">{client.phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Projects</span>
                <span className="font-medium">{getProjectCount(client.id)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-dashed flex flex-col items-center justify-center min-h-[200px]"
          onClick={() => setIsAddClientDialogOpen(true)}
        >
          <CardContent className="flex flex-col items-center justify-center h-full py-10">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Add New Client</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-[180px]">
              Create a new client to manage projects and billing
            </p>
          </CardContent>
        </Card>
      </div>
      
      <AddClientDialog 
        isOpen={isAddClientDialogOpen} 
        onClose={handleCloseClientDialog}
      />
    </div>
  );
};

export default Clients;
