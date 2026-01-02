import { generateText } from "ai"

export type AIProvider = "openai" | "groq" | "anthropic" | "google" | "custom"

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

  // Se tiver API key customizada, usa o formato provider/model
  if (config.apiKey) {
    return `${config.provider}/${config.model}`
  }

  // Senão usa o AI Gateway padrão do Vercel
  return `openai/${config.model}`
}

export async function generateAIText(prompt: string) {
  const modelString = getModelString()

  return await generateText({
    model: modelString,
    prompt,
  })
}
