
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TenantAccount } from "@/types/tenant";
import { Building2, DollarSign, Users, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminPortalDashboard() {
  const [accounts, setAccounts] = useState<TenantAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAccounts((data || []) as unknown as TenantAccount[]);
    } catch (e) {
      console.error('Error fetching accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const active = accounts.filter(a => a.status === 'active').length;
    const trial = accounts.filter(a => a.status === 'trial').length;
    const cancelled = accounts.filter(a => a.status === 'cancelled').length;
    const suspended = accounts.filter(a => a.status === 'suspended').length;
    const mrr = accounts
      .filter(a => a.status === 'active')
      .reduce((sum, a) => sum + Number(a.subscription_price), 0);
    const arr = mrr * 12;
    return { active, trial, cancelled, suspended, total: accounts.length, mrr, arr };
  }, [accounts]);

  const attentionAccounts = useMemo(() => {
    const now = new Date();
    return accounts.filter(a => {
      if (a.status === 'suspended') return true;
      if (a.status === 'trial' && a.trial_end_date) {
        const daysLeft = Math.ceil((new Date(a.trial_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 7;
      }
      return false;
    });
  }, [accounts]);

  const topAccounts = useMemo(() => {
    return [...accounts]
      .filter(a => a.status === 'active')
      .sort((a, b) => Number(b.subscription_price) - Number(a.subscription_price))
      .slice(0, 10);
  }, [accounts]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Multi-tenant account overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.total}</div>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">{stats.active} active</Badge>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">{stats.trial} trial</Badge>
              {stats.suspended > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">{stats.suspended} suspended</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">${stats.mrr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">ARR: ${stats.arr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.active}</div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(1) : '0.0'}%
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stats.cancelled} cancelled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accounts Needing Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Accounts Needing Attention
            </CardTitle>
            <CardDescription>{attentionAccounts.length} accounts require action</CardDescription>
          </CardHeader>
          <CardContent>
            {attentionAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts need attention right now.</p>
            ) : (
              <div className="space-y-3">
                {attentionAccounts.slice(0, 5).map(a => (
                  <div 
                    key={a.id} 
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/admin-portal/accounts/${a.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{a.company_name}</p>
                      <p className="text-xs text-muted-foreground">{a.primary_contact_email}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Accounts by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Top Accounts by Revenue
            </CardTitle>
            <CardDescription>Highest MRR accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {topAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active accounts yet.</p>
            ) : (
              <div className="space-y-3">
                {topAccounts.map((a, i) => (
                  <div 
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/admin-portal/accounts/${a.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{a.company_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.subscription_tier}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">${Number(a.subscription_price).toFixed(2)}/mo</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-500/20",
    trial: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    cancelled: "bg-muted text-muted-foreground border-border",
    suspended: "bg-red-500/10 text-red-600 border-red-500/20",
  };
  return (
    <Badge variant="outline" className={cn("capitalize text-xs", styles[status] || "")}>
      {status}
    </Badge>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
