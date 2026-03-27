
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { TenantAuditLog } from "@/types/tenant";
import { Search, Shield } from "lucide-react";

export default function AdminPortalAuditLog() {
  const [logs, setLogs] = useState<TenantAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('tenant_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setLogs((data || []) as unknown as TenantAuditLog[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = search
    ? logs.filter(l => l.action_type.toLowerCase().includes(search.toLowerCase()) || JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Track all admin actions across the platform</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">No audit logs found</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="border-b">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium capitalize">{l.action_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-md truncate">{JSON.stringify(l.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
