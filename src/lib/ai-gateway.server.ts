import Anthropic from "@anthropic-ai/sdk";

// Direct Anthropic client — no Lovable proxy needed.
export function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY in .env");
  return new Anthropic({ apiKey });
}
