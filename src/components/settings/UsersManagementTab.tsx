
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserInviteForm } from "./UserInviteForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, Edit, Users, UserCheck, Mail } from "lucide-react";
import { User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function UsersManagementTab() {
  const { users, projects, clients, customRoles } = useAppContext();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("account");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteType, setInviteType] = useState<"team-member" | "guest">("team-member");

  // Filter users based on type and search term
  const accountUsers = users.filter(user => 
    (user.userType === 'account' || !user.userType) &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const guestUsers = users.filter(user => 
    user.userType === 'guest' &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "developer": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "client": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400";
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return "-";
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "-";
  };

  const getProjectNames = (projectIds?: string[]) => {
    if (!projectIds || projectIds.length === 0) return "-";
    const projectNames = projects
      .filter(p => projectIds.includes(p.id))
      .map(p => p.name)
      .join(", ");
    return projectNames || "-";
  };

  const handleInviteUser = (type: "team-member" | "guest") => {
    setInviteType(type);
    setIsInviteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage account users and guest users with different access levels
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Account Users ({accountUsers.length})
          </TabsTrigger>
          <TabsTrigger value="guest" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Guest Users ({guestUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Account Users</h3>
              <p className="text-sm text-muted-foreground">
                Team members with full or partial access to the system
              </p>
            </div>
            <Button onClick={() => handleInviteUser("team-member")}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Team Member
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountUsers.length > 0 ? (
                  accountUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            {user.jobTitle && (
                              <p className="text-xs text-muted-foreground">{user.jobTitle}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)} variant="outline">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getClientName(user.clientId)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No account users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="guest" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Guest Users</h3>
              <p className="text-sm text-muted-foreground">
                External users with limited project access
              </p>
            </div>
            <Button onClick={() => handleInviteUser("guest")}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Guest User
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guestUsers.length > 0 ? (
                  guestUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <Badge variant="outline" className="text-xs">Guest</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)} variant="outline">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {getProjectNames(user.invitedToProjects)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No guest users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {inviteType === "team-member" ? "Invite Team Member" : "Invite Guest User"}
            </DialogTitle>
            <DialogDescription>
              {inviteType === "team-member" 
                ? "Invite a new team member with full or partial system access"
                : "Invite a guest user with limited project access"}
            </DialogDescription>
          </DialogHeader>
          <UserInviteForm
            defaultTab={inviteType === "team-member" ? "team-member" : "client-user"}
            onSuccess={() => setIsInviteDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
