import { streamCompletion, WRITER_MODEL } from "../llm/nim.ts"
import { STORY_OPENINGS } from "../story/openings.ts"
import { STORY_MAX_WORDS, STORY_REQUEST } from "../story/prompt.ts"
import { strengthLevelOf, valueOf, type Control } from "./dimension.ts"
import type { Steering, TextSource } from "./text-stream.ts"
import { countWords } from "./words.ts"

const STEERED_SYSTEM_PROMPT = `Continuá el texto. Es un ensayo académico de teoría e historia de la historiografía. El mensaje del usuario puede traer FRASES CLAVE y CONTROLES, y después EL TEXTO HASTA AHORA, que puede cortarse a mitad de una oración.

- Escribí solo las palabras que siguen. Tu primera palabra sigue directamente a la última palabra del texto: si se corta a mitad de una oración, terminá esa oración primero; si termina con una oración completa, empezá una nueva con mayúscula. Nunca repitas ni reinicies nada del texto, ni siquiera su última palabra: después de "…la Historia no puede" escribí "formular leyes, y…", nunca "no puede formular" ni "La Historia no puede formular".
- Las frases clave guían lo que sigue: construí la continuación sobre ellas, sobre todo sobre las palabras entre [corchetes]. Los corchetes solo marcan la palabra en este mensaje: en tu texto escribí la palabra sin corchetes, nunca "[palabra]".
- Los controles fijan cómo se lee el pasaje siguiente. Cada uno es una dimensión dada solo por su nombre y sus polos u opciones: deducí de las etiquetas qué cambiar en el argumento, el foco o el estilo. Una escala da una posición entre dos polos: en un extremo, exagerá ese polo para que un lector lo note en dos oraciones; a mitad de camino, equilibrá los dos. Una opción nombra la alternativa a seguir. Cada control termina con una intensidad entre paréntesis que fija cuánto pesa en el pasaje. Fuerte: domina cada oración. Moderada: una influencia clara en todo el pasaje. Leve: mostralo en uno o dos toques, como una sola oración, y por lo demás escribí el pasaje como lo pedirían el argumento, las frases clave y los controles más fuertes; un control leve nunca define el carácter general del pasaje. La intensidad es distinta del valor y reemplaza la regla de exagerar: exagerá un polo solo con intensidad fuerte. Respetá cada control de la primera oración a la última, pero nunca escribas una etiqueta como palabras del texto.
- Si hay de los dos, las frases clave son el contenido y los controles son la manera: lo que sigue sale de las frases clave, cuyas palabras entre corchetes aparecen en las dos primeras oraciones, escritas de la manera que piden los controles.
- Escribí en español rioplatense, en registro académico y en texto plano: sin título, sin markdown (nada de asteriscos ni guiones bajos para resaltar) y sin comentarios. Los títulos de obras van entre comillas.
- Escribí entre 120 y 300 palabras, nunca más de ${STORY_MAX_WORDS}. Terminá con una oración completa.

EJEMPLO
Usuario:
FRASES CLAVE
pretende precipitar abajo el [neopositivismo]

CONTROLES
postura: muy crítica

EL TEXTO HASTA AHORA
Popper al refutar el historicismo, también pretende precipitar abajo el neopositivismo. Sin embargo,
Asistente:
esa doble refutación descansa en una lectura discutible: el neopositivismo que Popper combate se parece más a una caricatura que a las tesis efectivas del Círculo de Viena.`

const MAX_ECHO_WORDS = 6

const STEERED_REQUEST = { ...STORY_REQUEST, system: STEERED_SYSTEM_PROMPT }

export const liveSource: TextSource = { expand: expandToStoryStart, complete: completeStory }

/** Picks a random opening that begins with the same words as `text`. */
function expandToStoryStart(text: string) {
  const words = text.match(/\S+/g) ?? []
  const candidates = STORY_OPENINGS.filter((start) => {
    const startWords = start.split(/\s+/)
    return startWords.length >= words.length && words.every((word, i) => word === startWords[i])
  })
  return candidates[Math.floor(Math.random() * candidates.length)] ?? text
}

async function* completeStory(prefix: string, steering: Steering, signal: AbortSignal) {
  const isSteered = steering.leads.length > 0 || steering.controls.length > 0
  const request = isSteered
    ? { ...STEERED_REQUEST, label: "continuación dirigida", user: steeredUserMessage(prefix, steering) }
    : { ...STORY_REQUEST, label: "continuación", user: prefix.trim() ? prefix : STORY_OPENINGS[0] }
  let head: string | undefined = ""
  for await (const delta of streamCompletion({ ...request, model: WRITER_MODEL, signal })) {
    if (head === undefined) {
      yield plainText(delta)
      continue
    }
    head += delta
    if (countWords(head) <= MAX_ECHO_WORDS) continue
    yield ` ${plainText(sentenceCased(prefix, withoutEcho(prefix, head)))}`
    head = undefined
  }
  const rest = head && sentenceCased(prefix, withoutEcho(prefix, head))
  if (rest) yield ` ${plainText(rest)}`
}

/** After a finished sentence the continuation starts a new one, even when the model carries on in lower case. */
function sentenceCased(prefix: string, text: string) {
  if (!/[.?!…]["»”)]?\s*$/.test(prefix)) return text
  return text.replace(/^(\P{L}*)(\p{Ll})/u, (_, lead: string, letter: string) => lead + letter.toUpperCase())
}

/** Drops the leading words of `head` that repeat the last words of `prefix`, which the model sometimes echoes before it continues. */
function withoutEcho(prefix: string, head: string) {
  const start = head.trimStart()
  const tail = (prefix.match(/\S+/g) ?? []).slice(-MAX_ECHO_WORDS).map(bareWord)
  const words = [...start.matchAll(/\S+/g)]
  for (let count = Math.min(tail.length, words.length); count > 0; count--) {
    const isEcho = tail.slice(-count).every((word, i) => word !== "" && word === bareWord(words[i][0]))
    if (isEcho) return start.slice(words[count - 1].index + words[count - 1][0].length).trimStart()
  }
  return start
}

function bareWord(word: string) {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")
}

/** Empty blocks are left out, header included. */
function steeredUserMessage(prefix: string, { leads, controls }: Steering) {
  const blocks = [
    ["FRASES CLAVE", leads.map(({ before, keyword, after }) => `${before}[${keyword}]${after}`)],
    ["CONTROLES", controls.map(controlLine)],
    ["EL TEXTO HASTA AHORA", [prefix]],
  ] as const
  return blocks
    .filter(([, lines]) => lines.length)
    .map(([header, lines]) => `${header}\n${lines.join("\n")}`)
    .join("\n\n")
}

function controlLine({ dimension, position, strength }: Control) {
  const options = dimension.kind === "choice" ? ` (opciones: ${dimension.options.join(", ")})` : ""
  return `${dimension.name}: ${valueOf({ dimension, position })}${options} (${strengthLevelOf(strength)})`
}

/**
 * Drops markdown emphasis marks and the brackets that mark key words in the prompt, which the model sometimes copies into the text.
 * Single characters, not pairs: a streamed "[nomo" and "lógico]" arrive in different chunks.
 */
function plainText(text: string) {
  return text.replace(/[[\]*_]/g, "")
}
