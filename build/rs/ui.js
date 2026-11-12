/* Rust Lab UI: levels, editor, run, output, ownership log. Uses RL.run. */
(function () {
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  RL.mount = function (root, cfg) {
    var levels = cfg.levels && cfg.levels.length ? cfg.levels : [{ title: 'Playground', intro: '', code: cfg.code || 'fn main() {\n    println!("Hello!");\n}\n' }];
    var cur = 0, solved = {}, shownSol = {};
    var store = null; try { store = window.localStorage; } catch (e) { }
    var key = 'rustlab:' + (cfg.title || '') ;
    try { var sv = JSON.parse(store.getItem(key) || '{}'); solved = sv.solved || {}; } catch (e) { }
    var codes = levels.map(function (l) { return l.code || ''; });
    root.innerHTML = '<div class="card"><h2 id="rt"></h2><div class="k" id="ri"></div></div><div class="chips" id="rl"></div><div class="card"><div id="lt" class="k"></div><div class="ed"><pre id="gut" aria-hidden="true"></pre><textarea id="src" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"></textarea></div><div class="bar"><button id="run">▶ Run</button><button id="rst" class="s">Reset</button><button id="hint" class="s">Hint</button><button id="sol" class="s">Solution</button></div><div id="hintbox" class="k"></div></div><div class="card" id="outc"><h3>Output</h3><pre id="out" class="out"></pre><div id="verdict"></div></div><div class="card" id="logc" style="display:none"><h3>Ownership log <span class="k">(what Rust tracked while running)</span></h3><div id="log"></div></div>';
    var $ = function (id) { return root.querySelector('#' + id); };
    $('rt').textContent = cfg.title || 'Rust Lab'; $('ri').innerHTML = cfg.intro || '';
    var src = $('src'), gut = $('gut');
    function gutter() { var n = src.value.split('\n').length, s = ''; for (var i = 1; i <= n; i++) s += i + '\n'; gut.textContent = s; src.style.height = 'auto'; src.style.height = Math.max(150, src.scrollHeight) + 'px'; gut.style.height = src.style.height; gut.style.transform = 'none'; }
    function chips() {
      var h = ''; levels.forEach(function (l, i) { h += '<button class="chip' + (i === cur ? ' on' : '') + (solved[i] ? ' done' : '') + '" data-i="' + i + '">' + (solved[i] ? '✓ ' : '') + esc(l.title) + '</button>'; });
      $('rl').innerHTML = levels.length > 1 ? h : '';
      Array.prototype.forEach.call($('rl').querySelectorAll('.chip'), function (b) { b.onclick = function () { codes[cur] = src.value; cur = +b.getAttribute('data-i'); load(); }; });
    }
    function load() {
      var l = levels[cur]; src.value = codes[cur]; $('lt').innerHTML = l.intro || ''; $('hintbox').textContent = ''; $('out').textContent = ''; $('verdict').innerHTML = ''; $('logc').style.display = 'none';
      $('hint').style.display = l.hint ? '' : 'none'; $('sol').style.display = l.solution ? '' : 'none'; chips(); gutter();
    }
    src.addEventListener('input', gutter);
        src.addEventListener('keydown', function (e) { if (e.key === 'Tab') { e.preventDefault(); var s = src.selectionStart; src.value = src.value.slice(0, s) + '    ' + src.value.slice(src.selectionEnd); src.selectionStart = src.selectionEnd = s + 4; gutter(); } });
    function check(l, r) {
      var g = l.goal; if (!g) return null;
      var out = r.stdout.replace(/\s+$/, '');
      if (g.error) { if (g.error === 'panic') return r.code === 101 && (!g.contains || g.contains.every(function (c) { return r.stderr.indexOf(c) >= 0; })); return r.compileError && r.error && r.error.code === g.error; }
      if (!r.ok) return false;
      if (g.stdout !== undefined && out !== String(g.stdout).replace(/\s+$/, '')) return false;
      if (g.contains && !g.contains.every(function (c) { return out.indexOf(c) >= 0; })) return false;
      if (g.stderrNone && r.stderr) return false;
      if (g.requires && !g.requires.every(function (re) { return new RegExp(re).test(src.value); })) return false;
      if (g.forbids && g.forbids.some(function (re) { return new RegExp(re).test(src.value); })) return false;
      return true;
    }
    $('run').onclick = function () {
      var l = levels[cur], r = RL.run(src.value, {});
      var o = r.stdout; if (r.stderr) o += (o && !/\n$/.test(o) ? '\n' : '') + '\u0000' + r.stderr;
      var parts = o.split('\u0000'); $('out').innerHTML = esc(parts[0]) + (parts[1] ? '<span class="e">' + esc(parts[1]) + '</span>' : '') + (r.compileError ? '' : '<span class="k">\n[exit code ' + r.code + ']</span>');
      var ok = check(l, r), v = $('verdict');
      if (ok === true) { solved[cur] = true; v.innerHTML = '<div class="ok">✓ ' + esc(l.win || 'Goal reached!') + '</div>'; try { store.setItem(key, JSON.stringify({ solved: solved })); } catch (e) { } chips(); if (levels.every(function (_, i) { return solved[i]; }) && window.lilith && window.lilith.complete) window.lilith.complete(); }
      else if (ok === false) v.innerHTML = '<div class="bad">Not yet: ' + esc(l.goalText || 'check the goal in the level text above') + '</div>'; else v.innerHTML = '';
      var lg = $('log'), t = r.trace || [];
      if (t.length) { var h = ''; t.slice(0, 120).forEach(function (e) { var cl = e.kind === 'move' ? 'mv' : e.kind === 'drop' ? 'dp' : 'br'; h += '<div class="lg ' + cl + '"><b>line ' + e.line + '</b> ' + (e.kind === 'move' ? 'moved' : e.kind === 'drop' ? 'dropped' : 'borrowed ' + esc(e.info)) + ' <code>' + esc(e.name || '') + '</code>' + (e.kind !== 'borrow' && e.info ? ' <span class="k">' + esc(e.info) + '</span>' : '') + '</div>'; }); lg.innerHTML = h; $('logc').style.display = ''; } else $('logc').style.display = 'none';
    };
    $('rst').onclick = function () { codes[cur] = levels[cur].code || ''; src.value = codes[cur]; gutter(); $('out').textContent = ''; $('verdict').innerHTML = ''; };
    $('hint').onclick = function () { $('hintbox').textContent = '💡 ' + levels[cur].hint; };
    $('sol').onclick = function () { if (!shownSol[cur] && !confirm('Show the solution? Try the hint first.')) return; shownSol[cur] = true; src.value = levels[cur].solution; codes[cur] = src.value; gutter(); };
    load();
  };
})();
