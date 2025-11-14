import { VOICE, TOOLS, INSTRUCTIONS } from "@/lib/config";
import { ACTIVE_PROVIDER, getCurrentConfig, OPENAI_CONFIG, ALIYUN_CONFIG } from "@/lib/constants";

// Get an ephemeral session token from the /realtime/sessions endpoint
export async function GET() {
  try {
    const config = getCurrentConfig();
    const provider = ACTIVE_PROVIDER;
    
    console.log(`Requesting session from ${provider.toUpperCase()} Realtime API...`);
    console.log(`Using model: ${config.model}`);

    if (provider === "openai") {
      return await createOpenAISession();
    } else if (provider === "aliyun") {
      return await createAliyunSession();
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error: any) {
    console.error("Session creation error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      provider: ACTIVE_PROVIDER
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

// Create OpenAI session
async function createOpenAISession() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const r = await fetch(OPENAI_CONFIG.sessionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_CONFIG.model,
      voice: OPENAI_CONFIG.voice,
      modalities: ["text", "audio"],
      instructions: INSTRUCTIONS,
      tools: TOOLS,
    }),
  });

  if (!r.ok) {
    const errorText = await r.text();
    console.error("OpenAI API error:", r.status, errorText);
    throw new Error(`OpenAI API error: ${r.status} ${errorText}`);
  }

  const sessionData = await r.json();
  console.log("OpenAI session created successfully:", sessionData.id);

  return new Response(JSON.stringify(sessionData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// Create Aliyun session
// Note: Aliyun uses WebSocket directly, no REST session endpoint
async function createAliyunSession() {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY environment variable is not set");
  }

  // Aliyun doesn't have a REST session endpoint like OpenAI
  // Instead, we return the API key for WebSocket authentication
  const sessionData = {
    id: `aliyun-session-${Date.now()}`,
    api_key: process.env.DASHSCOPE_API_KEY,
    workspace: process.env.DASHSCOPE_WORKSPACE || "",
    model: ALIYUN_CONFIG.model,
    voice: ALIYUN_CONFIG.voice,
  };

  console.log("Aliyun session info prepared:", sessionData.id);

  return new Response(JSON.stringify(sessionData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
