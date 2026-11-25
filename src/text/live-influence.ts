import { createDecisions, type Question } from "../llm/decisions.ts"
import type { Focus, InfluenceSource } from "./influence.ts"

const QUESTIONS: Record<Focus["kind"], { header: string; instructions: string; levels: string[] }> = {
  "next sentence": {
    header: "ORACIÓN SIGUIENTE",
    instructions: "se conecta con la ORACIÓN SIGUIENTE e influye en ella",
    levels: [
      "Sin conexión",
      "Débil: comparte un detalle o el escenario",
      "Moderada: la oración siguiente se apoya en ella",
      "Fuerte: la oración siguiente se desprende directamente de ella",
    ],
  },
  "key phrase": {
    header: "FRASE CLAVE",
    instructions: "se conecta con la FRASE CLAVE: lo que nombra, lo que la causa o lo que se sigue de ella",
    levels: [
      "Sin conexión",
      "Débil: comparte un detalle o el escenario",
      "Moderada: involucra lo que nombra la frase clave",
      "Fuerte: trata directamente de la frase clave, la causa o es causada por ella",
    ],
  },
}

export const liveInfluence: InfluenceSource = async function* (sentences, focus, signal) {
  const { header, instructions, levels } = QUESTIONS[focus.kind]
  const input = `ORACIONES DEL TEXTO\n${sentences.map((sentence, i) => `[${i + 1}] ${sentence}`).join("\n")}\n\n${header}\n${focus.text}`
  const questions = Object.fromEntries(
    sentences.map((_, i): [string, Question] => [
      keyOf(i),
      { type: "score", instructions: `¿Con cuánta fuerza la oración [${i + 1}] ${instructions}?`, criteria: levels },
    ]),
  )
  const { answers } = await createDecisions({ label: "influencia entre oraciones", input, questions }, signal)

  for (const index of sentences.keys()) {
    const answer = answers[keyOf(index)]
    if (answer?.type === "score") yield { index, strength: answer.score / (levels.length - 1) }
  }
}

function keyOf(index: number) {
  return `s${index + 1}`
}
