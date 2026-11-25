import { requestJson, WRITER_MODEL } from "./nim.ts"

/**
 * Stands in for a scoring API: every question is put to a language model, which answers with numbers.
 * The scores are what the model writes about the text, not a measurement taken inside it.
 */
export type Question =
  | { type: "noul"; instructions: string; criteria?: { true_description?: string; false_description?: string } }
  | { type: "score"; instructions: string; criteria: string[] }

export type Answer = { type: "noul"; noul: number } | { type: "score"; score: number }

export type DecisionRequest = {
  label: string
  input: string
  questions: Record<string, Question>
}

const CONFIDENCE_STEPS = [0, 25, 50, 75, 100]

const SYSTEM_PROMPT = `Sos un evaluador. El mensaje trae un texto y una lista de PREGUNTAS, cada una con su clave.
Respondé cada pregunta con un número entero, según la escala que indica.
Devolvé solo un objeto JSON con una entrada por clave, por ejemplo {"s1": 2, "s2": 0}, sin explicaciones ni texto alrededor.`

export async function createDecisions({ label, input, questions }: DecisionRequest, signal: AbortSignal) {
  const keys = Object.keys(questions)
  const user = `${input}\n\nPREGUNTAS\n${keys.map((key) => questionLine(key, questions[key])).join("\n")}`
  const raw = await requestJson<Record<string, number>>({ model: WRITER_MODEL, label, system: SYSTEM_PROMPT, user, signal })
  return { answers: Object.fromEntries(keys.map((key) => [key, answerOf(questions[key], Number(raw[key]))])) }
}

function questionLine(key: string, question: Question) {
  if (question.type === "score") {
    const scale = question.criteria.map((level, i) => `${i} = ${level}`).join("; ")
    return `${key}: ${question.instructions} Escala: ${scale}.`
  }
  const yes = question.criteria?.true_description ? ` Sí: ${question.criteria.true_description}` : ""
  const no = question.criteria?.false_description ? ` No: ${question.criteria.false_description}` : ""
  return `${key}: ${question.instructions} Respondé ${CONFIDENCE_STEPS.join(", ")} según cuán seguro estás de que la respuesta es sí.${yes}${no}`
}

function answerOf(question: Question, value: number): Answer {
  const number = Number.isFinite(value) ? value : 0
  if (question.type === "score") return { type: "score", score: clamp(Math.round(number), 0, question.criteria.length - 1) }
  return { type: "noul", noul: clamp(number, 0, 100) / 100 }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
