import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = "https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1";

const ENDPOINTS = ["api-create-client", "api-create-project", "api-create-task"];

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
}

export function ApiKeysCard() {
  const { toast } = useToast();
  // undefined while loading, null when the user is not an owner or admin of any organization
  const [organizationId, setOrganizationId] = useState<string | null | undefined>(undefined);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  // The api_keys table and generate_api_key() are not in the generated types yet
  const db = supabase as any;

  // Keys belong to an organization. Only owners and admins can create them (enforced in the database).
  useEffect(() => {
    const loadOrganization = async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) {
        setOrganizationId(null);
        return;
      }

      const { data, error } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", userId)
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle();

      if (error) {
        toast({ title: "Error", description: "Could not check your organization", variant: "destructive" });
        return;
      }
      setOrganizationId(data?.organization_id ?? null);
    };
    loadOrganization();
  }, [toast]);

  const loadKeys = useCallback(async () => {
    if (!organizationId) return;

    const { data, error } = await db
      .from("api_keys")
      .select("id, name, created_at")
      .eq("organization_id", organizationId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Could not load API keys", variant: "destructive" });
      return;
    }
    setKeys(data ?? []);
  }, [db, organizationId, toast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || !organizationId) return;

    setCreating(true);
    const { data: key, error } = await db.rpc("generate_api_key", {
      p_organization_id: organizationId,
      p_name: trimmed,
    });
    setCreating(false);

    if (error || !key) {
      toast({
        title: "Error",
        description: error?.message || "Could not create the API key",
        variant: "destructive",
      });
      return;
    }

    setName("");
    setNewKey(key as string);
    loadKeys();
  };

  const handleRevoke = async (apiKey: ApiKey) => {
    if (!window.confirm(`Revoke "${apiKey.name}"? Any tool using it will stop working.`)) return;

    const { error } = await db
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", apiKey.id);

    if (error) {
      toast({ title: "Error", description: "Could not revoke the API key", variant: "destructive" });
      return;
    }

    toast({ title: "API key revoked", description: apiKey.name });
    loadKeys();
  };

  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    toast({ title: "Copied", description: "The API key is on your clipboard" });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>
            Let other tools create clients, projects and tasks in Donezy. Anyone with a key can act for your
            organization, so keep keys secret and revoke any you no longer use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {organizationId === undefined ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : organizationId === null ? (
            <p className="text-sm text-muted-foreground">
              Only organization owners and admins can create API keys.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Name this key, e.g. HubSpot sync"
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                />
                <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating ? "Creating..." : "Create key"}
                </Button>
              </div>

              {keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No API keys yet.</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {keys.map((apiKey) => (
                    <li key={apiKey.id} className="flex items-center justify-between gap-4 p-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{apiKey.name}</p>
                        <p className="text-xs text-muted-foreground">
                          created {format(new Date(apiKey.created_at), "d MMM yyyy")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRevoke(apiKey)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-2 text-sm">
                <p className="font-medium">How to use a key</p>
                <p className="text-muted-foreground">
                  Send the key in an <code>x-api-key</code> header. Available endpoints:
                </p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {ENDPOINTS.map((endpoint) => (
                    <li key={endpoint}>
                      <code className="break-all">{`${API_BASE}/${endpoint}`}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={newKey !== null} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy it now. For security it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <code className="block break-all rounded-md bg-muted p-3 text-sm">{newKey}</code>
          <DialogFooter>
            <Button variant="outline" onClick={copyKey}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button onClick={() => setNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
