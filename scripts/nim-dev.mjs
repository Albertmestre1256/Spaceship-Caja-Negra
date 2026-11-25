// Prueba los modelos de NVIDIA NIM con la clave de .env (nunca la imprime).
// Uso: node scripts/nim-dev.mjs <modelo> [stream]
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const env = readFileSync(resolve(import.meta.dirname, "..", ".env"), "utf8")
const apiKey = env.match(/^\s*NVIDIA_API_KEY\s*=\s*(.+)\s*$/m)?.[1].trim()
if (!apiKey) throw new Error("falta NVIDIA_API_KEY en .env")

const model = process.argv[2] ?? "nvidia/nemotron-3.5-lightning-30b-a3b"
const system = `Continuá el texto. El mensaje del usuario es su comienzo, que puede cortarse a mitad de una oración.
- Escribí solo las palabras que siguen, en español rioplatense académico, en texto plano.
- Tu primera palabra sigue directamente a la última palabra del comienzo. No repitas el comienzo.
- Entre 80 y 120 palabras. Terminá con una oración completa.`
const user = `Karl Popper es un filósofo de la ciencia muy distinguido en el ambiente académico del siglo XX. Es un pensador que se adhiere al modelo Nomológico Deductivo –o modelo de cobertura legal–. Sin embargo, su postura autodefinida por él mismo, es la de un Racionalismo Crítico. Es posible vislumbrar dos objetivos en la obra de Popper: En primera instancia,`

const t0 = performance.now()
const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model,
    stream: true,
    max_tokens: 1024,
    chat_template_kwargs: { enable_thinking: false },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  }),
})
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
let first,
  text = "",
  reasoning = ""
const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
let buffer = ""
for (;;) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += value
  const lines = buffer.split("\n")
  buffer = lines.pop()
  for (const line of lines) {
    const data = line.startsWith("data:") ? line.slice(5).trim() : ""
    if (!data || data === "[DONE]") continue
    const delta = JSON.parse(data).choices?.[0]?.delta ?? {}
    if (delta.content) ((first ??= performance.now()), (text += delta.content))
    if (delta.reasoning_content) reasoning += delta.reasoning_content
  }
}
const total = (performance.now() - t0) / 1000
console.log(
  `--- ${model} · primera palabra ${(((first ?? performance.now()) - t0) / 1000).toFixed(1)} s · total ${total.toFixed(1)} s · razonamiento ${reasoning.length} caracteres`,
)
console.log(text.trim())
