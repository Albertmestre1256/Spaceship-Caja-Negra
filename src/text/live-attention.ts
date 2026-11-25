import { streamCompletion, WRITER_MODEL } from "../llm/nim.ts"
import type { AttentionBox, AttentionSource } from "./attention.ts"
import { wordSpans } from "./segments.ts"

const MAX_BOXES = 3

/** The boxes are the model's own answer to this question, matched back into the text; nothing is read from inside the model. */
const SYSTEM_PROMPT = `
El mensaje del usuario es el comienzo de un texto, cortado donde está el lector. Elegí las frases que ya están en él de las que más dependen las palabras que siguen: las influencias principales sobre lo que viene justo después del corte.

- Elegí de 1 a 3 frases: 1 cuando una sola frase empuja lo que sigue, más solo cuando varias lo hacen.
- Cada frase es una copia exacta y sin cortes de 2 a 8 palabras seguidas del texto. No saltees, cambies, agregues ni adivines palabras.
- En cada frase, poné entre [corchetes] la única palabra que más importa.
- Escribí una frase por línea y nada más.

EJEMPLO
Usuario: Para Popper, la Historia no puede formular leyes del desarrollo histórico, pero no significa que no las use. Una historia a veces comprende afirmaciones tan
Asistente:
no puede formular [leyes] del desarrollo
no significa que no las [use]
comprende afirmaciones [tan]
`.trim()

export const liveAttention: AttentionSource = async function* (text, signal) {
  const textWords = wordsOf(text)
  const yielded = new Set<number>()
  const deltas = streamCompletion({ model: WRITER_MODEL, label: "recuadros de «atención»", system: SYSTEM_PROMPT, user: text, signal })

  for await (const line of linesOf(deltas)) {
    const box = boxFromLine(line, textWords)
    if (!box || yielded.has(box.keyword)) continue
    yielded.add(box.keyword)
    yield box
    if (yielded.size >= MAX_BOXES) return
  }
}

async function* linesOf(deltas: AsyncIterable<string>) {
  let buffer = ""
  for await (const delta of deltas) {
    const lines = (buffer + delta).split("\n")
    buffer = lines.pop()!
    yield* lines
  }
  yield buffer
}

function boxFromLine(line: string, textWords: string[]): AttentionBox | undefined {
  const open = line.indexOf("[")
  const close = line.indexOf("]", open)
  const hasBrackets = open !== -1 && close !== -1
  const phrase = wordsOf(line.replace(/[[\]]/g, ""))
  if (!phrase.length) return

  const keywordWords = hasBrackets ? wordsOf(line.slice(open + 1, close)) : []
  const offset = hasBrackets ? wordsOf(line.slice(0, open)).length : phrase.length - 1
  const keyword = hasBrackets ? keywordWords[0] : phrase[offset]

  const at = lastIndexOfSequence(textWords, phrase)
  if (at !== -1 && offset < phrase.length) return { keyword: at + offset, before: offset, after: phrase.length - 1 - offset }

  const keywordAt = hasBrackets && keyword ? textWords.lastIndexOf(keyword) : -1
  if (keywordAt !== -1) return { keyword: keywordAt, before: 0, after: 0 }
}

function lastIndexOfSequence(haystack: string[], needle: string[]) {
  for (let at = haystack.length - needle.length; at >= 0; at--) {
    if (needle.every((word, i) => haystack[at + i] === word)) return at
  }
  return -1
}

function wordsOf(text: string) {
  const normalized = text.replaceAll("’", "'")
  return wordSpans(normalized).map(({ start, end }) => normalized.slice(start, end).toLowerCase())
}
