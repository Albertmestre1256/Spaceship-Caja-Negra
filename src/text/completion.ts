import type { TextSource } from "./text-stream.ts"
import { countWords } from "./words.ts"

const LATENCY_MS = 150
const WORDS_PER_SECOND = 800
const WORDS_PER_CHUNK = 8
const WORDS_PER_COMPLETION = 400
const CHUNK_INTERVAL_MS = (WORDS_PER_CHUNK / WORDS_PER_SECOND) * 1000

/**
 * A text written ahead of time: in simulation no model writes anything, the passage is replayed word by word.
 * Fragments, in their original order, of Mestre, A. (2021), "Informe sobre «La miseria del historicismo» de Karl Popper"
 * (sections 3, 4a and the conclusion); only the PDF extraction was cleaned (joined words, page numbers, footnote calls).
 */
const PASSAGE =
  `Karl Popper es un filósofo de la ciencia muy distinguido en el ambiente académico del siglo XX. Es un pensador que se adhiere al modelo Nomológico Deductivo –o modelo de cobertura legal–. Sin embargo, su postura autodefinida por él mismo, es la de un Racionalismo Crítico. La Miseria del Historicismo es un texto de ciento cincuenta hojas repartido en tres artículos y publicados en la revista académica llamada Economica que estaba asociada a la London School of Economics. Es posible vislumbrar dos objetivos en la obra de Popper: En primera instancia, Popper busca refutar la teoría fatalista que los historicistas poseen. Popper argumenta que las ciencias sociales no pueden predecir el futuro en base a la observación de eventos con características similares ocurridas en el pasado. En segunda instancia, el autor busca objetar la teoría de que se puede conocer los mecanismos detrás de la conducta humana. Pero, a su vez, el texto busca argumentar y relacionar el historicismo con el neopositivismo lógico. Mediante el uso de la deducción lógica podemos presumir que: Popper al refutar el historicismo, también pretende precipitar abajo el neopositivismo. Por último, cabe aclarar que el título “La Miseria del historicismo” es un guiño a la obra de Karl Marx titulada “La miseria de la filosofía” que es a su vez, una referencia a “La filosofía de la Miseria” de Pierre Joseph Proudhon. Pero entonces, ¿cuál es el papel de la Historia para Popper? De una manera bastante poética ilustra a la Historia como la encargada de “desenredar los hilos de la causalidad” y explicar por qué esos hilos se entretejen. En mi entendimiento, Ciro Cardoso comete el error de considerar a Popper como un neopositivista y, más aún, hablar de que Popper se dedicó a atacar a la Historia. En primer lugar, Popper no es siquiera positivista. En segundo lugar, Popper no arremete contra la Historia de ninguna manera, sería más acertado hablar de que él arremete contra el marxismo, pero no contra la Historia. En tercer lugar, de ninguna manera Popper usa la denominación de esbozo explicativo, pues ésta es parte de la teoría de Hempel y no de Popper. Por último, Popper nunca dice que los historiadores no puedan dar una explicación rigurosa, sino que siempre estará pendiente de nuevos hallazgos y que, con la evolución de las herramientas, una teoría podría falsearse.`.split(
    " ",
  )

export const simulatedSource: TextSource = { complete }

/**
 * Continues the passage from as many words as `prefix` already holds. Steering is ignored on purpose: with no model there is
 * nothing to steer, so boxes and controls change the picture but never the text.
 */
async function* complete(prefix: string, _steering: unknown, signal: AbortSignal) {
  let cursor = countWords(prefix)
  const nextWord = () => PASSAGE[cursor++ % PASSAGE.length]
  for (let sent = 0; sent < WORDS_PER_COMPLETION; sent += WORDS_PER_CHUNK) {
    await delay(sent === 0 ? LATENCY_MS : CHUNK_INTERVAL_MS, signal)
    const words = Array.from({ length: WORDS_PER_CHUNK }, nextWord)
    yield sent === 0 && !prefix ? words.join(" ") : ` ${words.join(" ")}`
  }
}

export function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted()
    const timer = setTimeout(resolve, ms)
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)), { once: true })
  })
}
