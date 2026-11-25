import { HELPER_MODEL, streamCompletion } from "../llm/nim.ts"
import type { Dimension, DimensionContext, DimensionSource } from "./dimension.ts"

const MENU_SIZE = 5
const MAX_WORDS_PER_LABEL = 3
/** Stands for the options of `foco` in the list of axes; the model replaces it with the authors the text names. */
const AUTHORS_SLOT = "<autores>"

/** Independent axes of a short passage of an academic essay, most consequential first. `foco` has no generic options: its options are the text's authors. */
const CATALOG: Dimension[] = [
  { name: "postura", kind: "scale", low: "crítica", high: "favorable" },
  { name: "certeza", kind: "scale", low: "cauta", high: "categórica" },
  { name: "foco", kind: "choice", options: [] },
  { name: "modo", kind: "choice", options: ["argumentación", "ejemplo", "cita"] },
  { name: "registro", kind: "scale", low: "divulgativo", high: "técnico" },
  { name: "fuentes", kind: "scale", low: "sin citas", high: "con citas" },
  { name: "tono", kind: "choice", options: ["sobrio", "polémico", "didáctico", "irónico"] },
  { name: "época", kind: "scale", low: "contexto de época", high: "debate actual" },
]

const SYSTEM_PROMPT = `
El mensaje del usuario trae el comienzo de un ensayo académico, cortado donde está el lector, a veces las frases clave del lector (palabra clave entre corchetes) y una lista de ejes. Cada eje es una manera en que podrían variar las próximas 100 palabras, escrita como "nombre: etiqueta | etiqueta".

Elegí los ejes que más importan para lo que podría seguir en este punto, tantos como se piden, el más importante primero. Si hay frases clave, preferí los ejes que actúan sobre ellas. Escribí las líneas elegidas sin cambios, una por línea, y nada más.

La única excepción es foco, que es de qué autor se ocupa el pasaje: reemplazá <autores> por cada autor que el texto nombra, por su apellido. Dejá afuera foco cuando el texto no nombra autores.

EJEMPLO
Usuario:
Texto: Popper argumenta que las ciencias sociales no pueden predecir el futuro. Hempel, en cambio, admite que la Historia
Ejes:
postura: crítica | favorable
certeza: cauta | categórica
foco: <autores> | ninguno
modo: argumentación | ejemplo | cita
Elegí 3.
Asistente:
foco: Popper | Hempel | ninguno
postura: crítica | favorable
modo: argumentación | ejemplo | cita
`.trim()

/** One call offers the menu: the free catalog axes that matter most here, with the text's authors as the options of `foco`. Axes the model leaves out or garbles are filled in from the catalog. */
export const liveDimension: DimensionSource = async function* (context, signal) {
  const takenNames = context.taken.map(({ name }) => name.toLowerCase())
  const free = CATALOG.filter(({ name }) => !takenNames.includes(name))
  const generic = free.filter((axis) => axis.kind === "scale" || axis.options.length)
  const size = Math.min(MENU_SIZE, generic.length)
  if (!size) return

  const offered: string[] = []
  const deltas = streamCompletion({ model: HELPER_MODEL, label: "ejes de control", system: SYSTEM_PROMPT, user: userMessageOf(context, free, size), signal })
  for await (const line of linesOf(deltas)) {
    const dimension = dimensionOf(line, free)
    if (!dimension || offered.includes(dimension.name)) continue
    offered.push(dimension.name)
    yield dimension
    if (offered.length === size) return
  }
  yield* generic.filter(({ name }) => !offered.includes(name)).slice(0, size - offered.length)
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

function userMessageOf({ text, leads }: DimensionContext, free: Dimension[], size: number) {
  const keyPhrases = leads.length ? `Frases clave:\n${leads.map(({ before, keyword, after }) => `- ${before}[${keyword}]${after}`).join("\n")}\n` : ""
  return `Texto: ${text}\n${keyPhrases}Ejes:\n${free.map(axisLine).join("\n")}\nElegí ${size}.`
}

function axisLine(axis: Dimension) {
  if (axis.kind === "scale") return `${axis.name}: ${axis.low} | ${axis.high}`
  return `${axis.name}: ${axis.options.length ? axis.options.join(" | ") : `${AUTHORS_SLOT} | ninguno`}`
}

/** Reads a "name: label | label" line as one of `axes`, keeping that axis's kind; undefined when it is not one of them or its labels do not fit the kind. */
function dimensionOf(line: string, axes: Dimension[]): Dimension | undefined {
  const [name, rest] = line.split(":", 2).map((part) => part.trim())
  const axis = axes.find((axis) => axis.name === name.toLowerCase())
  const labels = (rest ?? "").split("|").map(plainLabel)
  if (!axis || !labels.every(isValidLabel)) return

  if (axis.kind === "scale") return labels.length === 2 ? { name: axis.name, kind: "scale", low: labels[0], high: labels[1] } : undefined
  return labels.length >= 2 && labels.length <= 4 ? { name: axis.name, kind: "choice", options: labels } : undefined
}

/** Drops a parenthesised aside, which the model sometimes adds to a name. */
function plainLabel(label: string) {
  return label
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function isValidLabel(label: string) {
  return label !== "" && label !== AUTHORS_SLOT && label.split(" ").length <= MAX_WORDS_PER_LABEL
}
