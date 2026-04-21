
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { TenantAccount, TenantUser, TenantAccountEvent } from "@/types/tenant";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Building2, Users, CreditCard, Settings, Clock,
  Plus, Trash2, UserCog, Shield, Ban, CheckCircle, Archive, AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminPortalAccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [account, setAccount] = useState<TenantAccount | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [events, setEvents] = useState<TenantAccountEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<TenantAccount>>({});
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);

  useEffect(() => {
    if (accountId) {
      fetchAccount();
      fetchUsers();
      fetchEvents();
    }
  }, [accountId]);

  const fetchAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_accounts')
        .select('*')
        .eq('id', accountId)
        .single();
      if (error) throw error;
      const typed = data as unknown as TenantAccount;
      setAccount(typed);
      setEditData(typed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('tenant_users').select('*').eq('account_id', accountId).order('created_at');
    setUsers((data || []) as unknown as TenantUser[]);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('tenant_account_events').select('*').eq('account_id', accountId).order('created_at', { ascending: false }).limit(50);
    setEvents((data || []) as unknown as TenantAccountEvent[]);
  };

  const saveAccount = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('tenant_accounts').update({
        company_name: editData.company_name,
        primary_contact_name: editData.primary_contact_name,
        primary_contact_email: editData.primary_contact_email,
        subscription_tier: editData.subscription_tier,
        subscription_price: editData.subscription_price,
        billing_cycle: editData.billing_cycle,
        auto_renew: editData.auto_renew,
        internal_notes: editData.internal_notes,
        feature_flags: editData.feature_flags,
        account_limits: editData.account_limits,
      }).eq('id', account.id);
      if (error) throw error;

      await logEvent('account_updated', 'Account details updated');
      toast({ title: "Saved", description: "Account updated successfully." });
      setEditMode(false);
      fetchAccount();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (newStatus: TenantAccount['status']) => {
    if (!account) return;
    try {
      const { error } = await supabase.from('tenant_accounts').update({ status: newStatus }).eq('id', account.id);
      if (error) throw error;
      await logEvent('status_changed', `Account status changed to ${newStatus}`);
      toast({ title: "Status Updated", description: `Account is now ${newStatus}.` });
      fetchAccount();
      setShowSuspendConfirm(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const logEvent = async (type: string, description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('tenant_account_events').insert({
      account_id: accountId,
      event_type: type,
      description,
      admin_user_id: user?.id,
    });
  };

  const deleteUser = async (userId: string) => {
    await supabase.from('tenant_users').delete().eq('id', userId);
    await logEvent('user_removed', 'User removed from account');
    fetchUsers();
    toast({ title: "User Removed" });
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  if (!account) return <div className="text-center py-10">Account not found</div>;

  const statusStyles: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-500/20",
    trial: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    cancelled: "bg-muted text-muted-foreground border-border",
    suspended: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin-portal/accounts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{account.company_name}</h1>
            <Badge variant="outline" className={`capitalize ${statusStyles[account.status]}`}>{account.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{account.primary_contact_email || 'No contact email'}</p>
        </div>
        <div className="flex gap-2">
          {account.status === 'suspended' ? (
            <Button variant="outline" size="sm" onClick={() => changeStatus('active')}>
              <CheckCircle className="h-4 w-4 mr-1" /> Reactivate
            </Button>
          ) : account.status !== 'cancelled' ? (
            <Button variant="outline" size="sm" className="text-red-600" onClick={() => setShowSuspendConfirm(true)}>
              <Ban className="h-4 w-4 mr-1" /> Suspend
            </Button>
          ) : null}
          {!editMode ? (
            <Button size="sm" onClick={() => setEditMode(true)}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setEditData(account); }}>Cancel</Button>
              <Button size="sm" onClick={saveAccount} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info"><Building2 className="h-4 w-4 mr-1" /> Account Info</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users ({users.length})</TabsTrigger>
          <TabsTrigger value="subscription"><CreditCard className="h-4 w-4 mr-1" /> Subscription</TabsTrigger>
          <TabsTrigger value="features"><Settings className="h-4 w-4 mr-1" /> Features & Limits</TabsTrigger>
          <TabsTrigger value="timeline"><Clock className="h-4 w-4 mr-1" /> Timeline</TabsTrigger>
        </TabsList>

        {/* Account Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Account Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Company Name</Label>
                {editMode ? (
                  <Input value={editData.company_name || ''} onChange={e => setEditData(d => ({ ...d, company_name: e.target.value }))} />
                ) : (
                  <p className="text-sm mt-1">{account.company_name}</p>
                )}
              </div>
              <div>
                <Label>Primary Contact</Label>
                {editMode ? (
                  <Input value={editData.primary_contact_name || ''} onChange={e => setEditData(d => ({ ...d, primary_contact_name: e.target.value }))} />
                ) : (
                  <p className="text-sm mt-1">{account.primary_contact_name || '—'}</p>
                )}
              </div>
              <div>
                <Label>Contact Email</Label>
                {editMode ? (
                  <Input value={editData.primary_contact_email || ''} onChange={e => setEditData(d => ({ ...d, primary_contact_email: e.target.value }))} />
                ) : (
                  <p className="text-sm mt-1">{account.primary_contact_email || '—'}</p>
                )}
              </div>
              <div>
                <Label>Created</Label>
                <p className="text-sm mt-1">{new Date(account.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <Label>Last Activity</Label>
                <p className="text-sm mt-1">{account.last_activity_at ? new Date(account.last_activity_at).toLocaleDateString() : '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Internal Notes</CardTitle><CardDescription>Only visible to admin users</CardDescription></CardHeader>
            <CardContent>
              {editMode ? (
                <Textarea
                  value={editData.internal_notes || ''}
                  onChange={e => setEditData(d => ({ ...d, internal_notes: e.target.value }))}
                  rows={4}
                  placeholder="Add internal notes about this account..."
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{account.internal_notes || 'No notes yet.'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Account Users</h3>
            <AddUserDialog open={showAddUser} onOpenChange={setShowAddUser} accountId={account.id} onAdded={() => { fetchUsers(); logEvent('user_added', 'User added to account'); }} />
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Login</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No users in this account</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="capitalize text-xs">{u.role}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${u.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteUser(u.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Subscription Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Tier</Label>
                {editMode ? (
                  <Select value={editData.subscription_tier} onValueChange={v => setEditData(d => ({ ...d, subscription_tier: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1 capitalize">{account.subscription_tier}</p>
                )}
              </div>
              <div>
                <Label>Price (MRR)</Label>
                {editMode ? (
                  <Input type="number" step="0.01" value={editData.subscription_price || 0} onChange={e => setEditData(d => ({ ...d, subscription_price: parseFloat(e.target.value) }))} />
                ) : (
                  <p className="text-sm mt-1">${Number(account.subscription_price).toFixed(2)}/mo</p>
                )}
              </div>
              <div>
                <Label>Billing Cycle</Label>
                {editMode ? (
                  <Select value={editData.billing_cycle} onValueChange={v => setEditData(d => ({ ...d, billing_cycle: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1 capitalize">{account.billing_cycle}</p>
                )}
              </div>
              <div>
                <Label>Auto Renew</Label>
                {editMode ? (
                  <div className="mt-2"><Switch checked={editData.auto_renew} onCheckedChange={v => setEditData(d => ({ ...d, auto_renew: v }))} /></div>
                ) : (
                  <p className="text-sm mt-1">{account.auto_renew ? 'Yes' : 'No'}</p>
                )}
              </div>
              <div>
                <Label>Trial End Date</Label>
                <p className="text-sm mt-1">{account.trial_end_date ? new Date(account.trial_end_date).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <Label>Next Billing Date</Label>
                <p className="text-sm mt-1">{account.next_billing_date ? new Date(account.next_billing_date).toLocaleDateString() : '—'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features & Limits Tab */}
        <TabsContent value="features" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Feature Flags</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {account.feature_flags && Object.entries(account.feature_flags).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                    {editMode ? (
                      <Switch
                        checked={editData.feature_flags?.[key as keyof typeof account.feature_flags] ?? false}
                        onCheckedChange={v => setEditData(d => ({
                          ...d,
                          feature_flags: { ...d.feature_flags!, [key]: v }
                        }))}
                      />
                    ) : (
                      <Badge variant="outline" className={value ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}>
                        {value ? 'Enabled' : 'Disabled'}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Account Limits</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {account.account_limits && Object.entries(account.account_limits).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                    {editMode ? (
                      <Input
                        type="number"
                        className="w-24"
                        value={editData.account_limits?.[key as keyof typeof account.account_limits] ?? 0}
                        onChange={e => setEditData(d => ({
                          ...d,
                          account_limits: { ...d.account_limits!, [key]: parseInt(e.target.value) }
                        }))}
                      />
                    ) : (
                      <span className="font-medium text-sm">{value}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {events.map(e => (
                    <div key={e.id} className="flex gap-3 border-l-2 border-border pl-4 pb-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{e.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(e.created_at).toLocaleString()} · <span className="capitalize">{e.event_type.replace(/_/g, ' ')}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Confirmation */}
      <Dialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Suspend Account</DialogTitle>
            <DialogDescription>This will immediately block access for all users in {account.company_name}. Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => changeStatus('suspended')}>Suspend Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddUserDialog({ open, onOpenChange, accountId, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; accountId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('tenant_users').insert({
        account_id: accountId,
        name: name.trim(),
        email: email.trim(),
        role,
      });
      if (error) throw error;
      toast({ title: "User Added" });
      setName(""); setEmail(""); setRole("member");
      onAdded();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button size="sm" onClick={() => onOpenChange(true)}><Plus className="h-4 w-4 mr-1" /> Add User</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User to Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || !name.trim() || !email.trim()}>{saving ? 'Adding...' : 'Add User'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
