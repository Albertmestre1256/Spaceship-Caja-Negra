/** One call to the model as the interface sees it: the text that went in and the text that came out, nothing in between. */
export type XrayCall = {
  id: number
  label: string
  system: string
  user: string
  response: string
  status: "streaming" | "done" | "error"
  error?: string
  startedAt: number
  endedAt?: number
}

const MAX_CALLS = 40

const calls: XrayCall[] = []
const listeners = new Set<() => void>()
let nextId = 1

/** Starts recording a call; the returned handle appends what the model streams back and closes the record. */
export function recordCall(label: string, system: string, user: string) {
  const call: XrayCall = { id: nextId++, label, system, user, response: "", status: "streaming", startedAt: performance.now() }
  calls.unshift(call)
  calls.length = Math.min(calls.length, MAX_CALLS)
  notify()
  return {
    append(text: string) {
      call.response += text
      notify()
    },
    finish(error?: unknown) {
      call.status = error === undefined ? "done" : "error"
      if (error !== undefined) call.error = error instanceof Error ? error.message : String(error)
      call.endedAt = performance.now()
      notify()
    },
  }
}

export function xrayCalls(): readonly XrayCall[] {
  return calls
}

export function onXrayChange(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  for (const listener of listeners) listener()
}
