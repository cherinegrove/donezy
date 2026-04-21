
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TenantAccount } from "@/types/tenant";
import { DollarSign, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function AdminPortalFinancials() {
  const [accounts, setAccounts] = useState<TenantAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('tenant_accounts').select('*');
      setAccounts((data || []) as unknown as TenantAccount[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const stats = useMemo(() => {
    const active = accounts.filter(a => a.status === 'active');
    const mrr = active.reduce((s, a) => s + Number(a.subscription_price), 0);
    const byTier = ['free', 'starter', 'pro', 'enterprise'].map(tier => ({
      name: tier,
      value: active.filter(a => a.subscription_tier === tier).reduce((s, a) => s + Number(a.subscription_price), 0),
      count: active.filter(a => a.subscription_tier === tier).length,
    }));
    return { mrr, arr: mrr * 12, byTier };
  }, [accounts]);

  const COLORS = ['hsl(var(--muted-foreground))', 'hsl(210, 70%, 50%)', 'hsl(270, 50%, 50%)', 'hsl(30, 80%, 50%)'];

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financials</h1>
        <p className="text-muted-foreground">Revenue overview and billing metrics</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.mrr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">ARR</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.arr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Paid Accounts</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.filter(a => a.status === 'active' && a.subscription_tier !== 'free').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Free Accounts</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.filter(a => a.subscription_tier === 'free').length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byTier.filter(t => t.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                  >
                    {stats.byTier.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tier Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.byTier.map((tier, i) => (
                <div key={tier.name} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <div>
                      <p className="font-medium capitalize text-sm">{tier.name}</p>
                      <p className="text-xs text-muted-foreground">{tier.count} accounts</p>
                    </div>
                  </div>
                  <span className="font-semibold">${tier.value.toFixed(2)}/mo</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
