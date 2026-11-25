import { onXrayChange, xrayCalls, type XrayCall } from "../llm/xray.ts"

const SIMULATION_NOTE =
  "Modo simulación: no hay ningún modelo conectado. El texto es un relato escrito de antemano que se reproduce palabra por palabra; los recuadros, los puntajes y las conexiones se eligen al azar, y dirigirlo no cambia el texto. Aun así, la interfaz se ve igual que con el modelo real."
const EMPTY_NOTE = "Todavía no hubo llamadas al modelo. Escribí o arrastrá la perilla para que la interfaz le pida algo."

const STATUS_LABELS: Record<XrayCall["status"], string> = { streaming: "recibiendo…", done: "completa", error: "error" }

/**
 * Opens the x-ray panel from `toggle`: the calls the interface made, newest first, each with what was sent and the raw reply.
 * Redraws while open as replies stream in; which calls are expanded survives the redraws.
 */
export function bindXrayPanel(toggle: HTMLButtonElement, dialog: HTMLDialogElement, isLive: boolean) {
  const list = dialog.querySelector<HTMLElement>("[data-calls]")!
  const expanded = new Set<number>()
  let frame: number | undefined
  let latestSeen = 0

  toggle.addEventListener("click", () => {
    render()
    dialog.showModal()
  })
  onXrayChange(() => {
    if (dialog.open && frame === undefined) frame = requestAnimationFrame(render)
  })

  function render() {
    frame = undefined
    if (!isLive) return list.replaceChildren(note(SIMULATION_NOTE))
    const calls = xrayCalls()
    if (!calls.length) return list.replaceChildren(note(EMPTY_NOTE))
    if (calls[0].id > latestSeen) {
      latestSeen = calls[0].id
      expanded.add(calls[0].id)
    }
    list.replaceChildren(...calls.map(callView))
  }

  function callView(call: XrayCall) {
    const details = document.createElement("details")
    details.open = expanded.has(call.id)
    details.addEventListener("toggle", () => (details.open ? expanded.add(call.id) : expanded.delete(call.id)))
    const status = Object.assign(document.createElement("span"), { textContent: STATUS_LABELS[call.status] })
    status.dataset.status = call.status
    const summary = document.createElement("summary")
    summary.append(Object.assign(document.createElement("b"), { textContent: `#${call.id} ${call.label}` }), " · ", status, durationOf(call))
    details.append(
      summary,
      heading("instrucciones que la interfaz le manda al modelo"),
      block(call.system),
      heading("mensaje"),
      block(call.user),
      heading("respuesta del modelo, tal como llegó"),
      block(call.error ? `${call.response}\n[${call.error}]` : call.response || "…", true),
    )
    return details
  }
}

function durationOf({ startedAt, endedAt }: XrayCall) {
  return endedAt === undefined ? "" : ` · ${((endedAt - startedAt) / 1000).toFixed(1)} s`
}

function heading(text: string) {
  return Object.assign(document.createElement("h3"), { textContent: text })
}

function block(text: string, isResponse = false) {
  const pre = Object.assign(document.createElement("pre"), { textContent: text })
  if (isResponse) pre.dataset.response = ""
  return pre
}

function note(text: string) {
  return Object.assign(document.createElement("p"), { textContent: text })
}
