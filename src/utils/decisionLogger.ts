import { supabase } from "@/integrations/supabase/client";

export interface Decision {
  id: string;
  projectId: string;
  title: string;
  reasoning: string;
  tradeoffs: string;
  ownerId: string;
  ownerName?: string;
  createdAt: string;
  status: "active" | "archived";
}

export async function logDecision(
  projectId: string,
  title: string,
  reasoning: string,
  tradeoffs: string,
  ownerName: string
): Promise<Decision> {
  const { data, error } = await supabase.from("decisions").insert({
    project_id: projectId,
    title,
    reasoning,
    tradeoffs,
    owner_name: ownerName,
    status: "active",
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to log decision: ${error.message}`);
  }

  return data[0];
}

export async function getProjectDecisions(projectId: string): Promise<Decision[]> {
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch decisions: ${error.message}`);
  }

  return (data || []).map((d: any) => ({
    id: d.id,
    projectId: d.project_id,
    title: d.title,
    reasoning: d.reasoning,
    tradeoffs: d.tradeoffs,
    ownerId: d.owner_id,
    ownerName: d.owner_name,
    createdAt: d.created_at,
    status: d.status,
  }));
}

export async function searchDecisions(query: string): Promise<Decision[]> {
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .or(`title.ilike.%${query}%,reasoning.ilike.%${query}%`)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Failed to search decisions: ${error.message}`);
  }

  return (data || []).map((d: any) => ({
    id: d.id,
    projectId: d.project_id,
    title: d.title,
    reasoning: d.reasoning,
    tradeoffs: d.tradeoffs,
    ownerId: d.owner_id,
    ownerName: d.owner_name,
    createdAt: d.created_at,
    status: d.status,
  }));
}

export async function archiveDecision(decisionId: string): Promise<void> {
  const { error } = await supabase
    .from("decisions")
    .update({ status: "archived" })
    .eq("id", decisionId);

  if (error) {
    throw new Error(`Failed to archive decision: ${error.message}`);
  }
}

export function formatDecisionForDisplay(decision: Decision): string {
  return `
DECISION: ${decision.title}
Owner: ${decision.ownerName || "Unknown"}
Date: ${new Date(decision.createdAt).toLocaleDateString()}

REASONING:
${decision.reasoning}

TRADEOFFS:
${decision.tradeoffs}
`.trim();
}
