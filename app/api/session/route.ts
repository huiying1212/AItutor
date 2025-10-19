import { VOICE, TOOLS, INSTRUCTIONS } from "@/lib/config";
import { MODEL } from "@/lib/constants";

// Get an ephemeral session token from the /realtime/sessions endpoint
export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    console.log("Requesting session from OpenAI Realtime API...");
    
    const r = await fetch("https://api.openai-proxy.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        voice: VOICE,
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
    console.log("Session created successfully:", sessionData.id);

    return new Response(JSON.stringify(sessionData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Session creation error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
