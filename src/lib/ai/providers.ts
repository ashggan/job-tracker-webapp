import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, APICallError, type LanguageModel } from "ai";
import type { LlmProvider } from "@prisma/client";

export const SUPPORTED_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<SupportedProvider, string> = {
  anthropic: "Claude (Anthropic)",
  openai: "OpenAI",
  google: "Google (Gemini)",
};

// Cheapest current model per provider — used only to validate a key and,
// eventually, for the AI feature's real calls (M7/M8).
const DEFAULT_MODEL: Record<SupportedProvider, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
  google: "gemini-2.0-flash",
};

function isSupportedProvider(provider: LlmProvider): provider is SupportedProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(provider);
}

export function getLanguageModel(
  provider: LlmProvider,
  apiKey: string,
  modelId?: string
): LanguageModel {
  if (!isSupportedProvider(provider)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  const model = modelId ?? DEFAULT_MODEL[provider];
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
  }
}

export async function validateProviderKey(
  provider: LlmProvider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  if (!isSupportedProvider(provider)) {
    return { valid: false, error: "That provider isn't supported yet" };
  }

  try {
    const model = getLanguageModel(provider, apiKey);
    await generateText({ model, prompt: "Reply with the single word OK.", maxOutputTokens: 5 });
    return { valid: true };
  } catch (error) {
    if (APICallError.isInstance(error)) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return { valid: false, error: "That key was rejected — check it and try again" };
      }
      return {
        valid: false,
        error: `Couldn't validate the key (${error.statusCode ?? "error"}) — try again`,
      };
    }
    return { valid: false, error: "Couldn't reach the provider to validate the key — try again" };
  }
}
