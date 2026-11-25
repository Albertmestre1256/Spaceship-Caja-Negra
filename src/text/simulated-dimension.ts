import { delay } from "./completion.ts"
import type { Dimension, DimensionSource } from "./dimension.ts"

const MENU_SIZE = 5
const LATENCY_MS = 150

const DIMENSIONS: Dimension[] = [
  { name: "postura", kind: "scale", low: "crítica", high: "favorable" },
  { name: "certeza", kind: "scale", low: "cauta", high: "categórica" },
  { name: "foco", kind: "choice", options: ["Popper", "Hempel", "Cardoso"] },
  { name: "modo", kind: "choice", options: ["argumentación", "ejemplo", "cita"] },
  { name: "registro", kind: "scale", low: "divulgativo", high: "técnico" },
  { name: "fuentes", kind: "scale", low: "sin citas", high: "con citas" },
]

export const simulatedDimension: DimensionSource = async function* ({ taken }, signal) {
  await delay(LATENCY_MS, signal)
  const takenNames = new Set(taken.map(({ name }) => name))
  const free = DIMENSIONS.filter(({ name }) => !takenNames.has(name))
  yield* (free.length ? free : DIMENSIONS).slice(0, MENU_SIZE)
}
