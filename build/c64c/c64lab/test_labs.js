// Verifies every level on the real core: the starter must not reach the goals, the solution must.
const fs = require('fs'), path = require('path'), vm = require('vm');
const C64M = require('./machine.js'), Goals = require('./goals.js');
const labs = JSON.parse(fs.readFileSync(process.argv[2] || '/tmp/c64labs.json', 'utf8'));
const asmSrc = fs.readFileSync(process.argv[3] || '/tmp/c64asm.js', 'utf8'); const ctx = {}; vm.createContext(ctx); vm.runInContext(asmSrc + ';this.assemble=assemble;', ctx);
function asmBuild(src) { const r = ctx.assemble(src); let lo = 65535, hi = 0; r.blocks.forEach(b => { if (b.b.length) { if (b.a < lo) lo = b.a; if (b.a + b.b.length > hi) hi = b.a + b.b.length; } }); if (hi <= lo) throw 'nothing assembled'; const d = new Uint8Array(hi - lo + 2); d[0] = lo & 255; d[1] = lo >> 8; r.blocks.forEach(b => b.b.forEach((v, i) => { d[2 + b.a - lo + i] = v; })); return d; }
(async () => {
  const m = await C64M.boot(fs.readFileSync(path.join(__dirname, '..', '..', 'vendor', 'c64-ready', 'c64.wasm')));
  function attempt(l, src, useTest) {
    const latched = {}; let err = null;
    const check = () => l.goals.forEach((g, i) => { if (Goals.evalGoal(m, g, src)) latched[i] = true; else if (g.live) latched[i] = false; });
    try {
      if (l.direct) m.reset(); else if (l.tab === 'basic') { const bad = m.checkBasic(src); if (bad.length) throw bad[0]; m.loadBasic(src); } else if (l.tab === 'asm') m.loadPRG(asmBuild(src));
      const steps = (l.test || [{ run: 150 }]);
      for (const s of steps) {
        if (s.run) { for (let k = 0; k < s.run; k++) { m.step(); if (k % 10 === 9) check(); } }
        if (s.type !== undefined && useTest) m.typeNow(s.type, 600);
        if (s.joy !== undefined) m.joy(s.joy);
        if (s.joy1 !== undefined) m.joy(s.joy1, 1);
        if (s.key) { m.keyChar(s.key, true); m.run(4); m.keyChar(s.key, false); }
        if (s.poke) m.poke(s.poke[0], s.poke[1]);
        check();
      }
      m.run(5); check();
    } catch (e) { err = String(e); }
    m.joy(0); m.joy(0, 1);
    return { ok: !err && l.goals.every((g, i) => latched[i]), err, latched };
  }
  let n = 0, bad = 0;
  for (const [k, lab] of Object.entries(labs)) for (const [i, l] of lab.levels.entries()) {
    if (l.test && l.test[0] && l.test[0].skip) continue;
    n++;
    const sol = attempt(l, l.solution, true), st = attempt(l, l.code || '', !l.direct ? true : false);
    if (!sol.ok || st.ok) { bad++; console.log((sol.ok ? '' : 'SOLUTION FAILS ') + (st.ok ? 'STARTER PASSES ' : '') + k + ' L' + (i + 1) + ' ' + l.title + (sol.err ? ' | ' + sol.err : '') + ' | ' + JSON.stringify(sol.latched)); if (!sol.ok) console.log('   screen: ' + m.screenRows().map(r => r.trimEnd()).filter(Boolean).slice(0, 8).join(' / ')); }
  }
  console.log(n + ' levels, ' + bad + ' problems'); process.exit(bad ? 1 : 0);
})();
