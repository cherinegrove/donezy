
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { AddUserCard } from "@/components/admin/AddUserCard";
import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Trash2, UserX, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminUsers() {
  const { users, clients, updateUser, deleteUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogUser, setDeleteDialogUser] = useState<User | null>(null);

  // Filter users based on search term (include both regular users and guests)
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    try {
      await deleteUser(user.id);
      setDeleteDialogUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateUser(user.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "developer": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "client": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400";
    }
  };

  const getUserTypeBadge = (user: User) => {
    if (user.is_guest) {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Guest</Badge>;
    }
    if (user.status === 'inactive') {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400">Inactive</Badge>;
    }
    return <Badge className={getRoleBadgeColor(user.role)} variant="outline">{user.role}</Badge>;
  };

  // Find client name for user if they have a clientId
  const getClientName = (clientId?: string) => {
    if (!clientId) return "-";
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "-";
  };

  return (
    <div className="space-y-6">
      {/* Add User Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Add Users</h2>
        <AddUserCard />
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
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
                        {user.is_guest && (
                          <p className="text-xs text-purple-600">Guest User</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getUserTypeBadge(user)}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getClientName(user.clientId)}</TableCell>
                   <TableCell className="text-right">
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="sm">
                           <MoreVertical className="h-4 w-4" />
                           <span className="sr-only">Open menu</span>
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => handleEditUser(user)}>
                           <Edit className="h-4 w-4 mr-2" />
                           Edit User
                         </DropdownMenuItem>
                         <DropdownMenuItem 
                           onClick={() => handleToggleUserStatus(user)}
                           className={user.status === 'active' ? 'text-orange-600' : 'text-green-600'}
                         >
                           <UserX className="h-4 w-4 mr-2" />
                           {user.status === 'active' ? 'Deactivate' : 'Activate'}
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem 
                           onClick={() => setDeleteDialogUser(user)}
                           className="text-destructive"
                         >
                           <Trash2 className="h-4 w-4 mr-2" />
                           Delete User
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EditUserDialog 
        user={selectedUser}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedUser(undefined);
        }}
      />

      <AlertDialog open={!!deleteDialogUser} onOpenChange={() => setDeleteDialogUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for{" "}
              <strong>{deleteDialogUser?.name}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDialogUser && handleDeleteUser(deleteDialogUser)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
