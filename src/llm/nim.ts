import { recordCall } from "./xray.ts"

/** Through the dev server's proxy (vite.config.ts), which adds the key from `.env`. */
const API_URL = "/nim/chat/completions"
const MAX_TOKENS = 4096

/** Writes what the audience reads, the continuation and the attention boxes, and gives the scores: the helper judged them poorly in tests. */
export const WRITER_MODEL = "nvidia/nemotron-3-ultra-550b-a55b"
/** Offers the axes for the future knobs, where speed matters more than judgment. */
export const HELPER_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b"

export type CompletionRequest = {
  model: string
  /** Names the call in the x-ray panel. */
  label: string
  system: string
  user: string
  signal: AbortSignal
}

export async function* streamCompletion(request: CompletionRequest) {
  const call = recordCall(`${request.label} · ${shortName(request.model)}`, request.system, request.user)
  try {
    const response = await post(request, true)
    if (!response.body) throw new Error("respuesta sin contenido")
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        const content = contentOf(line)
        if (!content) continue
        call.append(content)
        yield content
      }
    }
    call.finish()
  } catch (error) {
    call.finish(error)
    throw error
  }
}

/** One answer that should be a JSON object; the first `{…}` in the reply is parsed, since these models have no enforced JSON mode. */
export async function requestJson<T>(request: CompletionRequest): Promise<T> {
  const call = recordCall(`${request.label} · ${shortName(request.model)}`, request.system, request.user)
  try {
    const response = await post(request, false)
    const text: string = (await response.json()).choices?.[0]?.message?.content ?? ""
    call.append(text)
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    if (!json) throw new Error("la respuesta no trae un objeto JSON")
    const parsed = JSON.parse(json) as T
    call.finish()
    return parsed
  } catch (error) {
    call.finish(error)
    throw error
  }
}

async function post({ model, system, user, signal }: CompletionRequest, stream: boolean) {
  const response = await fetch(API_URL, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream,
      max_tokens: MAX_TOKENS,
      chat_template_kwargs: { enable_thinking: false },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  })
  if (response.status === 401 || response.status === 403) throw new Error("NVIDIA rechazó la clave: revisá NVIDIA_API_KEY en .env y reiniciá npm run dev")
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
  return response
}

function contentOf(line: string) {
  const data = line.startsWith("data:") ? line.slice(5).trim() : ""
  if (!data || data === "[DONE]") return ""
  return (JSON.parse(data).choices?.[0]?.delta?.content as string | undefined) ?? ""
}

function shortName(model: string) {
  return model.replace(/^nvidia\//, "")
}
