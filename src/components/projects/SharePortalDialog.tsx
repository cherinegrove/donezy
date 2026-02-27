import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Link2, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SharePortalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export function SharePortalDialog({ open, onOpenChange, projectId, projectName }: SharePortalDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const portalUrl = portalToken
    ? `${window.location.origin}/portal/${portalToken}`
    : null;

  useEffect(() => {
    if (open) {
      loadExistingPortal();
    }
  }, [open, projectId]);

  const loadExistingPortal = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("client_portals")
        .select("token")
        .eq("project_id", projectId)
        .eq("created_by", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        setPortalToken(data.token);
      }
    } catch (err) {
      console.error("Error loading portal:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("client_portals")
        .insert({
          project_id: projectId,
          created_by: session.user.id,
          is_active: true,
        })
        .select("token")
        .single();

      if (error) throw error;
      setPortalToken(data.token);
      toast({ title: "Portal link created!", description: "Share it with your client." });
    } catch (err) {
      toast({ title: "Error", description: "Could not create portal link.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Portal link copied to clipboard." });
  };

  const handleRevoke = async () => {
    if (!portalToken) return;
    setRevoking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("client_portals")
        .update({ is_active: false })
        .eq("token", portalToken)
        .eq("created_by", session.user.id);

      if (error) throw error;
      setPortalToken(null);
      toast({ title: "Link revoked", description: "The portal link has been deactivated." });
    } catch (err) {
      toast({ title: "Error", description: "Could not revoke link.", variant: "destructive" });
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Share with Client
          </DialogTitle>
          <DialogDescription>
            Generate a secure, read-only link for <strong>{projectName}</strong>. Clients can view project progress, tasks, time tracked, and leave comments — no login required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : portalToken ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Portal Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={portalUrl || ""}
                    readOnly
                    className="text-xs font-mono bg-muted"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
                  Active
                </Badge>
                <span className="text-xs text-muted-foreground">Anyone with this link can view the portal</span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(portalUrl!, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
                  onClick={handleRevoke}
                  disabled={revoking}
                >
                  {revoking ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Revoke Link
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No portal link yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Generate a unique, shareable link for this project
                </p>
              </div>
              <Button onClick={handleGenerateLink} disabled={loading} className="w-full">
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" /> Generate Portal Link</>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
