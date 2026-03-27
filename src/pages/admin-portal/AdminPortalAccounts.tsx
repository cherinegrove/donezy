
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { TenantAccount, AccountStatusFilter, TierFilter } from "@/types/tenant";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Building2, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type SortField = 'company_name' | 'status' | 'subscription_tier' | 'subscription_price' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function AdminPortalAccounts() {
  const [accounts, setAccounts] = useState<TenantAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const PAGE_SIZE = 50;

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAccounts((data || []) as unknown as TenantAccount[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = accounts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.company_name.toLowerCase().includes(q) ||
        a.primary_contact_email?.toLowerCase().includes(q) ||
        a.primary_contact_name?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
    if (tierFilter !== 'all') result = result.filter(a => a.subscription_tier === tierFilter);
    
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (sortField === 'subscription_price') { valA = Number(valA); valB = Number(valB); }
      if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = (valB || '').toLowerCase(); }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [accounts, search, statusFilter, tierFilter, sortField, sortDir]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const statusStyles: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-500/20",
    trial: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    cancelled: "bg-muted text-muted-foreground border-border",
    suspended: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  const tierStyles: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    starter: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    pro: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    enterprise: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <CreateAccountDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => { fetchAccounts(); setShowCreate(false); }} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as AccountStatusFilter); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v as TierFilter); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {[
                    { label: 'Company', field: 'company_name' as SortField },
                    { label: 'Status', field: 'status' as SortField },
                    { label: 'Tier', field: 'subscription_tier' as SortField },
                    { label: 'MRR', field: 'subscription_price' as SortField },
                    { label: 'Created', field: 'created_at' as SortField },
                  ].map(col => (
                    <th key={col.field} className="text-left px-4 py-3 font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(col.field)}>
                        {col.label}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading...</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No accounts found</td></tr>
                ) : paged.map(a => (
                  <tr
                    key={a.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin-portal/accounts/${a.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{a.company_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize text-xs ${statusStyles[a.status] || ''}`}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize text-xs ${tierStyles[a.subscription_tier] || ''}`}>{a.subscription_tier}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">${Number(a.subscription_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{a.primary_contact_email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateAccountDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tier, setTier] = useState("free");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!companyName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('tenant_accounts').insert({
        company_name: companyName.trim(),
        primary_contact_name: contactName.trim() || null,
        primary_contact_email: contactEmail.trim() || null,
        subscription_tier: tier,
        status: 'trial',
      });
      if (error) throw error;
      toast({ title: "Account Created", description: `${companyName} has been created.` });
      setCompanyName(""); setContactName(""); setContactEmail(""); setTier("free");
      onCreated();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={() => onOpenChange(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogDescription>Add a new tenant account to the platform.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Company Name *</Label>
            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" />
          </div>
          <div>
            <Label>Contact Name</Label>
            <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="John Doe" />
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="john@acme.com" />
          </div>
          <div>
            <Label>Subscription Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !companyName.trim()}>
            {saving ? "Creating..." : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
