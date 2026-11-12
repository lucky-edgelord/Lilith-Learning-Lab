/* Rust Lab core, part 1: lexer. A teaching subset of Rust: not a full compiler. */
var RL = {};
(function () {
  function RustError(code, msg, line, col, extra) { this.code = code; this.msg = msg; this.line = line; this.col = col || 0; this.extra = extra || {}; }
  RL.RustError = RustError;
  var KEYWORDS = { fn: 1, let: 1, mut: 1, if: 1, else: 1, while: 1, loop: 1, for: 1, in: 1, return: 1, break: 1, continue: 1, struct: 1, enum: 1, impl: 1, trait: 1, match: 1, pub: 1, use: 1, const: 1, static: 1, as: 1, true: 1, false: 1, self: 1, Self: 1, mod: 1, where: 1, move: 1, ref: 1, dyn: 1, type: 1 };
  var PUNCT3 = ['..=', '<<=', '>>='];
  var PUNCT2 = ['::', '->', '=>', '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '..', '<<', '>>'];
  RL.lex = function (src) {
    var toks = [], i = 0, line = 1, col = 1, n = src.length;
    function adv(k) { for (var q = 0; q < k; q++) { if (src[i] === '\n') { line++; col = 1; } else col++; i++; } }
    function push(t, v, l, c, extra) { var o = { t: t, v: v, line: l, col: c }; if (extra) for (var k in extra) o[k] = extra[k]; toks.push(o); }
    while (i < n) {
      var ch = src[i], l = line, c = col;
      if (/\s/.test(ch)) { adv(1); continue; }
      if (ch === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') adv(1); continue; }
      if (ch === '/' && src[i + 1] === '*') { var depth = 1; adv(2); while (i < n && depth) { if (src[i] === '/' && src[i + 1] === '*') { depth++; adv(2); } else if (src[i] === '*' && src[i + 1] === '/') { depth--; adv(2); } else adv(1); } continue; }
      if (/[A-Za-z_]/.test(ch)) { var s = i; while (i < n && /[A-Za-z0-9_]/.test(src[i])) adv(1); var w = src.slice(s, i); push(KEYWORDS[w] ? 'kw' : 'id', w, l, c); continue; }
      if (/[0-9]/.test(ch)) {
        var st = i, isF = false;
        if (ch === '0' && /[xbo]/.test(src[i + 1] || '')) { adv(2); while (i < n && /[0-9a-fA-F_]/.test(src[i])) adv(1); var t = src.slice(st, i).replace(/_/g, ''); push('int', parseInt(t.slice(2), { x: 16, b: 2, o: 8 }[t[1]]), l, c); continue; }
        while (i < n && /[0-9_]/.test(src[i])) adv(1);
        if (src[i] === '.' && /[0-9]/.test(src[i + 1] || '')) { isF = true; adv(1); while (i < n && /[0-9_]/.test(src[i])) adv(1); }
        else if (src[i] === '.' && src[i + 1] !== '.' && !/[A-Za-z_]/.test(src[i + 1] || '')) { isF = true; adv(1); }
        if (/[eE]/.test(src[i] || '') && /[0-9+-]/.test(src[i + 1] || '')) { isF = true; adv(2); while (i < n && /[0-9]/.test(src[i])) adv(1); }
        var num = src.slice(st, i).replace(/_/g, ''), suf = '';
        var m = /^(u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64)/.exec(src.slice(i, i + 6));
        if (m) { suf = m[1]; adv(suf.length); if (suf[0] === 'f') isF = true; }
        push(isF ? 'float' : 'int', isF ? parseFloat(num) : parseInt(num, 10), l, c, { suf: suf }); continue;
      }
      if (ch === '"') {
        adv(1); var out = '';
        while (i < n && src[i] !== '"') {
          if (src[i] === '\\') { var e = src[i + 1]; if (e === 'n') out += '\n'; else if (e === 't') out += '\t'; else if (e === 'r') out += '\r'; else if (e === '0') out += '\0'; else if (e === '\n') { adv(2); while (/\s/.test(src[i] || 'x') && i < n) adv(1); continue; } else out += e; adv(2); }
          else { out += src[i]; adv(1); }
        }
        if (i >= n) throw new RustError('E0765', 'unterminated double quote string', l, c);
        adv(1); push('str', out, l, c); continue;
      }
      if (ch === "'") {
        // char literal or lifetime
        if (src[i + 1] === '\\') { var e2 = src[i + 2], map = { n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', "'": "'", '"': '"' }; adv(3); adv(1); push('char', map[e2] || e2, l, c); continue; }
        if (src[i + 2] === "'") { var cv = src[i + 1]; adv(3); push('char', cv, l, c); continue; }
        var s2 = i; adv(1); while (i < n && /[A-Za-z0-9_]/.test(src[i])) adv(1); push('lt', src.slice(s2, i), l, c); continue;
      }
      var p3 = src.substr(i, 3), p2 = src.substr(i, 2);
      if (PUNCT3.indexOf(p3) >= 0) { push('p', p3, l, c); adv(3); continue; }
      if (PUNCT2.indexOf(p2) >= 0) { push('p', p2, l, c); adv(2); continue; }
      if ('+-*/%=<>!&|^.,;:(){}[]#?@_~$'.indexOf(ch) >= 0) { push('p', ch, l, c); adv(1); continue; }
      throw new RustError('E0000', 'unknown start of token: ' + ch, l, c);
    }
    toks.push({ t: 'eof', v: '', line: line, col: col });
    return toks;
  };
})();
