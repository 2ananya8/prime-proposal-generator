import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "./app-config";

export function createAnthropicClient() {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY in .env");
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}
