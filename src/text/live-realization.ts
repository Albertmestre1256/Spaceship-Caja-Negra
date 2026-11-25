import { createDecisions, type Question } from "../llm/decisions.ts"
import type { RealizationSource } from "./realization.ts"

export const liveRealization: RealizationSource = async function* ({ context, sentences, asked, control }, signal) {
  const input = [
    ...(context ? [`EL TEXTO HASTA AHORA\n${context}`] : []),
    `ORACIONES CANDIDATAS\n${sentences.map((sentence, i) => `[${i + 1}] ${sentence}`).join("\n")}`,
    `CONTROL\n${control}`,
  ].join("\n\n")
  const questions = Object.fromEntries(asked.map((index) => [keyOf(index), questionAbout(index)]))
  const { answers } = await createDecisions({ label: "¿se cumplió el control?", input, questions }, signal)

  for (const index of asked) {
    const answer = answers[keyOf(index)]
    if (answer?.type === "noul") yield { index, confidence: answer.noul }
  }
}

function keyOf(index: number) {
  return `s${index + 1}`
}

function questionAbout(index: number): Question {
  return {
    type: "noul",
    instructions: `¿La oración [${index + 1}] cumple lo que pide el CONTROL?`,
    criteria: {
      true_description: "La oración muestra con claridad el valor del control.",
      false_description: "La oración no lo muestra, o muestra lo contrario.",
    },
  }
}
