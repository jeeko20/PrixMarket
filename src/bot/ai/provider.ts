/**
 * Abstraction du fournisseur IA — interchangeable sans modifier la logique du bot.
 * Une seule implémentation générique `OpenAICompatibleProvider` couvre
 * Mistral, DeepSeek et tout fournisseur compatible avec le format OpenAI
 * (`POST /v1/chat/completions`).
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown> // schéma JSON
  }
}

export interface AIResponse {
  text: string
  toolCalls?: Array<{
    name: string
    args: Record<string, unknown>
  }>
}

export interface AIProvider {
  chat(
    messages: ChatMessage[],
    options?: { tools?: ToolDef[]; toolChoice?: 'auto' | 'none' }
  ): Promise<AIResponse>
}

/**
 * Implémentation générique compatible OpenAI — fonctionne pour :
 *  - OpenAI direct
 *  - Mistral (https://api.mistral.ai/v1/chat/completions)
 *  - DeepSeek (https://api.deepseek.com/v1/chat/completions)
 *  - Tout fournisseur compatible OpenAI
 */
export class OpenAICompatibleProvider implements AIProvider {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private model: string
  ) {}

  async chat(
    messages: ChatMessage[],
    options?: { tools?: ToolDef[]; toolChoice?: 'auto' | 'none' }
  ): Promise<AIResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: 0.3,
      max_tokens: 600,
    }
    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools
      body.tool_choice = options.toolChoice ?? 'auto'
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => 'erreur inconnue')
      throw new Error(`Erreur IA (${res.status}) : ${txt}`)
    }

    const json = await res.json()
    const choice = json?.choices?.[0]
    if (!choice) {
      throw new Error('Réponse IA vide')
    }

    const message = choice.message
    const text: string = message?.content ?? ''
    const toolCalls = message?.tool_calls as
      | Array<{
          function: { name: string; arguments: string }
        }>
      | undefined

    const parsedToolCalls = toolCalls?.map((tc) => {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.function.arguments)
      } catch {
        args = {}
      }
      return { name: tc.function.name, args }
    })

    return {
      text,
      toolCalls: parsedToolCalls && parsedToolCalls.length > 0 ? parsedToolCalls : undefined,
    }
  }
}

/**
 * Construit le provider IA en fonction des variables d'environnement.
 * Retourne null si la configuration est absente → le bot fonctionne en mode commandes strictes.
 */
export function getAIProviderFromEnv(): AIProvider | null {
  const apiKey = process.env.AI_API_KEY?.trim()
  const baseUrl = process.env.AI_API_BASE_URL?.trim()
  const model = process.env.AI_MODEL?.trim()

  if (!apiKey || !baseUrl || !model) {
    return null
  }

  return new OpenAICompatibleProvider(baseUrl, apiKey, model)
}
