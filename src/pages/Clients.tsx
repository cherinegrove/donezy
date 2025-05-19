
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RecordActions } from "@/components/common/RecordActions";

const Clients = () => {
  const { clients, projects } = useAppContext();
  const navigate = useNavigate();
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingClient, setEditingClient] = useState<string | null>(null);
  
  const getProjectCount = (clientId: string) => {
    return projects.filter(project => project.clientId === clientId).length;
  };

  // Filter clients based on status
  const filteredClients = clients.filter(client => {
    if (statusFilter === 'all') return true;
    return client.status === statusFilter;
  });
  
  const handleEditClient = (clientId: string) => {
    setEditingClient(clientId);
  };
  
  const handleCardClick = (clientId: string, e: React.MouseEvent) => {
    // Don't navigate if the click was on the RecordActions component
    if ((e.target as HTMLElement).closest('.record-actions')) {
      e.stopPropagation();
      return;
    }
    navigate(`/clients/${clientId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client relationships
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Tabs 
          defaultValue="all" 
          className="w-[300px]"
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card 
            key={client.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={(e) => handleCardClick(client.id, e)}
          >
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{client.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                    {client.status === 'active' ? (
                      <><Check className="h-3 w-3 mr-1" /> Active</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> Inactive</>
                    )}
                  </Badge>
                  <div className="record-actions" onClick={(e) => e.stopPropagation()}>
                    <RecordActions
                      recordId={client.id}
                      recordType="Client"
                      recordName={client.name}
                      onEdit={() => handleEditClient(client.id)}
                    />
                  </div>
                </div>
              </div>
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
        onClose={() => setIsAddClientDialogOpen(false)}
      />
      
      {editingClient && (
        <EditClientDialog 
          client={clients.find(c => c.id === editingClient)!} 
          isOpen={!!editingClient}
          onClose={() => setEditingClient(null)}
        />
      )}
    </div>
  );
};

export default Clients;
