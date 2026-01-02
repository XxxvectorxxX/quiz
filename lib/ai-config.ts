import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

export type AIProvider =
  | "openai"
  | "groq"
  | "anthropic"
  | "google"
  | "routellm"
  | "custom"

interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
  baseURL?: string
}

export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || "openai") as AIProvider
  const apiKey = process.env.AI_API_KEY || ""
  const model = process.env.AI_MODEL || "gpt-4o-mini"
  const baseURL = process.env.AI_BASE_URL

  return { provider, apiKey, model, baseURL }
}

export function getAIModel() {
  const config = getAIConfig()

  if (!config.apiKey) {
    throw new Error(
      "API key de IA não configurada. Configure AI_PROVIDER e AI_API_KEY no .env.local.",
    )
  }

  /**
   * ✅ RouteLLM / Abacus / OpenAI-compatible
   */
  if (config.provider === "routellm" || config.provider === "custom" || config.baseURL) {
    if (!config.baseURL) {
      throw new Error("AI_BASE_URL é obrigatório para provedores customizados")
    }

    const openaiProvider = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })

    return openaiProvider.chat(config.model)
  }

  /**
   * ✅ Providers padrão via string
   */
  return `${config.provider}/${config.model}`
}

export async function generateAIText(prompt: string) {
  const model = getAIModel()

  return await generateText({
    model,
    prompt,
  })
}
