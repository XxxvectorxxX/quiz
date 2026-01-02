import { generateText } from "ai"

export type AIProvider = "openai" | "groq" | "anthropic" | "google" | "routellm"

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

export function getModelString(): string {
  const config = getAIConfig()

  if (!config.apiKey) {
    throw new Error(
      "API key de IA não configurada. Configure AI_PROVIDER e AI_API_KEY no arquivo .env.local. Veja o README para instruções.",
    )
  }

  // Usa o formato provider/model com a API key configurada
  return `${config.provider}/${config.model}`
}

export async function generateAIText(prompt: string) {
  const modelString = getModelString()

  return await generateText({
    model: modelString,
    prompt,
  })
}
