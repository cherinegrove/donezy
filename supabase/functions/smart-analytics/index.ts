import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisType, data } = await req.json();
    console.log(`Smart Analytics request - Type: ${analysisType}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      throw new Error("Unauthorized");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (analysisType) {
      case "project_health":
        systemPrompt = `You are an expert project management analyst. Analyze project data and provide actionable insights about project health, risks, and recommendations. Focus on:
- Overall project status and completion likelihood
- Task completion rates and velocity
- Overdue tasks and their impact
- Resource allocation efficiency
- Risk identification and mitigation strategies
Format your response as JSON with keys: status (healthy/at-risk/critical), completionProbability (percentage), risks (array), recommendations (array), insights (string).`;
        userPrompt = `Analyze this project data: ${JSON.stringify(data)}`;
        break;

      case "task_insights":
        systemPrompt = `You are a task optimization expert. Analyze task data and provide insights about:
- Optimal task assignments based on workload
- Estimated completion times
- Tasks requiring immediate attention
- Workload distribution
Format your response as JSON with keys: priorityTasks (array), assignmentSuggestions (array), estimatedCompletionDays (number), insights (string).`;
        userPrompt = `Analyze these tasks: ${JSON.stringify(data)}`;
        break;

      case "team_performance":
        systemPrompt = `You are a team performance analyst. Analyze team data and provide insights about:
- Productivity patterns and trends
- Top performers and their characteristics
- Areas for improvement
- Workload balance across team
Format your response as JSON with keys: productivityTrend (increasing/stable/declining), topPerformers (array), improvements (array), workloadBalance (balanced/unbalanced), insights (string).`;
        userPrompt = `Analyze this team data: ${JSON.stringify(data)}`;
        break;

      case "time_tracking":
        systemPrompt = `You are a time tracking and efficiency analyst. Analyze time data and provide insights about:
- Actual vs estimated time patterns
- Time efficiency by project/task type
- Suggestions for better time estimates
- Time waste identification
Format your response as JSON with keys: efficiencyScore (percentage), estimationAccuracy (percentage), timeWasters (array), suggestions (array), insights (string).`;
        userPrompt = `Analyze this time tracking data: ${JSON.stringify(data)}`;
        break;

      case "smart_recommendations":
        systemPrompt = `You are a smart project advisor. Based on all available data, provide actionable recommendations for:
- Task prioritization
- Project status updates
- Risk alerts
- Process improvements
Format your response as JSON with keys: priorityActions (array), statusUpdates (array), alerts (array), processImprovements (array), insights (string).`;
        userPrompt = `Provide recommendations based on this data: ${JSON.stringify(data)}`;
        break;

      case "risk_success_detection":
        systemPrompt = `You are an expert risk and success analyst for project management. Analyze the provided data and identify:

RISKS (identify 3-5 critical issues):
- Overdue projects or tasks
- Projects exceeding allocated hours
- Tasks with no assignees or collaborators
- Projects with poor task completion rates
- Time tracking anomalies

SUCCESSES (identify 3-5 positive achievements):
- Projects completed on time or ahead of schedule
- Tasks with high completion rates
- Efficient time usage vs estimates
- Well-distributed workloads
- High productivity patterns

Format your response as a JSON object with:
{
  "risks": [
    {
      "severity": "critical|high|medium|low",
      "title": "Brief risk title",
      "description": "Detailed explanation of the risk and its potential impact",
      "affectedItems": ["Project/task names that are affected"]
    }
  ],
  "successes": [
    {
      "impact": "high|medium|low",
      "title": "Brief success title",
      "description": "Detailed explanation of the achievement",
      "items": ["Project/task names involved"]
    }
  ],
  "summary": "Overall assessment of team health and performance",
  "generatedAt": "${new Date().toISOString()}"
}`;
        userPrompt = `Analyze this project management data and identify risks and successes: ${JSON.stringify(data)}`;
        break;

      default:
        throw new Error("Invalid analysis type");
    }

    console.log(`Calling Lovable AI with model: google/gemini-2.5-flash`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    const analysis = JSON.parse(content);

    console.log(`Analysis completed successfully for type: ${analysisType}`);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in smart-analytics function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
