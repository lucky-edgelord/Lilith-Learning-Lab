/* Rust Lab core, part 7: public API and rustc-style error rendering. */
(function () {
  var RustError = RL.RustError;
  function render(e, lines, isWarn) {
    var kind = e.code === 'panic' ? null : 'error';
    var head = 'error' + (/^E\d{4}$/.test(e.code) ? '[' + e.code + ']' : '') + ': ' + e.msg;
    var out = head + '\n';
    var ex = e.extra || {};
    var w = String(Math.max(e.line, 1) + 2).length;
    function pad(n, s) { s = String(s); while (s.length < n) s = ' ' + s; return s; }
    var sp = new Array(w + 1).join(' ');
    out += sp + '--> src/main.rs:' + e.line + ':' + e.col + '\n' + sp + ' |\n';
    var labels = (ex.labels || []).slice();
    if (!labels.some(function (l) { return l.primary; }) && e.line) labels.push({ line: e.line, col: e.col || 1, len: 1, primary: true, text: '' });
    var byLine = {}; labels.forEach(function (l) { (byLine[l.line] = byLine[l.line] || []).push(l); });
    var nums = Object.keys(byLine).map(Number).sort(function (a, b) { return a - b; });
    var prev = null;
    nums.forEach(function (ln) {
      if (prev !== null && ln - prev > 1) out += '...\n';
      out += pad(w, ln) + ' | ' + (lines[ln - 1] || '') + '\n';
      var ls = byLine[ln].sort(function (a, b) { return a.col - b.col; });
      var marks = '', cur = 1;
      ls.forEach(function (l) { while (cur < l.col) { marks += ' '; cur++; } var len = Math.max(1, l.len || 1); marks += new Array(len + 1).join(l.primary ? '^' : '-'); cur += len; });
      var last = ls[ls.length - 1];
      out += sp + ' | ' + marks + (last.text ? ' ' + last.text : '') + '\n';
      for (var i = ls.length - 2; i >= 0; i--) if (ls[i].text) { out += sp + ' | ' + new Array(ls[i].col).join(' ') + ls[i].text + '\n'; }
      prev = ln;
    });
    if (ex.help) out += sp + ' |\n' + sp + ' = help: ' + ex.help + '\n';
    out += '\n';
    return out;
  }
  RL.render = render;
  // result: {stdout, stderr, code, error, trace}
  RL.run = function (src, opts) {
    opts = opts || {};
    var lines = src.split('\n'), result = { stdout: '', stderr: '', code: 0, error: null, trace: [], ok: true, compileError: false };
    var ST = null;
    try {
      var ast = RL.parse(src);
      if (RL.check) RL.check(ast, lines);
      ST = RL.makeInterp(ast, opts);
      ST.run();
    } catch (e) {
      if (e && e.exit !== undefined) { result.code = e.exit; }
      else if (e instanceof RustError) {
        result.error = { code: e.code, msg: e.msg, line: e.line, col: e.col, extra: e.extra };
        if (e.code === 'panic') {
          result.stderr = "thread 'main' panicked at src/main.rs:" + e.line + ':' + e.col + ':\n' + e.msg + '\nnote: run with `RUST_BACKTRACE=1` environment variable to display a backtrace\n';
          result.code = 101; result.ok = false;
        } else if (e.code === 'limit') { result.stderr = 'error: ' + e.msg + '\n'; result.code = 124; result.ok = false; }
        else { result.compileError = true; result.ok = false; result.code = 1; result.stderr = render(e, lines) + 'error: could not compile `hello` (bin "hello") due to 1 previous error\n'; }
      } else if (e instanceof RangeError) { result.stderr = "thread 'main' has overflowed its stack\n"; result.code = 134; result.ok = false; }
      else throw e;
    }
    if (ST) { result.stdout = ST.out.join(''); result.stderr = ST.errOut.join('') + result.stderr; result.trace = ST.trace; }
    if (result.compileError) result.stdout = '';
    return result;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = RL;
})();
