import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { LlmProvider } from "@prisma/client";

export const SUPPORTED_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

// Cheapest current model per provider -- fine for small, well-defined
// extraction tasks like pulling name/title/email/summary out of resume text.
const DEFAULT_MODEL: Record<SupportedProvider, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
  google: "gemini-3.6-flash",
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
