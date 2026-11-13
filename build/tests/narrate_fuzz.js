// Seeded fuzz of the narrator state machine with a fault-injecting fake speech engine and fake timers.
const N = require('../src/narrate.js');
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
// fake clock
let now = 0, timers = [], tid = 0;
global.setTimeout = (f, ms) => { const id = ++tid; timers.push({ id, at: now + (ms || 0), f }); return id; };
global.clearTimeout = id => { timers = timers.filter(t => t.id !== id); };
function advanceTo(t) { for (;;) { timers.sort((a, b) => a.at - b.at || a.id - b.id); const x = timers[0]; if (!x || x.at > t) break; timers.shift(); now = x.at; x.f(); } now = t; }
function run(runIdx, faults) {
  let active = 0, maxActive = 0, overlaps = 0, spoken = [], cbs = null, fail = 0, onDone = 0, errorsSeen = 0;
  const env = {
    speak(text, rate, cb) {
      if (active > 0) { overlaps++; if (process.env.DBG && overlaps===1) console.log("overlap at", now, text, new Error().stack.split("\n").slice(2,7).join("|")); }       // the previous utterance was never cancelled/finished
      active++; maxActive = Math.max(maxActive, active); const my = cb; cbs = cb; const idx = text; spoken.push(idx);
      const r = rnd(); const dur = 200 + rnd() * 600;
      const finish = () => { if (cbs === my) { active = 0; } };
      if (faults && r < 0.05) { setTimeout(() => { active = 0; my.onerror && my.onerror('x'); errorsSeen++; }, 30); return; }       // immediate error
      if (faults && r < 0.08) return;                                                                                                // engine never answers
      if (faults && r < 0.12) { setTimeout(() => { my.onstart && my.onstart(); setTimeout(() => { active = 0; my.onend && my.onend(); my.onend && my.onend(); }, dur); }, 20); return; }   // duplicate end
      if (faults && r < 0.15) { setTimeout(() => { my.onstart && my.onstart(); setTimeout(() => { active = 0; my.onend && my.onend(); }, 12000); }, 20); return; }  // very slow engine
      setTimeout(() => { my.onstart && my.onstart(); my.onword && my.onword(); setTimeout(() => { active = 0; my.onend && my.onend(); }, dur); }, 20);
    },
    cancel() { active = 0; }
  };
  const chunks = []; for (let i = 0; i < 30; i++) chunks.push({ text: 'chunk number ' + i + ' says something', emotion: 'neutral' });
  let failed = null, doneCalled = 0;
  const nar = N.createNarrator(env, { onFail: r => { failed = r; }, onDone: () => { doneCalled++; } });
  nar.load(chunks, 0);
  let lastI = 0, bad = null;
  nar.play();
  for (let step = 0; step < 60; step++) {
    const a = rnd();
    advanceTo(now + Math.floor(rnd() * 4000));
    const before = nar.state.i;
    if (a < 0.08) nar.pause(); else if (a < 0.16) nar.play(); else if (a < 0.22) nar.next(); else if (a < 0.28) nar.prev(); else if (a < 0.33) nar.jump(Math.floor(rnd() * 30)); else if (a < 0.4) nar.setRate(pick([0.8, 1, 1.5, 2]));
    // invariants
    if (!nar.state.playing) { advanceTo(now + 15000); if (active > 0 && !nar.state.playing) bad = 'speech continued after pause at step ' + step; }
    if (nar.state.i < 0 || nar.state.i >= 30) bad = 'index out of range ' + nar.state.i;
    if (overlaps > 0) bad = 'overlapping utterances (' + overlaps + ')';
    if (bad) break;
  }
  return { bad, failed, overlaps, doneCalled };
}
// 1) no faults: natural play from start to end must visit every chunk once, in order, never overlapping
{
  now = 0; timers = []; seed = 1; let spoken = [];
  const env = { speak(t, r, cb) { spoken.push(t); setTimeout(() => { cb.onstart(); setTimeout(() => cb.onend(), 300); }, 10); }, cancel() {} };
  const chunks = Array.from({ length: 12 }, (_, i) => ({ text: 'c' + i, emotion: 'neutral' }));
  let done = 0; const nar = N.createNarrator(env, { onDone: () => done++ }); nar.load(chunks, 0); nar.play(); advanceTo(60000);
  if (spoken.join() !== chunks.map(c => c.text).join() || done !== 1) { console.log('FAIL clean run', spoken.join(), done); process.exit(1); }
  console.log('ok clean run');
}
// 2) duplicate end must not skip a chunk
{
  now = 0; timers = []; let spoken = [];
  const env = { speak(t, r, cb) { spoken.push(t); setTimeout(() => { cb.onstart(); setTimeout(() => { cb.onend(); cb.onend(); }, 100); }, 10); }, cancel() {} };
  const chunks = Array.from({ length: 6 }, (_, i) => ({ text: 'c' + i, emotion: 'neutral' }));
  const nar = N.createNarrator(env, {}); nar.load(chunks, 0); nar.play(); advanceTo(30000);
  if (spoken.join() !== 'c0,c1,c2,c3,c4,c5') { console.log('FAIL duplicate end', spoken.join()); process.exit(1); }
  console.log('ok duplicate end');
}
// 3) engine that always errors must stop with onFail, not race to the end
{
  now = 0; timers = []; let n = 0, failed = null, done = 0;
  const env = { speak(t, r, cb) { n++; setTimeout(() => cb.onerror('dead'), 20); }, cancel() {} };
  const chunks = Array.from({ length: 30 }, (_, i) => ({ text: 'c' + i, emotion: 'neutral' }));
  const nar = N.createNarrator(env, { onFail: r => failed = r, onDone: () => done++ }); nar.load(chunks, 0); nar.play(); advanceTo(60000);
  if (!failed || done || nar.state.i > 3 || nar.state.playing) { console.log('FAIL error storm', failed, done, nar.state.i, nar.state.playing); process.exit(1); }
  console.log('ok error storm stops after', n, 'attempts at chunk', nar.state.i);
}
// 4) a slow engine (starts after 7 s, speaks 8 s) must not be cut off by the watchdog
{
  now = 0; timers = []; let spoken = [], cancels = 0;
  const env = { speak(t, r, cb) { spoken.push(t); setTimeout(() => { cb.onstart(); setTimeout(() => cb.onend(), 8000); }, 7000); }, cancel() { cancels++; } };
  const chunks = Array.from({ length: 3 }, (_, i) => ({ text: ('chunk ' + i + ' ').padEnd(120, 'x'), emotion: 'neutral' }));
  const nar = N.createNarrator(env, {}); nar.load(chunks, 0); nar.play(); advanceTo(120000);
  if (spoken.length !== 3) { console.log('FAIL slow engine', spoken.length); process.exit(1); }
  console.log('ok slow engine, cancels (from cut on advance only):', cancels);
}
// 5) one transient error is retried and playback continues
{
  now = 0; timers = []; let spoken = [], first = true;
  const env = { speak(t, r, cb) { spoken.push(t); if (t === 'c1' && first) { first = false; setTimeout(() => cb.onerror('blip'), 20); return; } setTimeout(() => { cb.onstart(); setTimeout(() => cb.onend(), 100); }, 10); }, cancel() {} };
  const chunks = Array.from({ length: 3 }, (_, i) => ({ text: 'c' + i, emotion: 'neutral' }));
  const nar = N.createNarrator(env, {}); nar.load(chunks, 0); nar.play(); advanceTo(30000);
  if (spoken.join() !== 'c0,c1,c1,c2') { console.log('FAIL retry', spoken.join()); process.exit(1); }
  console.log('ok transient error retried');
}
// 6) rate taps restart the chunk once
{
  now = 0; timers = []; let spoken = [];
  const env = { speak(t, r, cb) { spoken.push(t + '@' + r); setTimeout(() => { cb.onstart(); setTimeout(() => cb.onend(), 3000); }, 10); }, cancel() {} };
  const nar = N.createNarrator(env, {}); nar.load([{ text: 'c0' }, { text: 'c1' }], 0); nar.play(); advanceTo(500);
  nar.setRate(1.25); nar.setRate(1.5); nar.setRate(2); advanceTo(1000);
  if (spoken.join() !== 'c0@1,c0@2') { console.log('FAIL rate', spoken.join()); process.exit(1); }
  console.log('ok rate taps');
}
// 7) random actions with fault injection: no overlap, no out-of-range index, silence after pause
let bad = 0;
for (let k = 0; k < 400; k++) { now = 0; timers = []; seed = 777 + k; const r = run(k, true); if (r.bad) { bad++; if (bad < 5) console.log('FAIL fuzz run', k, r.bad); } }
console.log(bad ? bad + ' fuzz runs failed' : 'ok 400 fuzz runs with faults');
process.exit(bad ? 1 : 0);
