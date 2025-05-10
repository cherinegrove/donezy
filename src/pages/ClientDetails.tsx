
import { useAppContext } from "@/contexts/AppContext";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientBillingForm } from "@/components/clients/ClientBillingForm";
import { ClientDashboard } from "@/components/clients/ClientDashboard";
import { ClientFileUpload } from "@/components/clients/ClientFileUpload";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { Avatar } from "@/components/ui/avatar";
import { AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ClientDetails = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { getClientById, projects, purchases, currentUser, updateClient, teams, users } = useAppContext();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const client = clientId ? getClientById(clientId) : undefined;
  const clientProjects = projects.filter(project => project.clientId === clientId);
  const clientPurchases = purchases.filter(purchase => purchase.clientId === clientId);
  
  // Check if current user is the client user or an admin/manager
  const isClientUser = currentUser?.role === 'client' && client?.userId === currentUser.id;
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  // Get team members assigned to this client
  const clientTeamMembers = client?.teamIds?.length 
    ? teams
        .filter(team => client.teamIds?.includes(team.id))
        .flatMap(team => team.members)
        .map(memberId => users.find(user => user.id === memberId))
        .filter(Boolean)
    : [];

  const handleStatusToggle = (checked: boolean) => {
    if (!client) return;
    updateClient(client.id, { status: checked ? 'active' : 'inactive' });
  };

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-semibold">Client not found</h1>
        <Button className="mt-4" onClick={() => navigate("/clients")}>
          Back to Clients
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">{client.contactName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isAdminOrManager && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {client.status === 'active' ? 'Active' : 'Inactive'}
                </span>
                <Switch
                  checked={client.status === 'active'}
                  onCheckedChange={handleStatusToggle}
                />
              </div>
              <Button onClick={() => setIsEditDialogOpen(true)} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </Button>
            </>
          )}
        </div>
      </div>
      
      {isClientUser ? (
        // Client-specific dashboard view
        <ClientDashboard clientId={clientId} />
      ) : (
        // Admin/Manager view
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Email</span>
                    <span>{client.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Phone</span>
                    <span>{client.phone}</span>
                  </div>
                  {client.address && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Address</span>
                      <span>{client.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{clientProjects.length}</div>
                  {clientProjects.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm font-medium">Latest Projects</div>
                      <ul className="mt-1 space-y-1">
                        {clientProjects.slice(0, 3).map(project => (
                          <li key={project.id} className="text-sm">
                            <a 
                              href={`/projects/${project.id}`} 
                              className="hover:underline"
                            >
                              {project.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Billing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Billable Rate:</span>
                    <span className="font-medium">
                      {client.currency} {client.billableRate}/hour
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Client Type:</span>
                    <Badge variant="outline">
                      {client.serviceType === 'retainer' ? 'Retainer' :
                       client.serviceType === 'bank-hours' ? 'Bank of Hours' :
                       'Pay As You Go'}
                    </Badge>
                  </div>
                  
                  {client.serviceType === 'retainer' && client.allocatedHours && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Monthly Hours:</span>
                      <span>{client.allocatedHours} hours</span>
                    </div>
                  )}
                  
                  {client.serviceType === 'bank-hours' && client.allocatedHours && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Bank Hours:</span>
                      <span>{client.allocatedHours} hours</span>
                    </div>
                  )}
                  
                  {clientPurchases.length > 0 ? (
                    <div>
                      <div className="text-sm font-medium mb-2">Recent Purchases</div>
                      <ul className="space-y-2">
                        {clientPurchases.slice(0, 2).map(purchase => (
                          <li key={purchase.id} className="text-sm">
                            <div className="flex justify-between">
                              <span>{purchase.description}</span>
                              <span className="font-medium">${purchase.amount.toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(purchase.date), "MMM d, yyyy")}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No purchases recorded</p>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Team Members section */}
            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                {clientTeamMembers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {clientTeamMembers.map(member => (
                      <div key={member?.id} className="flex items-center gap-3 p-2 rounded-md border">
                        <Avatar className="h-8 w-8">
                          {member?.avatar ? (
                            <AvatarImage src={member.avatar} alt={member.name} />
                          ) : (
                            <AvatarFallback>
                              {member?.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member?.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {member?.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    No team members assigned to this client
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="projects" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {clientProjects.length > 0 ? (
                  <div className="space-y-4">
                    {clientProjects.map(project => (
                      <div key={project.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-md">
                        <div>
                          <h3 className="font-medium">
                            <a href={`/projects/${project.id}`} className="hover:underline">
                              {project.name}
                            </a>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Started: {format(new Date(project.startDate), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="capitalize font-medium text-sm">{project.status.replace("-", " ")}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.serviceType === "project" ? "Fixed Project" : 
                             project.serviceType === "bank-hours" ? "Bank of Hours" : "Pay As You Go"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No projects for this client yet</p>
                    <Button className="mt-4" onClick={() => navigate("/projects")}>
                      Create Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="files" className="mt-4">
            <ClientFileUpload clientId={clientId} />
          </TabsContent>
          
          <TabsContent value="billing" className="mt-4">
            <ClientBillingForm clientId={clientId} />
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Client Dialog */}
      <EditClientDialog
        client={client}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </div>
  );
};

export default ClientDetails;
