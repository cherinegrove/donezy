
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AccountLimits, GuestUser } from "@/types/subscription";
import { 
  Users, 
  Plus, 
  UserPlus,
  Mail,
  Settings,
  AlertCircle,
  Crown
} from "lucide-react";

export function GuestManagement() {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  
  const [accountLimits, setAccountLimits] = useState<AccountLimits | null>(null);
  const [guestUsers, setGuestUsers] = useState<GuestUser[]>([]);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [guestForm, setGuestForm] = useState({
    name: "",
    email: "",
    permissions: {
      canViewProjects: true,
      canViewTasks: true,
      canEditTasks: false,
      canViewClients: false,
      canViewReports: false,
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchAccountLimits();
      fetchGuestUsers();
    }
  }, [currentUser]);

  const fetchAccountLimits = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase.rpc('get_account_limits', {
        account_user_id: currentUser.id
      });
      
      if (error) throw error;
      if (data && data.length > 0) {
        setAccountLimits(data[0]);
      }
    } catch (error) {
      console.error('Error fetching account limits:', error);
      toast({
        title: "Error",
        description: "Failed to fetch account limits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestUsers = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('guest_of_user_id', currentUser.id)
        .eq('is_guest', true);
      
      if (error) throw error;
      setGuestUsers(data || []);
    } catch (error) {
      console.error('Error fetching guest users:', error);
    }
  };

  const handleAddGuest = async () => {
    if (!currentUser || !accountLimits) return;
    
    if (!accountLimits.can_add_guest) {
      toast({
        title: "Guest Limit Reached",
        description: "You've reached your guest limit. Upgrade your plan to add more guests.",
        variant: "destructive",
      });
      return;
    }

    if (!guestForm.name || !guestForm.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Insert new guest user
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: guestForm.name,
          email: guestForm.email,
          role: 'client',
          is_guest: true,
          guest_of_user_id: currentUser.id,
          guest_permissions: guestForm.permissions,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Guest Added",
        description: `${guestForm.name} has been added as a guest user`,
      });

      // Reset form and refresh data
      setGuestForm({
        name: "",
        email: "",
        permissions: {
          canViewProjects: true,
          canViewTasks: true,
          canEditTasks: false,
          canViewClients: false,
          canViewReports: false,
        }
      });
      setIsAddingGuest(false);
      fetchAccountLimits();
      fetchGuestUsers();
      
    } catch (error) {
      console.error('Error adding guest:', error);
      toast({
        title: "Error",
        description: "Failed to add guest user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGuest = async (guestId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', guestId);

      if (error) throw error;

      toast({
        title: "Guest Removed",
        description: "Guest user has been removed",
      });

      fetchAccountLimits();
      fetchGuestUsers();
    } catch (error) {
      console.error('Error removing guest:', error);
      toast({
        title: "Error",
        description: "Failed to remove guest user",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-center">Loading guest management...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Limits Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Account Usage
          </CardTitle>
          <CardDescription>
            Track your current usage and available slots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accountLimits && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Users</span>
                  <Badge variant="outline">
                    {accountLimits.current_users} / {accountLimits.max_users}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(accountLimits.current_users / accountLimits.max_users) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Guests</span>
                  <Badge variant="outline">
                    {accountLimits.current_guests} / {accountLimits.max_guests}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(accountLimits.current_guests / accountLimits.max_guests) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Guest Form */}
      {isAddingGuest ? (
        <Card>
          <CardHeader>
            <CardTitle>Add Guest User</CardTitle>
            <CardDescription>
              Invite a guest user with limited access to your projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest-name">Name</Label>
                <Input
                  id="guest-name"
                  value={guestForm.name}
                  onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                  placeholder="Enter guest name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-email">Email</Label>
                <Input
                  id="guest-email"
                  type="email"
                  value={guestForm.email}
                  onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                  placeholder="Enter guest email"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              <div className="space-y-3">
                {Object.entries(guestForm.permissions).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm font-normal">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Label>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => 
                        setGuestForm({
                          ...guestForm,
                          permissions: { ...guestForm.permissions, [key]: checked }
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddGuest} disabled={loading}>
                <Mail className="h-4 w-4 mr-2" />
                Add Guest
              </Button>
              <Button variant="outline" onClick={() => setIsAddingGuest(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Guest Users
                </CardTitle>
                <CardDescription>
                  Manage guest access to your projects
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsAddingGuest(true)}
                disabled={!accountLimits?.can_add_guest}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Guest
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!accountLimits?.can_add_guest && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    You've reached your guest limit. Additional guests cost $1/month each.
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {guestUsers.map((guest) => (
                <div key={guest.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={guest.avatar} />
                      <AvatarFallback>
                        {guest.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{guest.name}</p>
                      <p className="text-sm text-muted-foreground">{guest.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Guest</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveGuest(guest.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              {guestUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No guest users added yet</p>
                  <p className="text-sm">Invite guests to give them limited access to your projects</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
