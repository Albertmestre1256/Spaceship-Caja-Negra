/**
 * Simulation plays simulated sources; flight calls the models. The sources are chosen when the page loads, so switching reloads it in the other mode.
 * The key stays on the dev server (`.env`), so launching only asks for confirmation; the dialog's submit button returns "live".
 */
export function bindModeToggle(toggle: HTMLButtonElement, dialog: HTMLDialogElement, isLive: boolean) {
  toggle.setAttribute("aria-pressed", `${isLive}`)
  toggle.querySelector("b")!.textContent = isLive ? "vuelo" : "simulación"

  toggle.addEventListener("click", () => (isLive ? reloadAs(false) : dialog.showModal()))
  dialog.addEventListener("close", () => {
    const choice = dialog.returnValue
    dialog.returnValue = ""
    if (choice === "live") reloadAs(true)
  })
}

function reloadAs(isLive: boolean) {
  const url = new URL(location.href)
  if (isLive) url.searchParams.set("live", "true")
  else url.searchParams.delete("live")
  location.assign(url)
}
