import { chromium } from "playwright-core";
const SP = process.argv[2];
const URL = process.argv[3] ?? "http://localhost:3100/?debug&world&lite&npcs=theo,priya,marcus,vivian,harlow,nora";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
page.on("console", (m) => { if (m.type() === "error") logs.push(`[error] ${m.text().slice(0, 300)}`); });
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message} ${(e.stack || "").slice(0, 400)}`));
await page.addInitScript(() => localStorage.setItem("bh-profile", JSON.stringify({ state: { firstName: "Alex", lastName: "Martin", avatar: 2, arrivalSeen: true, flags: { hubIntro: "1", worldIntro: "1" } }, version: 4 })));
await page.goto(URL);
const G = (fn, arg) => page.evaluate(fn, arg);
const until = async (fn, t = 120000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < t) { if (await G(fn, arg)) return true; await page.waitForTimeout(200); } return false; };
let i = 0;
const snap = async (n) => page.screenshot({ path: `${SP}/p${String(i++).padStart(2, "0")}-${n}.png` });
const results = [];
const ok = (name, pass, info = "") => { results.push(`${pass ? "OK  " : "FAIL"} ${name} ${info}`); console.log(results.at(-1)); };
const st = () => G(() => { const w = window.__game.useWorld.getState(); const p = window.__game.worldRuntime.player; return { active: w.active, prompt: w.prompt?.id ?? null, menu: w.menu?.title ?? null, toast: w.toast?.text ?? null, hub: window.__game.useHub.getState().active, view: window.__game.useHub.getState().view, x: +p.x.toFixed(2), z: +p.z.toFixed(2), frozen: window.__game.worldRuntime.frozen }; });
const talk = async (id, key) => {
  await G((id) => { const col = window.__game.worldSys.col; const p = window.__game.worldRuntime.player; const n = window.__game.worldSys.npcs.get(id);
    for (const r of [1.0, 1.3]) for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; const x = n.x + Math.sin(a) * r, z = n.z + Math.cos(a) * r; if (col.clear(x, z, x, z, 0.3)) { p.x = x; p.z = z; p.rot = Math.atan2(n.x - x, n.z - z); return; } } }, id);
  if (!(await until((id) => window.__game.useWorld.getState().prompt?.id === "npc:" + id, 8000, id))) return ok(`invite ${id}`, false, JSON.stringify(await st()));
  await page.keyboard.press("e");
  if (!(await until(() => !!window.__game.useWorld.getState().menu, 40000))) return ok(`menu ${id}`, false, JSON.stringify(await st()));
  await page.waitForTimeout(400);
  await page.keyboard.press(key);
  const free = await until(() => !window.__game.worldRuntime.frozen && !window.__game.useWorld.getState().menu, 60000);
  ok(`choix ${key} chez ${id}`, free, JSON.stringify(await st()));
};
try {
  await until(() => !!window.__bh && !!window.__game, 180000);
  await G(() => { window.__bh.gsap.ticker.lagSmoothing(0); });
  if (!(await until(() => window.__worldReady, 180000))) throw new Error("world never ready");
  await until(() => window.__game.useWorld.getState().active && !window.__game.worldRuntime.frozen, 60000);
  await page.waitForTimeout(2000);
  // Theo : café.
  await talk("theo", "1");
  ok("Theo apporte le café", await until(() => window.__game.useWorld.getState().coffeeUntil > Date.now(), 240000), JSON.stringify(await st()));
  await snap("theo-coffee");
  // Theo : dossier.
  await talk("theo", "2");
  ok("Theo pose le dossier", await until(() => window.__game.useProfile.getState().flags.fileOnDesk === "1", 240000), JSON.stringify(await st()));
  // Priya : recherche.
  await talk("priya", "1");
  await G(() => { const p = window.__game.worldRuntime.player; p.x = -8; p.z = 3; });
  ok("Priya apporte la recherche", await until(() => (window.__game.useWorld.getState().toast?.text ?? "").includes("Expert"), 240000), JSON.stringify(await st()));
  await snap("priya-done");
  // Marcus : courrier.
  await talk("marcus", "1");
  await G(() => { const p = window.__game.worldRuntime.player; p.x = 12; p.z = 6; });
  ok("Marcus apporte le courrier", await until(() => /courrier|message|lettre/i.test(window.__game.useWorld.getState().toast?.text ?? ""), 240000), JSON.stringify(await st()));
  await snap("marcus-done");
  // Vivian → Harlow.
  await talk("vivian", "1");
  ok("rendez-vous Harlow", await until(() => window.__game.useProfile.getState().flags.harlowOk === "1", 5000), JSON.stringify(await st()));
  await talk("harlow", "1");
  await snap("harlow");
  console.log("harlow state", JSON.stringify(await st()), await G(() => window.__game.useStage.getState().current?.sceneId));
} catch (e) { console.log("ERR", e.message); await snap("error"); }
console.log("\n" + results.join("\n"));
console.log("\nLOGS:\n" + (logs.slice(0, 20).join("\n") || "none"));
await browser.close();
