
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { InviteUserWithEmail } from "@/components/settings/InviteUserWithEmail";
import { User } from "@/types";
import { Building, Pencil, Plus, Users as UsersIcon, Trash2 } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const Users = () => {
  const { toast } = useToast();
  const { teams, users, clients, customRoles, deleteUser } = useAppContext();
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState("internal");
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [deleteDialogUser, setDeleteDialogUser] = useState<User | null>(null);

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
        { id: "user", label: "User" },
      ],
    },
  ];
  
  const clientFilterOptions: FilterOption[] = [
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
    // Filter out deleted users from team members
    const filteredUsers = users.filter(user => 
      user.teamIds.includes(teamId) && user.status !== 'deleted'
    );
    
    // Apply role filters if any
    if (activeFilters.roles && activeFilters.roles.length > 0) {
      return filteredUsers.filter(user => {
        const userRole = customRoles.find(r => r.id === user.roleId);
        return userRole && activeFilters.roles.includes(userRole.name.toLowerCase());
      });
    }
    
    return filteredUsers;
  };

  // Filter users based on their type (internal or client users by clientId)
  // Also filter out deleted users
  const internalUsers = users.filter(user => !user.clientId && user.status !== 'deleted');
  const clientUsers = users.filter(user => user.clientId && user.status !== 'deleted');

  // Apply client filter for client users
  const filteredClientUsers = activeFilters.clients && activeFilters.clients.length > 0
    ? clientUsers.filter(user => {
        return user.clientId && activeFilters.clients.includes(user.clientId);
      })
    : clientUsers;

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  const handleCreateUser = (isClientUser: boolean = false) => {
    setSelectedUser(undefined);
    setIsInviteDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setDeleteDialogUser(user);
  };

  const confirmDelete = () => {
    if (deleteDialogUser) {
      deleteUser(deleteDialogUser.auth_user_id);
      setDeleteDialogUser(null);
      toast({
        title: "User Deleted",
        description: `${deleteDialogUser.name} has been soft deleted and will no longer appear in the user list.`,
      });
    }
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
          <Button onClick={() => handleCreateUser(activeTab === "client")}>
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === "client" ? "Add Client User" : "Add User"}
          </Button>
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
              const teamMembers = getUsersInTeam(team.id).filter(user => !user.clientId);
              
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
                                    {member.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-sm text-muted-foreground">{member.email}</p>
                                  {member.employmentType && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {member.employmentType} • 
                                      {member.billingType === "hourly" 
                                        ? ` ${member.billingRate || 0} ${member.currency || "USD"}/hr` 
                                        : ` ${member.billingRate || 0} ${member.currency || "USD"}/month`}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                                  {customRoles.find(r => r.id === member.roleId)?.name || 'Unknown'}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditUser(member)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteUser(member)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
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
                  <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
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
                  const client = clients.find(c => c.id === user.clientId);
                  return (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.slice(0, 2).toUpperCase()}
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Client
                        </span>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredClientUsers.length === 0 && (
                  <div className="text-center py-10">
                    <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No client users found with the selected filters
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => handleCreateUser(true)}
                    >
                      Add Client User
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <EditUserDialog
        user={selectedUser}
        isOpen={isEditUserDialogOpen}
        onClose={() => setIsEditUserDialogOpen(false)}
      />
      
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
          </DialogHeader>
          <InviteUserWithEmail 
            onSuccess={() => {
              setIsInviteDialogOpen(false);
            }} 
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialogUser} onOpenChange={() => setDeleteDialogUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialogUser?.name}"? This will mark the user as deleted and they will no longer appear in the user list. This action can be reversed by changing their status back to "Active" in the edit dialog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
