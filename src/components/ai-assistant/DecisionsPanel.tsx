import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDecisionForDisplay, type Decision } from "@/utils/decisionLogger";
import { X, Copy, Archive, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DecisionsPanelProps {
  decisions: Decision[];
  onClose: () => void;
  onArchive?: (decisionId: string) => void;
}

export default function DecisionsPanel({
  decisions,
  onClose,
  onArchive,
}: DecisionsPanelProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDecisions = decisions.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.reasoning.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (decision: Decision) => {
    const text = formatDecisionForDisplay(decision);
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `"${decision.title}" copied to clipboard`,
    });
  };

  const handleArchive = (decisionId: string, title: string) => {
    onArchive?.(decisionId);
    toast({
      title: "Archived",
      description: `"${title}" has been archived`,
    });
  };

  return (
    <Card className="w-96 flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Project Decisions</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
          />
        </div>

        {/* Decisions List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredDecisions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-center">
              <div className="text-sm text-muted-foreground">
                {decisions.length === 0
                  ? "No decisions logged yet"
                  : "No decisions match your search"}
              </div>
            </div>
          ) : (
            filteredDecisions.map((decision) => (
              <div
                key={decision.id}
                className="p-3 bg-muted/50 rounded-lg border space-y-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-tight break-words">
                      {decision.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(decision.createdAt).toLocaleDateString()} •{" "}
                      {decision.ownerName}
                    </p>
                  </div>
                </div>

                <p className="text-xs line-clamp-2 text-muted-foreground">
                  {decision.reasoning}
                </p>

                {decision.tradeoffs && (
                  <div className="text-xs bg-yellow-50 dark:bg-yellow-950 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="font-medium mb-1">Tradeoffs:</p>
                    <p className="line-clamp-1">{decision.tradeoffs}</p>
                  </div>
                )}

                <div className="flex gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(decision)}
                    className="h-6 text-xs flex-1"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(decision.id, decision.title)}
                    className="h-6 text-xs flex-1"
                  >
                    <Archive className="h-3 w-3 mr-1" />
                    Archive
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        {decisions.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Showing {filteredDecisions.length} of {decisions.length} decisions
          </div>
        )}
      </CardContent>
    </Card>
  );
}
