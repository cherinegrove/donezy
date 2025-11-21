import { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Risk {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedItems: string[];
}

interface Success {
  impact: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  items: string[];
}

interface AnalysisResult {
  risks: Risk[];
  successes: Success[];
  summary: string;
  generatedAt: string;
}

export const RiskSuccessWidget = ({ data }: { data: any }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showSuccesses, setShowSuccesses] = useState(false);

  const analyzeRisksAndSuccesses = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('smart-analytics', {
        body: { 
          analysisType: 'risk_success_detection',
          data: {
            projects: data.projects,
            tasks: data.tasks,
            timeEntries: data.timeEntries
          }
        }
      });

      if (error) throw error;
      setAnalysis(result.analysis);
      toast.success("Risk & success analysis complete");
    } catch (error: any) {
      console.error("Analysis error:", error);
      if (error.message?.includes('429')) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error.message?.includes('402')) {
        toast.error("Payment required. Please add funds to your workspace.");
      } else {
        toast.error("Analysis failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
    }
  };

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertTriangle className="h-16 w-16 text-muted-foreground/50" />
        <p className="text-muted-foreground text-center">
          AI-powered analysis will identify risks and celebrate successes
        </p>
        <Button onClick={analyzeRisksAndSuccesses} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Analyze Now
        </Button>
      </div>
    );
  }

  const items = showSuccesses ? analysis.successes : analysis.risks;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={!showSuccesses ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSuccesses(false)}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Risks ({analysis.risks.length})
          </Button>
          <Button
            variant={showSuccesses ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSuccesses(true)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Successes ({analysis.successes.length})
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={analyzeRisksAndSuccesses} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {items.map((item: any, index: number) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                showSuccesses 
                  ? getImpactColor(item.impact) 
                  : getSeverityColor(item.severity)
              } hover:shadow-lg transition-all duration-200`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{item.title}</h4>
                <Badge variant="outline" className="ml-2">
                  {showSuccesses ? item.impact : item.severity}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {item.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {(showSuccesses ? item.items : item.affectedItems)?.map((name: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="pt-4 border-t border-border/50">
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      </div>
    </div>
  );
};
