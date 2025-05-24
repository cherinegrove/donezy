
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AddUserCard() {
  const { addUser, clients } = useAppContext();
  const { toast } = useToast();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "developer" as const,
    clientId: "",
  });

  const handleAddUser = () => {
    if (!formData.name || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addUser({
      name: formData.name,
      email: formData.email,
      role: formData.role,
      teamIds: [],
    });

    toast({
      title: "Success",
      description: "User added successfully",
    });

    setFormData({ name: "", email: "", role: "developer", clientId: "" });
    setIsAddingUser(false);
  };

  const handleAddGuest = () => {
    if (!formData.name || !formData.email || !formData.clientId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields including client assignment",
        variant: "destructive",
      });
      return;
    }

    addUser({
      name: formData.name,
      email: formData.email,
      role: "client",
      clientId: formData.clientId,
      teamIds: [],
      permissions: {
        canViewProjects: true,
        canViewTasks: true,
        canEditTasks: true,
        canViewClients: false,
        canEditClients: false,
        canViewReports: false,
        canManageUsers: false,
      },
    });

    toast({
      title: "Success",
      description: "Guest user added successfully",
    });

    setFormData({ name: "", email: "", role: "developer", clientId: "" });
    setIsAddingGuest(false);
  };

  if (isAddingUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
          <CardDescription>Create a new team member with full access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddUser}>Add User</Button>
            <Button variant="outline" onClick={() => setIsAddingUser(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isAddingGuest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Guest User</CardTitle>
          <CardDescription>Create a guest user with limited access to specific client projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Name</Label>
              <Input
                id="guest-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email</Label>
              <Input
                id="guest-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Assign to Client</Label>
            <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddGuest}>Add Guest</Button>
            <Button variant="outline" onClick={() => setIsAddingGuest(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsAddingUser(true)}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Plus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Add User</h3>
          <p className="text-sm text-muted-foreground text-center">
            Create a new team member with full system access
          </p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsAddingGuest(true)}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Add Guest</h3>
          <p className="text-sm text-muted-foreground text-center">
            Create a guest user with limited access to specific client projects
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
