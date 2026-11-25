import { createDecisions, type Question } from "../llm/decisions.ts"
import type { RelevanceSource } from "./keyword-relevance.ts"

const LEVELS = [
  "Irrelevante",
  "Débil: comparte el escenario o un detalle pasajero",
  "Moderada: tiene que ver con aquello de lo que trata la PUNTA",
  "Fuerte: la PUNTA trata de ella o gira en torno a ella",
]

export const liveRelevance: RelevanceSource = async function* ({ story, tip, leads }, signal) {
  const input = [
    ...(story ? [`EL TEXTO HASTA AHORA\n${story}`] : []),
    `PUNTA (la oración que se está escribiendo ahora)\n${tip}`,
    `PALABRAS CLAVE\n${leads.map(({ before, keyword, after }, i) => `[${i + 1}] ${keyword} (en "${before}${keyword}${after}")`).join("\n")}`,
  ].join("\n\n")
  const questions = Object.fromEntries(
    leads.map((lead, i): [string, Question] => [
      keyOf(i),
      { type: "score", instructions: `¿Qué tan relevante es la palabra clave [${i + 1}] "${lead.keyword}" para la PUNTA?`, criteria: LEVELS },
    ]),
  )
  const { answers } = await createDecisions({ label: "relevancia de palabras clave", input, questions }, signal)

  for (const index of leads.keys()) {
    const answer = answers[keyOf(index)]
    if (answer?.type === "score") yield { index, relevance: answer.score / (LEVELS.length - 1) }
  }
}

function keyOf(index: number) {
  return `k${index + 1}`
}
