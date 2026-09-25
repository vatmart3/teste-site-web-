import { chromium } from "playwright-core";
const SP = process.argv[2];
const URL = process.argv[3] ?? "http://localhost:3100/?debug&world&lite&npcs=theo,priya,marcus,vivian,nora,mercer,sam,extra-1";
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
try {
  await until(() => !!window.__bh && !!window.__game, 180000);
  await G(() => { window.__bh.gsap.ticker.lagSmoothing(0); });
  if (!(await until(() => window.__worldReady, 180000))) throw new Error("world never ready");
  await until(() => window.__game.useWorld.getState().active && !window.__game.worldRuntime.frozen, 60000);
  await page.waitForTimeout(2500);
  await snap("spawn");
  console.log("spawn", JSON.stringify(await st()));
  // 1. Marcher au clavier jusqu'au bureau (devant), E.
  await G(() => { window.__game.worldRuntime.cam.yaw = 0; });
  await page.keyboard.down("z");
  const reached = await until(() => window.__game.useWorld.getState().prompt?.id === "desk", 30000);
  await page.keyboard.up("z");
  ok("invite bureau en marchant devant", reached, JSON.stringify(await st()));
  await snap("desk-prompt");
  await page.keyboard.press("e");
  ok("E → session de bureau", await until(() => window.__game.useHub.getState().active, 30000), JSON.stringify(await st()));
  await page.waitForTimeout(2000); await snap("desk-session");
  // Se relever par la porte.
  const door = page.getByRole("button", { name: /Retourner à l'étage/ });
  let stood = false;
  if (await door.count()) { await door.first().click({ force: true }); stood = true; }
  else { await G(() => window.__game.hubBus.emit({ type: "stand" })); }
  ok("retour à l'étage", await until(() => window.__game.useWorld.getState().active && !window.__game.useHub.getState().active && !window.__game.worldRuntime.frozen, 40000), `button=${stood} ${JSON.stringify(await st())}`);
  await page.waitForTimeout(1500); await snap("back-floor");
  ok("invite revient après retour (sans bouger)", await until(() => window.__game.useWorld.getState().prompt?.id === "desk", 8000), JSON.stringify(await st()));
  // Bureau depuis l'arrière / le flanc.
  for (const [nm, x, z, rot] of [["derrière", 6.5, -11.2, 0], ["flanc", 7.9, -10.2, -Math.PI / 2]]) {
    await G(([x, z, rot]) => { const p = window.__game.worldRuntime.player; p.x = x; p.z = z; p.rot = rot; }, [x, z, rot]);
    ok(`invite bureau ${nm}`, await until(() => window.__game.useWorld.getState().prompt?.id === "desk", 8000), JSON.stringify(await st()));
  }
  // 2. Chaque interaction.
  const list = await G(() => window.__game.interactables().map((it) => ({ id: it.id, x: it.x, z: it.z, box: !!it.box })));
  const seen = new Set(["desk"]);
  for (const it of list) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    // Placer le joueur à 0,8 m, du côté le plus dégagé, face à l'objet.
    const placed = await G((it) => {
      const col = window.__game.worldSys.col;
      const p = window.__game.worldRuntime.player;
      const cur = it.id.startsWith("npc:") ? window.__game.worldSys.npcs.get(it.id.slice(4)) : it;
      for (const r of [0.9, 1.2, 1.45]) for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const x = cur.x + Math.sin(a) * r, z = cur.z + Math.cos(a) * r;
        if (col.clear(x, z, x, z, 0.3)) { p.x = x; p.z = z; p.rot = Math.atan2(cur.x - x, cur.z - z); return true; }
      }
      return false;
    }, it);
    const got = await until((id) => window.__game.useWorld.getState().prompt?.id === id, 8000, it.id);
    if (!got) { ok(`invite ${it.id}`, false, `placed=${placed} ${JSON.stringify(await st())}`); continue; }
    const before = await st();
    await page.keyboard.press("e");
    const reacted = await until(() => { const w = window.__game.useWorld.getState(); return !!w.menu || window.__game.useHub.getState().active || !!w.toast || window.__game.worldRuntime.frozen; }, 15000);
    // Attendre la fin des répliques d'accueil : menu, bureau, ou retour au calme.
    await until(() => { const w = window.__game.useWorld.getState(); return !!w.menu || window.__game.useHub.getState().active || window.__game.useBoard.getState().active || !window.__game.worldRuntime.frozen; }, 40000);
    await page.waitForTimeout(600);
    const after = await st();
    await snap(it.id.replace(":", "-"));
    ok(`E → ${it.id}`, reacted, `${JSON.stringify(after)}`);
    // Revenir à l'état libre.
    if (after.menu) { console.log("   menu:", JSON.stringify(await G(() => window.__game.useWorld.getState().menu.options.map((o) => o.label)))); await page.keyboard.press("Escape"); }
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const s2 = await G(() => ({ board: window.__game.useBoard.getState().active, hub: window.__game.useHub.getState().active, view: window.__game.useHub.getState().view }));
      if (s2.board) { await page.waitForTimeout(1500); await snap("board-open"); await page.keyboard.press("Escape"); console.log("   board: Escape"); break; }
      if (s2.hub && s2.view) { await page.waitForTimeout(1500); await snap("hub-view-" + s2.view); await G(() => window.__game.hubBus.emit({ type: "close" })); console.log("   hub view closed", s2.view); break; }
      if (!after.hub && !after.frozen) break;
      await page.waitForTimeout(300);
    }
    const free = await until(() => { const w = window.__game.useWorld.getState(); return w.active && !w.menu && !window.__game.worldRuntime.frozen && !window.__game.useHub.getState().active; }, 60000);
    ok(`libre après ${it.id}`, free, JSON.stringify(await st()));
    await G(() => window.__game.useWorld.getState().set({ toast: null }));
  }
} catch (e) { console.log("ERR", e.message); await snap("error"); }
console.log("\n" + results.join("\n"));
console.log("\nLOGS:\n" + (logs.slice(0, 20).join("\n") || "none"));
await browser.close();
