/* Goal checks shared by the lab UI and the node tests. evalGoal(machine, goal, source) -> true/false */
var C64Goals = (function () {
  function evalGoal(m, g, src) {
    var ok = true, any = false, t;
    function need(c) { any = true; if (!c) ok = false; }
    if (g.screen !== undefined) { t = m.screenText(); [].concat(g.screen).forEach(function (s) { need(t.indexOf(String(s).toUpperCase()) >= 0); }); }
    if (g.noscreen !== undefined) { t = m.screenText(); [].concat(g.noscreen).forEach(function (s) { need(t.indexOf(String(s).toUpperCase()) < 0); }); }
    if (g.row !== undefined) need(m.screenRows()[g.row[0]].indexOf(String(g.row[1]).toUpperCase()) >= 0);
    if (g.peek) need(m.peek(g.peek[0]) === g.peek[1]);
    if (g.peekmask) need((m.peek(g.peekmask[0]) & g.peekmask[1]) === g.peekmask[2]);
    if (g.peekgt) need(m.peek(g.peekgt[0]) > g.peekgt[1]);
    if (g.peeknz !== undefined) need(m.peek(g.peeknz) !== 0);
    if (g.border !== undefined) need((m.peek(53280) & 15) === g.border);
    if (g.bg !== undefined) need((m.peek(53281) & 15) === g.bg);
    if (g.sound) need(m.peak > 0.02);
    if (g.colors) need(m.colors() >= g.colors);
    if (g.pc) need(m.pc() >= g.pc[0] && m.pc() <= g.pc[1]);
    if (g.ramrange) { var n = 0; for (var i = 0; i < g.ramrange[1]; i++) if (m.peek(g.ramrange[0] + i)) n++; need(n >= g.ramrange[2]); }
    if (g.count) { t = m.screenText(); var c = t.split(String(g.count[0]).toUpperCase()).length - 1; need(c >= g.count[1]); }
    if (g.src) [].concat(g.src).forEach(function (r) { need(new RegExp(r, 'i').test(src || '')); });
    if (g.nosrc) [].concat(g.nosrc).forEach(function (r) { need(!new RegExp(r, 'i').test(src || '')); });
    return any && ok;
  }
  return { evalGoal: evalGoal };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = C64Goals;
