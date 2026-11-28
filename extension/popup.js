// The toolbar popup: what changed on this site, with Undo and Reset. Changes reach the page
// through browser storage, which content.js watches.
const R = globalThis.AttuneRules;
const $ = (id) => document.getElementById(id);

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ? new URL(tab.url) : null;
  if (!url || !/^https?:$/.test(url.protocol)) {
    $("site").textContent = "AttuneUI can't change this page. Open a normal website.";
    for (const id of ["undo", "reset"]) $(id).disabled = true;
  }
  const key = url ? R.siteKey(url.hostname) : null;

  const render = async () => {
    const saved = await chrome.storage.local.get(key ? [key, R.CONSENT_KEY] : [R.CONSENT_KEY]);
    const site = R.parseSite(key ? saved[key] : null);
    if (key) $("site").textContent = `Site: ${url.hostname}`;
    $("consent").textContent = saved[R.CONSENT_KEY] === true
      ? "You said Yes once: changes now apply automatically."
      : 'The next change will ask "Do you want to keep changes?" first.';
    $("texts").textContent = Object.keys(site.texts).length;
    $("targets").textContent = site.targets.length;
    $("focus").textContent = site.focus ? "On" : "Off";
    $("undo").disabled = !key || site.history.length === 0;
    $("log").replaceChildren(...site.log.slice(0, 10).map((e) => {
      const li = document.createElement("li");
      const time = new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      li.textContent = `${time} · ${e.trigger} → ${e.change}`;
      return li;
    }));
    return site;
  };

  $("undo").addEventListener("click", async () => {
    const back = R.undoLast(await render());
    if (!back) return;
    await chrome.storage.local.set({ [key]: R.addLog(back.site, "Pressed Undo in the toolbar", back.label, Date.now()) });
    render();
  });
  $("reset").addEventListener("click", async () => {
    await chrome.storage.local.remove(key);
    render();
  });
  $("all").addEventListener("click", async () => {
    await chrome.storage.local.clear();
    render();
  });
  render();
}

main();
