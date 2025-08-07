import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserPlus, Trash2, AlertTriangle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type SystemRoleFromDB = Database['public']['Tables']['system_roles']['Row'];
type UserSystemRoleFromDB = Database['public']['Tables']['user_system_roles']['Row'];

interface SystemRole {
  id: string;
  name: 'platform_admin' | 'support_admin';
  description: string | null;
  permissions: any;
}

interface UserSystemRole {
  id: string;
  user_id: string;
  system_role_id: string;
  assigned_by: string;
  assigned_at: string;
  user?: {
    email: string;
    display_name?: string;
  };
  system_role?: SystemRole;
}

export default function SystemRoles() {
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [userSystemRoles, setUserSystemRoles] = useState<UserSystemRole[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load system roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('system_roles')
        .select('*');

      if (rolesError) throw rolesError;
      setSystemRoles((rolesData || []).map(role => ({
        ...role,
        permissions: role.permissions as any
      })));

      // Load user system role assignments
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_system_roles')
        .select(`
          *,
          system_role:system_roles(*)
        `);

      if (userRolesError) throw userRolesError;

      // Get user details for each assignment from public.users table
      const enrichedUserRoles = await Promise.all(
        (userRolesData || []).map(async (userRole) => {
          const { data: userData } = await supabase
            .from('users')
            .select('name, email')
            .eq('auth_user_id', userRole.user_id)
            .single();
          
          return {
            ...userRole,
            user: {
              email: userData?.email || 'Unknown',
              display_name: userData?.name
            }
          };
        })
      );

      setUserSystemRoles(enrichedUserRoles.map(userRole => ({
        ...userRole,
        system_role: userRole.system_role ? {
          ...userRole.system_role,
          permissions: userRole.system_role.permissions as any
        } : undefined
      })));

      // Load users from the public.users table instead of auth admin
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('auth_user_id, name, email');
      
      if (usersError) throw usersError;
      
      // Convert to the format expected by the component
      const formattedUsers = (usersData || []).map(user => ({
        id: user.auth_user_id,
        email: user.email,
        user_metadata: { display_name: user.name }
      }));
      
      setAllUsers(formattedUsers);

    } catch (error) {
      console.error('Error loading system roles data:', error);
      toast({
        title: "Error",
        description: "Failed to load system roles data",
        variant: "destructive"
      });
    }
  };

  const assignSystemRole = async () => {
    if (!selectedUserId || !selectedRoleId) {
      toast({
        title: "Error",
        description: "Please select both a user and a role",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_system_roles')
        .insert({
          user_id: selectedUserId,
          system_role_id: selectedRoleId,
          assigned_by: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "System role assigned successfully"
      });

      setSelectedUserId("");
      setSelectedRoleId("");
      loadData();
    } catch (error) {
      console.error('Error assigning system role:', error);
      toast({
        title: "Error",
        description: "Failed to assign system role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeSystemRole = async (userRoleId: string) => {
    if (!confirm('Are you sure you want to remove this system role assignment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_system_roles')
        .delete()
        .eq('id', userRoleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "System role removed successfully"
      });

      loadData();
    } catch (error) {
      console.error('Error removing system role:', error);
      toast({
        title: "Error",
        description: "Failed to remove system role",
        variant: "destructive"
      });
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'platform_admin':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'support_admin':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getRoleLabel = (roleName: string) => {
    switch (roleName) {
      case 'platform_admin':
        return 'Platform Admin';
      case 'support_admin':
        return 'Support Admin';
      default:
        return roleName;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Roles Management</h2>
        <p className="text-muted-foreground mt-1">
          Manage platform-level administrative roles and permissions
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> System roles grant cross-account access and administrative privileges. Only assign these roles to trusted personnel.
        </AlertDescription>
      </Alert>

      {/* Available System Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Available System Roles
          </CardTitle>
          <CardDescription>
            These are the system-level roles available for assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {systemRoles.map((role) => (
              <div key={role.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getRoleBadgeColor(role.name)} variant="outline">
                    {getRoleLabel(role.name)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {role.description || 'No description available'}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Permissions: {Object.keys(role.permissions || {}).length} defined
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assign System Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign System Role
          </CardTitle>
          <CardDescription>
            Grant system-level access to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {allUsers
                    .filter(user => !userSystemRoles.some(ur => ur.user_id === user.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} {user.user_metadata?.display_name && `(${user.user_metadata.display_name})`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Role</label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {systemRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {getRoleLabel(role.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={assignSystemRole} 
              disabled={loading || !selectedUserId || !selectedRoleId}
            >
              Assign Role
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Current System Role Assignments</CardTitle>
          <CardDescription>
            Users who currently have system-level roles assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userSystemRoles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userSystemRoles.map((userRole) => (
                  <TableRow key={userRole.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{userRole.user?.email}</div>
                        {userRole.user?.display_name && (
                          <div className="text-sm text-muted-foreground">
                            {userRole.user.display_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={getRoleBadgeColor(userRole.system_role?.name || '')} 
                        variant="outline"
                      >
                        {getRoleLabel(userRole.system_role?.name || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(userRole.assigned_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSystemRole(userRole.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No System Roles Assigned</h3>
              <p className="text-muted-foreground">
                No users currently have system-level roles assigned.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}