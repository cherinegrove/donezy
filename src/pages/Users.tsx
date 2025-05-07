
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { UserInviteForm } from "@/components/settings/UserInviteForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Users = () => {
  const { teams, users, clients } = useAppContext();
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("internal");

  // Define filter options - create separate arrays for different tabs
  const internalFilterOptions: FilterOption[] = [
    {
      id: "teams",
      name: "Team",
      options: teams.map(team => ({
        id: team.id,
        label: team.name,
      })),
    },
    {
      id: "roles",
      name: "Role",
      options: [
        { id: "admin", label: "Admin" },
        { id: "manager", label: "Manager" },
        { id: "developer", label: "Developer" },
      ],
    },
  ];
  
  const clientFilterOptions: FilterOption[] = [
    {
      id: "roles",
      name: "Role",
      options: [
        { id: "client", label: "Client" },
      ],
    },
    {
      id: "clients",
      name: "Client",
      options: clients.map(client => ({
        id: client.id,
        label: client.name,
      })),
    },
  ];

  const getUsersInTeam = (teamId: string) => {
    const filteredUsers = users.filter(user => user.teamIds.includes(teamId));
    
    // Apply role filters if any
    if (activeFilters.roles && activeFilters.roles.length > 0) {
      return filteredUsers.filter(user => 
        activeFilters.roles.includes(user.role)
      );
    }
    
    return filteredUsers;
  };

  // Filter users based on their type (internal or client)
  const internalUsers = users.filter(user => user.role !== "client");
  const clientUsers = users.filter(user => user.role === "client");

  // Apply client filter for client users
  const filteredClientUsers = activeFilters.clients && activeFilters.clients.length > 0
    ? clientUsers.filter(user => {
        const client = clients.find(c => c.userId === user.id);
        return client && activeFilters.clients.includes(client.id);
      })
    : clientUsers;

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  // Filter teams based on team filter
  const filteredTeams = teams.filter(team => {
    if (activeFilters.teams && activeFilters.teams.length > 0) {
      return activeFilters.teams.includes(team.id);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage team members and client users
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>Invite User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation email to a new team member or client user
                </DialogDescription>
              </DialogHeader>
              <UserInviteForm />
            </DialogContent>
          </Dialog>
          <Button variant="outline">Create Team</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="internal">Internal Team Members</TabsTrigger>
          <TabsTrigger value="client">Client Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="internal" className="space-y-6">
          <FilterBar filters={internalFilterOptions} onFilterChange={handleFilterChange} />

          <div className="space-y-6">
            {filteredTeams.map((team) => {
              const teamMembers = getUsersInTeam(team.id).filter(user => user.role !== "client");
              
              return (
                <Card key={team.id}>
                  <CardHeader>
                    <CardTitle>{team.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {team.description}
                      </p>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Team Members</h3>
                        <div className="space-y-2">
                          {teamMembers.map((member) => (
                            <div 
                              key={member.id} 
                              className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={member.avatar} />
                                  <AvatarFallback>
                                    {member.name.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-sm text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                              <div>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                                  {member.role}
                                </span>
                              </div>
                            </div>
                          ))}

                          {teamMembers.length === 0 && (
                            <p className="text-center py-4 text-muted-foreground">
                              No team members found with the selected filters
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredTeams.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <p className="text-muted-foreground">No teams found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="client" className="space-y-6">
          <FilterBar filters={clientFilterOptions} onFilterChange={handleFilterChange} />

          <Card>
            <CardHeader>
              <CardTitle>Client Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredClientUsers.map(user => {
                  const client = clients.find(c => c.userId === user.id);
                  return (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {client && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Associated with: {client.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Client
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredClientUsers.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground">
                    No client users found with the selected filters
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Users;
