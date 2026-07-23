import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Anthropic } from "npm:@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

interface ExtractedTask {
  title: string;
  description: string;
}

interface ProposalAnalysis {
  projectName: string;
  description: string;
  tasks: ExtractedTask[];
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const { content } = await req.json();

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid or missing content" }),
        { status: 400 }
      );
    }

    const prompt = `You are a project management expert. Analyze the following proposal/document and extract:

1. A clear project name (extract from title or create a concise name)
2. A brief project description (2-3 sentences)
3. A list of actionable items/tasks that need to be completed

For each task, provide:
- A clear, concise title (2-5 words)
- A brief description of what needs to be done

Format your response as JSON with this structure:
{
  "projectName": "string",
  "description": "string",
  "tasks": [
    {
      "title": "string",
      "description": "string"
    }
  ]
}

DOCUMENT CONTENT:
${content}

Return ONLY the JSON object, no other text.`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const analysis = JSON.parse(responseText) as ProposalAnalysis;

    return new Response(JSON.stringify(analysis), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error analyzing proposal:", error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze proposal" }),
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});
