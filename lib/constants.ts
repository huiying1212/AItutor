// AI Provider Configuration
export type AIProvider = "openai" | "aliyun";

// OpenAI Configuration
export const OPENAI_CONFIG = {
  model: "gpt-realtime-mini",
  baseUrl: "https://api.openai-proxy.com/v1/realtime",
  sessionUrl: "https://api.openai-proxy.com/v1/realtime/sessions",
  voice: "coral"
} as const;

// Aliyun Configuration
export const ALIYUN_CONFIG = {
  model: "qwen3-omni-flash-realtime",
  baseUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
  sessionUrl: null, // Aliyun doesn't use REST session endpoint, uses WebSocket directly
  voice: "Cherry" // Aliyun voice options (Cherry, Ethan, Nofish, Jennifer, Ryan, Katerina, Elias, etc.)
} as const;

// Current active provider - change this to switch between providers
export const ACTIVE_PROVIDER = "aliyun" as AIProvider; // Change to "openai" to use OpenAI

// Get current configuration based on active provider
export function getCurrentConfig() {
  if (ACTIVE_PROVIDER === "openai") {
    return OPENAI_CONFIG;
  }
  return ALIYUN_CONFIG;
}

// Export for backward compatibility
export const MODEL = getCurrentConfig().model;
export const BASE_URL = getCurrentConfig().baseUrl;
