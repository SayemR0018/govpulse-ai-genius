import { generateText } from "ai";

export async function aiText(key: string, prompt: string, system?: string) {
  const { createLovableAiGatewayProvider, DEFAULT_MODEL } = await import("@/lib/ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway(DEFAULT_MODEL),
    system,
    prompt,
  });
  return text;
}