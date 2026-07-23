import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Anthropic } from "npm:@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

interface ExtractedTask {
  title: string;
  description: string;
}

interface AssistantResponse {
  message: string;
  tasks?: ExtractedTask[];
  projectName?: string;
  projectDescription?: string;
}

Deno.serve(async (req) => {
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
    const {
      userMessage,
      fileName,
      fileBase64,
      fileType,
      projects,
      recentTasks,
    } = await req.json();

    if (!userMessage || typeof userMessage !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid or missing userMessage" }),
        { status: 400 }
      );
    }

    // Process file if provided
    let fileContent = "";
    if (fileBase64 && fileName) {
      try {
        const binaryString = atob(fileBase64);
        // For text-based files (Excel as CSV, or plain text)
        // For PDF, we'll extract text using a simple approach
        if (fileName.endsWith(".pdf")) {
          // Note: Full PDF parsing would need pdf.js library
          // For now, we'll indicate the file was received
          fileContent = `[PDF file received: ${fileName}. Please describe what you'd like me to extract from it.]`;
        } else if (
          fileName.endsWith(".xlsx") ||
          fileName.endsWith(".xls") ||
          fileName.endsWith(".csv")
        ) {
          // For Excel/CSV, try to extract text
          fileContent = `[Spreadsheet file received: ${fileName}]`;
        } else {
          // Assume text file
          fileContent = binaryString;
        }
      } catch (e) {
        console.error("Error processing file:", e);
        fileContent = `[File received: ${fileName}]`;
      }
    }

    const fullMessage = fileContent
      ? `${userMessage}\n\n${fileContent}`
      : userMessage;

    const systemPrompt = `You are a helpful AI assistant for a project management app called Donezy. Your job is to:
1. Help users create projects and tasks from descriptions
2. Answer questions about their projects and tasks
3. Suggest task breakdowns and improvements
4. Analyze uploaded documents and proposals
5. Provide project planning assistance

When the user describes a project or uploads a document, extract:
- A clear project name
- A brief project description
- A list of actionable items (tasks)

CURRENT USER CONTEXT:
Projects:
${projects || "No projects yet"}

Recent Tasks:
${recentTasks || "No tasks yet"}

${fileName ? `File analyzed: ${fileName}` : ""}

IMPORTANT: Always respond in a conversational manner. If you identify tasks that should be created:
1. First, provide a conversational response explaining what you found
2. Then, if appropriate, include a JSON block at the end with extracted tasks

Format for task extraction (only if tasks should be created):
\`\`\`json
{
  "projectName": "string",
  "projectDescription": "string",
  "tasks": [
    {
      "title": "string",
      "description": "string"
    }
  ]
}
\`\`\`

Always be helpful, concise, and actionable.`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: fullMessage,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Try to extract JSON from the response
    let projectData = null;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        projectData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse extracted JSON:", e);
      }
    }

    const response: AssistantResponse = {
      message: responseText
        .replace(/```json\n[\s\S]*?\n```/, "")
        .trim(),
      ...(projectData && {
        projectName: projectData.projectName,
        projectDescription: projectData.projectDescription,
        tasks: projectData.tasks,
      }),
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in AI assistant:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});
