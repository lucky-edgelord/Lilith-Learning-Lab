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

/* Rust Lab core, part 2: parser to a small AST. */
(function () {
  var RustError = RL.RustError;
  RL.parse = function (src) {
    var T = RL.lex(src), p = 0;
    function peek(o) { return T[p + (o || 0)]; }
    function next() { return T[p++]; }
    function isP(v, o) { var t = peek(o); return t.t === 'p' && t.v === v; }
    function isKw(v, o) { var t = peek(o); return t.t === 'kw' && t.v === v; }
    function isId(v, o) { var t = peek(o); return t.t === 'id' && (v === undefined || t.v === v); }
    function err(msg, t) { t = t || peek(); throw new RustError('E0000', msg, t.line, t.col); }
    function expectP(v) { var t = peek(); if (t.t === 'p' && t.v === v) return next(); err('expected `' + v + '`, found `' + (t.v === '' ? 'end of file' : t.v) + '`', t); }
    function expectKw(v) { var t = peek(); if (t.t === 'kw' && t.v === v) return next(); err('expected `' + v + '`, found `' + t.v + '`', t); }
    function eatP(v) { if (isP(v)) { next(); return true; } return false; }
    function ident() { var t = peek(); if (t.t === 'id' || (t.t === 'kw' && (t.v === 'self' || t.v === 'Self'))) { next(); return t.v; } err('expected identifier, found `' + t.v + '`', t); }
    function node(k, t, o) { o = o || {}; o.k = k; o.line = t.line; o.col = t.col; return o; }
    // split '>>' into two '>' tokens when closing generics
    function closeAngle() { var t = peek(); if (t.t === 'p' && t.v === '>') { next(); return; } if (t.t === 'p' && t.v === '>>') { T[p] = { t: 'p', v: '>', line: t.line, col: t.col + 1 }; return; } if (t.t === 'p' && t.v === '>>=') { T[p] = { t: 'p', v: '>=', line: t.line, col: t.col + 1 }; return; } if (t.t === 'p' && t.v === '>=') { T[p] = { t: 'p', v: '=', line: t.line, col: t.col + 1 }; return; } err('expected `>`', t); }
    function skipGenerics() { if (!isP('<')) return []; next(); var names = [], depth = 1; while (depth > 0) { var t = peek(); if (t.t === 'eof') err('unterminated generics'); if (t.t === 'p' && t.v === '<') depth++; else if (t.t === 'p' && t.v === '>') depth--; else if (t.t === 'p' && t.v === '>>') { depth -= 2; } else if (t.t === 'lt') names.push(t.v); next(); } return names; }
    // ----- types -----
    function parseType() {
      var t = peek();
      if (isP('&') || isP('&&')) { next(); var lt = null; if (peek().t === 'lt') lt = next().v; var mut = false; if (isKw('mut')) { next(); mut = true; } var inner = parseType(); return { k: 'tref', mut: mut, lt: lt, to: inner, line: t.line, col: t.col }; }
      if (isP('(')) { next(); var items = []; while (!isP(')')) { items.push(parseType()); if (!eatP(',')) break; } expectP(')'); return items.length === 0 ? { k: 'tpath', name: '()', args: [] } : { k: 'ttuple', items: items }; }
      if (isP('[')) { next(); var el = parseType(); var len = null; if (eatP(';')) { len = parseExpr(); } expectP(']'); return { k: len ? 'tarray' : 'tslice', el: el, len: len }; }
      if (isP('*')) { next(); if (isKw('mut') || isKw('const')) next(); return parseType(); }
      if (isKw('dyn') || isId('impl')) { next(); var tt = parseType(); while (eatP('+')) parseType(); return { k: 'tdyn', of: tt }; }
      if (isP('!')) { next(); return { k: 'tpath', name: '!', args: [] }; }
      if (isKw('fn')) { next(); expectP('('); while (!isP(')')) { parseType(); if (!eatP(',')) break; } expectP(')'); if (eatP('->')) parseType(); return { k: 'tpath', name: 'fn', args: [] }; }
      var name = ident(); while (isP('::')) { next(); name = ident(); }
      var args = [];
      if (isP('<')) { next(); while (!(isP('>') || isP('>>') || isP('>=') || isP('>>='))) { if (peek().t === 'lt') { next(); } else args.push(parseType()); if (!eatP(',')) break; } closeAngle(); }
      return { k: 'tpath', name: name, args: args, line: t.line, col: t.col };
    }
    // ----- patterns -----
    function parsePattern() {
      var first = parsePat1();
      if (isP('|') && !isP('||')) { var alts = [first]; while (isP('|')) { next(); alts.push(parsePat1()); } return { k: 'por', alts: alts, line: first.line }; }
      return first;
    }
    function parsePat1() { var t0 = peek(); var r = parsePat1raw(); if (r.col === undefined) r.col = t0.col; return r; }
    function parsePat1raw() {
      var t = peek();
      if (isP('_')) { next(); return { k: 'pwild', line: t.line }; }
      if (t.t === 'id' && t.v === '_') { next(); return { k: 'pwild', line: t.line }; }
      if (isP('&') || isP('&&')) { next(); if (isKw('mut')) next(); return { k: 'pref', p: parsePat1(), line: t.line }; }
      if (isP('(')) { next(); var items = []; while (!isP(')')) { items.push(parsePattern()); if (!eatP(',')) break; } expectP(')'); return { k: 'ptuple', items: items, line: t.line }; }
      if (isP('[')) { next(); var its = []; while (!isP(']')) { its.push(parsePattern()); if (!eatP(',')) break; } expectP(']'); return { k: 'ptuple', items: its, arr: true, line: t.line }; }
      if (t.t === 'int' || t.t === 'float' || t.t === 'str' || t.t === 'char' || (t.t === 'kw' && (t.v === 'true' || t.v === 'false')) || (isP('-') && (peek(1).t === 'int' || peek(1).t === 'float'))) {
        var lo = parseLitExpr();
        if (isP('..=') || isP('..')) { var incl = next().v === '..='; var hi = null; if (peek().t === 'int' || peek().t === 'char' || peek().t === 'float' || isP('-')) hi = parseLitExpr(); return { k: 'prange', lo: lo, hi: hi, incl: incl, line: t.line }; }
        return { k: 'plit', e: lo, line: t.line };
      }
      if (isKw('mut') || isKw('ref')) { var isRef = isKw('ref'); next(); var mu = false; if (isRef && isKw('mut')) { next(); mu = true; } else if (!isRef) mu = true; var nt0 = peek(); var nm = ident(); return { k: 'pid', name: nm, mut: mu, line: t.line, col: nt0.col }; }
      if (t.t === 'id' || t.t === 'kw') {
        var path = [ident()];
        while (isP('::')) { next(); path.push(ident()); }
        if (isP('(')) { next(); var its2 = []; while (!isP(')')) { its2.push(parsePattern()); if (!eatP(',')) break; } expectP(')'); return { k: 'pvar', path: path, items: its2, line: t.line }; }
        if (isP('{') ) { next(); var fields = [], rest = false; while (!isP('}')) { if (isP('..')) { next(); rest = true; break; } var fn_ = ident(); var sub = null; if (eatP(':')) sub = parsePattern(); else sub = { k: 'pid', name: fn_, mut: false, line: t.line }; fields.push({ name: fn_, p: sub }); if (!eatP(',')) break; } expectP('}'); return { k: 'pvar', path: path, fields: fields, rest: rest, line: t.line }; }
        if (path.length === 1 && /^[a-z_]/.test(path[0]) ) return { k: 'pid', name: path[0], mut: false, line: t.line };
        if (path.length === 1 && isP('@')) { next(); var inner = parsePat1(); return { k: 'pbind', name: path[0], p: inner, line: t.line }; }
        return { k: 'pvar', path: path, items: null, line: t.line };
      }
      err('expected a pattern, found `' + t.v + '`', t);
    }
    function parseLitExpr() { var t = peek(), neg = false; if (isP('-')) { next(); neg = true; t = peek(); } next(); var v = t.v; if (neg) v = -v; var k = t.t === 'kw' ? 'bool' : t.t; return { k: k, v: t.t === 'kw' ? t.v === 'true' : v, suf: t.suf || '', line: t.line, col: t.col }; }
    // ----- expressions -----
    var noStruct = 0;
    function parseExpr() { return parseAssign(); }
    function parseAssign() {
      var l = parseRange();
      var t = peek();
      if (t.t === 'p' && (t.v === '=' || t.v === '+=' || t.v === '-=' || t.v === '*=' || t.v === '/=' || t.v === '%=')) { next(); var r = parseAssign(); return node('assign', t, { op: t.v, l: l, r: r }); }
      return l;
    }
    function startsExpr() { var t = peek(); if (t.t === 'eof') return false; if (t.t === 'p') return ['(', '[', '-', '!', '*', '&', '|', '||', '{'].indexOf(t.v) >= 0 && !(t.v === '{' && noStruct); if (t.t === 'kw') return ['true', 'false', 'self', 'Self', 'if', 'match', 'loop', 'while', 'for', 'return', 'break', 'continue', 'move'].indexOf(t.v) >= 0; return true; }
    function parseRange() {
      var t = peek();
      if (isP('..') || isP('..=')) { var inc = next().v === '..='; var hi = startsExpr() ? parseBin(0) : null; return node('range', t, { lo: null, hi: hi, incl: inc }); }
      var lo = parseBin(0);
      if (isP('..') || isP('..=')) { var t2 = next(); var inc2 = t2.v === '..='; var hi2 = startsExpr() ? parseBin(0) : null; return node('range', t2, { lo: lo, hi: hi2, incl: inc2 }); }
      return lo;
    }
    var BINPREC = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3, '|': 4, '^': 5, '&': 6, '<<': 7, '>>': 7, '+': 8, '-': 8, '*': 9, '/': 9, '%': 9 };
    function parseBin(minp) {
      var l = parseUnary();
      for (;;) {
        var t = peek();
        if (t.t === 'kw' && t.v === 'as') { if (10 < minp) break; next(); var ty = parseType(); l = node('cast', t, { e: l, ty: ty }); continue; }
        if (t.t !== 'p') break;
        var pr = BINPREC[t.v];
        if (!pr || pr < minp) break;
        next();
        var r = parseBin(pr + 1);
        l = node('bin', t, { op: t.v, l: l, r: r });
      }
      return l;
    }
    function parseUnary() {
      var t = peek();
      if (t.t === 'p') {
        if (t.v === '-' || t.v === '!') { next(); var e = parseUnary(); return node('unary', t, { op: t.v, e: e }); }
        if (t.v === '*') { next(); return node('deref', t, { e: parseUnary() }); }
        if (t.v === '&' || t.v === '&&') { next(); var mut = false; if (isKw('mut')) { next(); mut = true; } var e2 = parseUnary(); var r = node('ref', t, { mut: mut, e: e2 }); return t.v === '&&' ? node('ref', t, { mut: false, e: r }) : r; }
      }
      return parsePostfix(parsePrimary());
    }
    function parseArgs(close) { var args = []; while (!isP(close)) { args.push(parseExpr()); if (!eatP(',')) break; } expectP(close); return args; }
    function parsePostfix(e) {
      for (;;) {
        var t = peek();
        if (t.t !== 'p') break;
        if (t.v === '(') { next(); var saveNS = noStruct; noStruct = 0; var args = parseArgs(')'); noStruct = saveNS; e = node('call', t, { f: e, args: args }); continue; }
        if (t.v === '[') { next(); var sv = noStruct; noStruct = 0; var ix = parseExpr(); noStruct = sv; expectP(']'); e = node('index', t, { e: e, idx: ix }); continue; }
        if (t.v === '?') { next(); e = node('try', t, { e: e }); continue; }
        if (t.v === '.') {
          next(); var nt = peek();
          if (nt.t === 'int') { next(); e = node('tfield', nt, { e: e, idx: nt.v }); continue; }
          if (nt.t === 'float') { next(); var parts = String(nt.v).split('.'); e = node('tfield', nt, { e: node('tfield', nt, { e: e, idx: +parts[0] }), idx: +parts[1] }); continue; }
          var name = ident();
          var tf = null; if (isP('::')) { next(); tf = skipGenericArgs(); }
          if (isP('(')) { next(); var sv2 = noStruct; noStruct = 0; var a2 = parseArgs(')'); noStruct = sv2; e = node('mcall', nt, { recv: e, name: name, args: a2, tf: tf }); }
          else e = node('field', nt, { e: e, name: name });
          continue;
        }
        break;
      }
      return e;
    }
    function skipGenericArgs() { var r = []; if (isP('<')) { next(); while (!(isP('>') || isP('>>'))) { r.push(parseType()); if (!eatP(',')) break; } closeAngle(); } return r; }
    function parseBlock() {
      var t = expectP('{'); var stmts = [], tail = null, saveNS = noStruct; noStruct = 0;
      while (!isP('}')) {
        if (peek().t === 'eof') err('this file contains an unclosed delimiter', t);
        if (eatP(';')) continue;
        var st = parseStmt();
        if (st.k === 'exprstmt') {
          if (isP('}') && !st.semi) { tail = st.e; break; }
          if (!st.semi && !st.blocky) err('expected `;`, found `' + peek().v + '`', peek());
          stmts.push(st);
        } else stmts.push(st);
      }
      var endT = expectP('}'); noStruct = saveNS;
      return node('block', t, { stmts: stmts, tail: tail, endLine: endT.line, endCol: endT.col });
    }
    function isBlocky(e) { return e.k === 'if' || e.k === 'match' || e.k === 'while' || e.k === 'loop' || e.k === 'for' || e.k === 'block'; }
    function parseStmt() {
      var t = peek();
      if (isKw('let')) {
        next(); var pat = parsePattern(); var ty = null, init = null, els = null;
        if (eatP(':')) ty = parseType();
        if (eatP('=')) { init = parseExpr(); if (isKw('else')) { next(); els = parseBlock(); } }
        expectP(';');
        return node('let', t, { pat: pat, ty: ty, init: init, els: els });
      }
      if (isP('#')) { var attrs = parseAttrs(); var it = parseItem(attrs); if (it) return it; }
      if (isKw('fn') || isKw('struct') || isKw('enum') || isKw('impl') || isKw('trait') || isKw('use') || isKw('const') || isKw('static') || isKw('pub') || isKw('mod') || isKw('type')) { var it2 = parseItem([]); return it2; }
      var e = parseExprStmt();
      var semi = eatP(';');
      return node('exprstmt', t, { e: e, semi: semi, blocky: isBlocky(e) });
    }
    function parseExprStmt() {
      // block-like expressions at statement start end without needing a ';'
      var t = peek();
      if (isKw('if') || isKw('match') || isKw('while') || isKw('loop') || isKw('for') || isP('{')) {
        var e = parsePrimary();
        if (isP('.') || isP('?')) e = parsePostfix(e);
        return e;
      }
      return parseExpr();
    }
    function parseCond() { noStruct++; var c; if (isKw('let')) { var t = next(); var pat = parsePattern(); expectP('='); var e = parseBin(0); c = node('letcond', t, { pat: pat, e: e }); } else c = parseExpr(); noStruct--; return c; }
    function parsePrimary() {
      var t = peek();
      switch (t.t) {
        case 'int': next(); return node('int', t, { v: t.v, suf: t.suf });
        case 'float': next(); return node('float', t, { v: t.v, suf: t.suf });
        case 'str': next(); return node('str', t, { v: t.v });
        case 'char': next(); return node('char', t, { v: t.v });
        case 'lt': { next(); expectP(':'); var lp = peek(); var body = parsePrimary(); body.label = t.v; return body; }
      }
      if (t.t === 'kw') {
        if (t.v === 'true' || t.v === 'false') { next(); return node('bool', t, { v: t.v === 'true' }); }
        if (t.v === 'if') return parseIf();
        if (t.v === 'match') { next(); noStruct++; var scrut = parseExpr(); noStruct--; expectP('{'); var arms = [];
          while (!isP('}')) { var pat = parsePattern(); var guard = null; if (isKw('if')) { next(); guard = parseExpr(); } expectP('=>'); var sv = noStruct; noStruct = 0; var b = parseExprStmtArm(); noStruct = sv; arms.push({ pat: pat, guard: guard, body: b }); if (!eatP(',')) { if (!isP('}') && !isBlocky(b)) err('expected `,` or `}`', peek()); } }
          expectP('}'); return node('match', t, { e: scrut, arms: arms }); }
        if (t.v === 'while') { next(); var c = parseCond(); var bd = parseBlock(); return node('while', t, { cond: c, body: bd }); }
        if (t.v === 'loop') { next(); return node('loop', t, { body: parseBlock() }); }
        if (t.v === 'for') { next(); var pt = parsePattern(); expectKw('in'); noStruct++; var it = parseExpr(); noStruct--; var bd2 = parseBlock(); return node('for', t, { pat: pt, iter: it, body: bd2 }); }
        if (t.v === 'return') { next(); var re = null; if (startsExpr() && !isP('}') ) re = parseExpr(); return node('return', t, { e: re }); }
        if (t.v === 'break') { next(); var lab = null; if (peek().t === 'lt') lab = next().v; var be = null; if (startsExpr() && !isP('}')) be = parseExpr(); return node('break', t, { e: be, label: lab }); }
        if (t.v === 'continue') { next(); var lab2 = null; if (peek().t === 'lt') lab2 = next().v; return node('continue', t, { label: lab2 }); }
        if (t.v === 'move') { next(); var mcl = parsePrimary(); mcl.move = true; return mcl; }
        if (t.v === 'self' || t.v === 'Self') { next(); var path0 = [t.v]; while (isP('::')) { next(); path0.push(ident()); } return maybeStructLit(node('path', t, { segs: path0 }), t); }
      }
      if (t.t === 'p') {
        if (t.v === '(') { next(); var sv3 = noStruct; noStruct = 0; var items = [], trailing = false; while (!isP(')')) { items.push(parseExpr()); trailing = false; if (!eatP(',')) break; trailing = true; } expectP(')'); noStruct = sv3; if (items.length === 1 && !trailing) return node('paren', t, { e: items[0] }); if (items.length === 0) return node('unit', t); return node('tuple', t, { items: items }); }
        if (t.v === '[') { next(); var sv4 = noStruct; noStruct = 0; if (isP(']')) { next(); noStruct = sv4; return node('array', t, { items: [] }); } var first = parseExpr(); if (eatP(';')) { var n = parseExpr(); expectP(']'); noStruct = sv4; return node('repeat', t, { e: first, n: n }); } var its = [first]; while (eatP(',')) { if (isP(']')) break; its.push(parseExpr()); } expectP(']'); noStruct = sv4; return node('array', t, { items: its }); }
        if (t.v === '{') return parseBlock();
        if (t.v === '|' || t.v === '||') return parseClosure();
      }
      if (t.t === 'id') {
        next();
        if (isP('!') && !isP('=', 1) ) { // macro
          if (peek(1).t === 'p' && ['(', '[', '{'].indexOf(peek(1).v) >= 0) {
            next(); var open = next().v, close = { '(': ')', '[': ']', '{': '}' }[open]; var sv5 = noStruct; noStruct = 0;
            var margs = [];
            if (t.v === 'matches') { var me = parseExpr(); expectP(','); var mp = parsePattern(); var mg = null; if (isKw('if')) { next(); mg = parseExpr(); } eatP(','); expectP(close); noStruct = sv5; return node('macro', t, { name: 'matches', args: [me], pat: mp, guard: mg }); }
            if (t.v === 'vec' && open === '[') { if (!isP(']')) { var f1 = parseExpr(); if (eatP(';')) { var cnt = parseExpr(); expectP(']'); noStruct = sv5; return node('macro', t, { name: 'vec_repeat', args: [f1, cnt] }); } margs.push(f1); while (eatP(',')) { if (isP(']')) break; margs.push(parseExpr()); } } expectP(']'); }
            else margs = parseArgs(close);
            noStruct = sv5; return node('macro', t, { name: t.v, args: margs });
          }
        }
        var segs = [t.v];
        while (isP('::')) { next(); if (isP('<')) { skipGenericArgs(); continue; } segs.push(ident()); }
        return maybeStructLit(node('path', t, { segs: segs }), t);
      }
      err('expected expression, found `' + (t.v === '' ? 'end of file' : t.v) + '`', t);
    }
    function parseExprStmtArm() { if (isP('{')) { var b = parseBlock(); return b; } return parseExpr(); }
    function maybeStructLit(pathNode, t) {
      var last = pathNode.segs[pathNode.segs.length - 1];
      if (isP('{') && !noStruct && /^[A-Z]/.test(last)) {
        // lookahead: `{ ident :` or `{ }` or `{ ..`
        var a = peek(1), b = peek(2);
        if ((a.t === 'id' && b.t === 'p' && (b.v === ':' || b.v === ',' || b.v === '}')) || (a.t === 'p' && (a.v === '}' || a.v === '..'))) {
          next(); var fields = [], base = null;
          while (!isP('}')) { if (isP('..')) { next(); base = parseExpr(); break; } var fnm = ident(); var ex; if (eatP(':')) ex = parseExpr(); else ex = node('path', t, { segs: [fnm] }); fields.push({ name: fnm, e: ex }); if (!eatP(',')) break; }
          expectP('}'); return node('struct_lit', t, { path: pathNode.segs, fields: fields, base: base });
        }
      }
      return pathNode;
    }
    function parseIf() {
      var t = expectKw('if'); var c = parseCond(); var th = parseBlock(); var el = null;
      if (isKw('else')) { next(); el = isKw('if') ? parseIf() : parseBlock(); }
      return node('if', t, { cond: c, then: th, els: el });
    }
    function parseClosure() {
      var t = next(), params = [];
      if (t.v === '|') { while (!isP('|')) { var pt = parsePat1(); var ty = null; if (eatP(':')) ty = parseType(); params.push({ pat: pt, ty: ty }); if (!eatP(',')) break; } expectP('|'); }
      var ret = null; if (eatP('->')) ret = parseType();
      var body = ret ? parseBlock() : parseExpr();
      return node('closure', t, { params: params, body: body });
    }
    // ----- items -----
    function parseAttrs() { var attrs = []; while (isP('#')) { next(); eatP('!'); expectP('['); var depth = 1, text = ''; while (depth) { var t = next(); if (t.t === 'eof') err('unterminated attribute'); if (t.t === 'p' && t.v === '[') depth++; if (t.t === 'p' && t.v === ']') { depth--; if (!depth) break; } text += t.v + ' '; } attrs.push(text.trim()); } return attrs; }
    function deriveList(attrs) { var out = []; attrs.forEach(function (a) { var m = /^derive\s*\(\s*(.*)\)$/.exec(a.replace(/ /g, '').replace(/^derive\(/, 'derive(')); if (/^derive/.test(a.replace(/ /g, ''))) { a.replace(/ /g, '').replace(/^derive\(|\)$/g, '').split(',').forEach(function (x) { if (x) out.push(x); }); } }); return out; }
    function parseItem(attrs) {
      var t = peek(); var isPub = false;
      if (isKw('pub')) { next(); isPub = true; if (isP('(')) { next(); while (!isP(')')) next(); next(); } }
      if (isKw('fn')) return parseFn(attrs);
      if (isKw('struct')) { next(); var nm = ident(); var gen = skipGenerics(); var fields = null, tup = null;
        if (isP('{')) { next(); fields = []; while (!isP('}')) { parseAttrs(); if (isKw('pub')) { next(); if (isP('(')) { next(); while (!isP(')')) next(); next(); } } var fname = ident(); expectP(':'); var fty = parseType(); fields.push({ name: fname, ty: fty }); if (!eatP(',')) break; } expectP('}'); }
        else if (isP('(')) { next(); tup = []; while (!isP(')')) { if (isKw('pub')) next(); tup.push(parseType()); if (!eatP(',')) break; } expectP(')'); expectP(';'); }
        else expectP(';');
        return node('struct', t, { name: nm, fields: fields, tuple: tup, derive: deriveList(attrs), gen: gen }); }
      if (isKw('enum')) { next(); var en = ident(); skipGenerics(); expectP('{'); var vars = [];
        while (!isP('}')) { parseAttrs(); var vn = ident(); var v = { name: vn, kind: 'unit', tys: [], fields: [] };
          if (isP('(')) { next(); v.kind = 'tuple'; while (!isP(')')) { v.tys.push(parseType()); if (!eatP(',')) break; } expectP(')'); }
          else if (isP('{')) { next(); v.kind = 'struct'; while (!isP('}')) { var fnn = ident(); expectP(':'); v.fields.push({ name: fnn, ty: parseType() }); if (!eatP(',')) break; } expectP('}'); }
          if (eatP('=')) parseExpr();
          vars.push(v); if (!eatP(',')) break; }
        expectP('}'); return node('enum', t, { name: en, variants: vars, derive: deriveList(attrs) }); }
      if (isKw('impl')) { next(); var igen = skipGenerics(); var ty1 = parseType(); var trait = null, tyName = ty1.name || (ty1.to && ty1.to.name);
        if (isKw('for')) { next(); trait = ty1.name; var ty2 = parseType(); tyName = ty2.name || (ty2.to && ty2.to.name); }
        if (isKw('where')) { while (!isP('{')) next(); }
        expectP('{'); var items = []; while (!isP('}')) { var a2 = parseAttrs(); if (isKw('pub')) { next(); if (isP('(')) { next(); while (!isP(')')) next(); next(); } } if (isKw('const')) { next(); var cn = ident(); expectP(':'); parseType(); expectP('='); var ce = parseExpr(); expectP(';'); items.push(node('const', t, { name: cn, e: ce })); continue; } if (isKw('type')) { while (!isP(';')) next(); next(); continue; } items.push(parseFn(a2)); }
        expectP('}'); items.forEach(function (f) { if (f.k === 'fn') f.lts = (f.lts || []).concat(igen); }); return node('impl', t, { ty: tyName, trait: trait, items: items }); }
      if (isKw('trait')) { next(); var tn = ident(); skipGenerics(); if (eatP(':')) { while (!isP('{')) next(); } expectP('{'); var titems = []; while (!isP('}')) { parseAttrs(); if (isKw('type')) { while (!isP(';')) next(); next(); continue; } titems.push(parseFn([], true)); } expectP('}'); return node('trait', t, { name: tn, items: titems }); }
      if (isKw('use')) { next(); while (!isP(';')) { if (peek().t === 'eof') err('expected `;`'); next(); } next(); return node('use', t); }
      if (isKw('mod')) { next(); ident(); if (eatP(';')) return node('use', t); expectP('{'); var depth = 1; var inner = []; while (!isP('}')) { var a3 = parseAttrs(); var it = parseItem(a3); if (it) inner.push(it); } expectP('}'); return node('mod', t, { items: inner }); }
      if (isKw('const') || isKw('static')) { next(); if (isKw('mut')) next(); var cname = ident(); expectP(':'); var cty = parseType(); expectP('='); var cex = parseExpr(); expectP(';'); return node('const', t, { name: cname, ty: cty, e: cex }); }
      if (isKw('type')) { while (!isP(';')) next(); next(); return node('use', t); }
      err('expected item, found `' + t.v + '`', t);
    }
    function parseFn(attrs, allowNoBody) {
      var t = expectKw('fn'); var name = ident(); var lts = skipGenerics();
      expectP('('); var params = [], selfKind = null;
      while (!isP(')')) {
        parseAttrs();
        if (isP('&') && (isKw('self', 1) || (isKw('mut', 1) && isKw('self', 2)) || (peek(1).t === 'lt'))) {
          var save = p; next(); if (peek().t === 'lt') next(); var m = false; if (isKw('mut')) { next(); m = true; }
          if (isKw('self')) { next(); selfKind = m ? 'mut' : 'ref'; if (!eatP(',')) break; continue; } p = save;
        }
        if (isKw('self') || (isKw('mut') && isKw('self', 1))) { var mm = false; if (isKw('mut')) { next(); mm = true; } next(); selfKind = 'val'; if (eatP(':')) parseType(); if (!eatP(',')) break; continue; }
        var pat = parsePattern(); expectP(':'); var ty = parseType(); params.push({ pat: pat, ty: ty, mut: pat.mut }); if (!eatP(',')) break;
      }
      expectP(')');
      var ret = null; if (eatP('->')) ret = parseType();
      if (isKw('where')) { while (!isP('{') && !isP(';')) next(); }
      var body = null;
      if (isP('{')) body = parseBlock(); else { expectP(';'); }
      return node('fn', t, { name: name, params: params, ret: ret, body: body, selfKind: selfKind, lts: lts, attrs: attrs });
    }
    var items = [];
    while (peek().t !== 'eof') { var attrs = parseAttrs(); var it = parseItem(attrs); if (it) items.push(it); }
    return { items: items };
  };
})();

/* Rust Lab core, part 3: runtime values, formatting, equality. */
(function () {
  var V = RL.V = {};
  function I(v, t) { this.v = v; this.t = t || null; }
  function Fl(v, t) { this.v = v; this.t = t || null; }
  function Ch(c) { this.c = c; }
  function RS(s) { this.s = s; }
  function Tup(a) { this.a = a; }
  function Struct(st, f, order) { this.st = st; this.f = f; this.o = order || Object.keys(f); this.dropped = false; }
  function Enum(en, vn, v, names) { this.en = en; this.vn = vn; this.v = v; this.names = names || null; this.dropped = false; }
  function Range(lo, hi, incl) { this.lo = lo; this.hi = hi; this.incl = incl; }
  function Ref(get, set, mut) { this.get = get; this.set = set; this.mut = !!mut; }
  function Bx(v) { this.v = v; }
  function Rc(box) { this.box = box; box.n++; this.dead = false; }
  function RefCell(v) { this.v = v; this.b = 0; }
  function RMap() { this.m = new Map(); }
  function RSet() { this.m = new Map(); }
  function It(nx) { this.nx = nx; }
  function Fn(f, name) { this.f = f; this.name = name; }
  function Unit() { }
  var UNIT = new Unit();
  function ErrVal(dbg, disp) { this.dbg = dbg; this.disp = disp; }
  V.I = I; V.Fl = Fl; V.Ch = Ch; V.RS = RS; V.Tup = Tup; V.Struct = Struct; V.Enum = Enum; V.Range = Range; V.Ref = Ref; V.Bx = Bx; V.Rc = Rc; V.RefCell = RefCell; V.RMap = RMap; V.RSet = RSet; V.It = It; V.Fn = Fn; V.UNIT = UNIT; V.ErrVal = ErrVal;
  var BOUNDS = {};
  [['i8', 8, 1], ['i16', 16, 1], ['i32', 32, 1], ['i64', 64, 1], ['i128', 128, 1], ['isize', 64, 1], ['u8', 8, 0], ['u16', 16, 0], ['u32', 32, 0], ['u64', 64, 0], ['u128', 128, 0], ['usize', 64, 0]].forEach(function (x) {
    var bits = BigInt(x[1]); BOUNDS[x[0]] = x[2] ? [-(1n << (bits - 1n)), (1n << (bits - 1n)) - 1n] : [0n, (1n << bits) - 1n];
  });
  V.BOUNDS = BOUNDS; V.isIntT = function (t) { return !!BOUNDS[t]; };
  V.mkSome = function (x) { return new Enum('Option', 'Some', [x]); };
  V.NONE = function () { return new Enum('Option', 'None', []); };
  V.mkOk = function (x) { return new Enum('Result', 'Ok', [x]); };
  V.mkErr = function (x) { return new Enum('Result', 'Err', [x]); };
  V.opt = function (x) { return x === undefined || x === null ? V.NONE() : V.mkSome(x); };
  V.mkI = function (n, t) { return new I(BigInt(n), t); };
  V.usize = function (n) { return new I(BigInt(n), 'usize'); };
  // strip references/boxes
  var dr = V.dr = function (v) { for (;;) { if (v instanceof Ref) v = v.get(); else if (v instanceof Bx) v = v.v; else if (v instanceof Rc) v = v.box.v; else return v; } };
  V.str = function (v) { v = dr(v); if (typeof v === 'string') return v; if (v instanceof RS) return v.s; if (v instanceof Ch) return v.c; return null; };
  V.typeName = function (v) {
    if (v instanceof Ref) return (v.mut ? '&mut ' : '&') + V.typeName(v.get());
    if (v instanceof I) return v.t || 'i32';
    if (v instanceof Fl) return v.t || 'f64';
    if (typeof v === 'boolean') return 'bool';
    if (v instanceof Ch) return 'char';
    if (typeof v === 'string') return '&str';
    if (v instanceof RS) return 'String';
    if (v === UNIT) return '()';
    if (v instanceof Tup) return '(' + v.a.map(V.typeName).join(', ') + ')';
    if (Array.isArray(v)) return 'Vec<' + (v.length ? V.typeName(v[0]) : '_') + '>';
    if (v instanceof Struct) return v.st;
    if (v instanceof Enum) return v.en === 'Option' ? 'Option<' + (v.v.length ? V.typeName(v.v[0]) : '_') + '>' : v.en === 'Result' ? 'Result<_, _>' : v.en;
    if (v instanceof Bx) return 'Box<' + V.typeName(v.v) + '>';
    if (v instanceof Rc) return 'Rc<' + V.typeName(v.box.v) + '>';
    if (v instanceof RefCell) return 'RefCell<' + V.typeName(v.v) + '>';
    if (v instanceof RMap) return 'HashMap<_, _>';
    if (v instanceof RSet) return 'HashSet<_>';
    if (v instanceof Range) return 'Range<i32>';
    if (v instanceof Fn) return 'closure';
    return 'value';
  };
  // Copy-ness (approximate, by runtime value)
  V.derives = {}; // type name -> [derive list]
  var isCopy = V.isCopy = function (v) {
    if (v instanceof I || v instanceof Fl || v instanceof Ch || typeof v === 'boolean' || typeof v === 'string' || v === UNIT || v instanceof Range) return true;
    if (v instanceof Ref) return !v.mut;
    if (v instanceof Tup) return v.a.every(isCopy);
    if (v instanceof Struct) return (V.derives[v.st] || []).indexOf('Copy') >= 0;
    if (v instanceof Enum) { if (v.en === 'Option') return v.v.every(isCopy); if (v.en === 'Result') return false; return (V.derives[v.en] || []).indexOf('Copy') >= 0; }
    if (v instanceof Fn) return true;
    return false;
  };
  V.copy = function (v) {
    if (v instanceof Tup) return new Tup(v.a.map(V.copy));
    if (v instanceof Struct) { var f = {}; v.o.forEach(function (k) { f[k] = V.copy(v.f[k]); }); return new Struct(v.st, f, v.o); }
    if (v instanceof Enum) return new Enum(v.en, v.vn, v.v.map(V.copy), v.names);
    return v;
  };
  var clone = V.clone = function (v) {
    if (v instanceof I) return new I(v.v, v.t);
    if (v instanceof Fl) return new Fl(v.v, v.t);
    if (v instanceof RS) return new RS(v.s);
    if (Array.isArray(v)) return v.map(clone);
    if (v instanceof Tup) return new Tup(v.a.map(clone));
    if (v instanceof Struct) { var f = {}; v.o.forEach(function (k) { f[k] = clone(v.f[k]); }); return new Struct(v.st, f, v.o); }
    if (v instanceof Enum) return new Enum(v.en, v.vn, v.v.map(clone), v.names);
    if (v instanceof Bx) return new Bx(clone(v.v));
    if (v instanceof Rc) return new Rc(v.box);
    if (v instanceof RefCell) return new RefCell(clone(v.v));
    if (v instanceof RMap) { var m = new RMap(); v.m.forEach(function (e, k) { m.m.set(k, [clone(e[0]), clone(e[1])]); }); return m; }
    if (v instanceof RSet) { var s = new RSet(); v.m.forEach(function (e, k) { s.m.set(k, [clone(e[0])]); }); return s; }
    if (v instanceof Ref) return v.mut ? v : clone(v.get());
    return v;
  };
  V.key = function (v) {
    v = dr(v);
    if (v instanceof I) return 'i' + v.v; if (v instanceof Fl) return 'f' + v.v; if (v instanceof Ch) return 'c' + v.c;
    if (typeof v === 'string') return 's' + v; if (v instanceof RS) return 's' + v.s; if (typeof v === 'boolean') return 'b' + v;
    if (v instanceof Tup) return 't(' + v.a.map(V.key).join(',') + ')';
    if (Array.isArray(v)) return 'v[' + v.map(V.key).join(',') + ']';
    if (v instanceof Struct) return 'S' + v.st + '{' + v.o.map(function (k) { return V.key(v.f[k]); }).join(',') + '}';
    if (v instanceof Enum) return 'E' + v.en + '::' + v.vn + '(' + v.v.map(V.key).join(',') + ')';
    if (v === UNIT) return 'u';
    return '?';
  };
  var eq = V.eq = function (a, b) {
    a = dr(a); b = dr(b);
    if (a instanceof I && b instanceof I) return a.v === b.v;
    if (a instanceof Fl && b instanceof Fl) return a.v === b.v;
    if (a instanceof Fl && b instanceof I || a instanceof I && b instanceof Fl) return false;
    var sa = V.str(a), sb = V.str(b);
    if (sa !== null && sb !== null && !(a instanceof Ch) === !(b instanceof Ch)) return sa === sb;
    if (typeof a === 'boolean' || typeof b === 'boolean') return a === b;
    if (a instanceof Ch && b instanceof Ch) return a.c === b.c;
    if (a === UNIT && b === UNIT) return true;
    if (a instanceof Tup && b instanceof Tup) return a.a.length === b.a.length && a.a.every(function (x, i) { return eq(x, b.a[i]); });
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every(function (x, i) { return eq(x, b[i]); });
    if (a instanceof Struct && b instanceof Struct) return a.st === b.st && a.o.every(function (k) { return eq(a.f[k], b.f[k]); });
    if (a instanceof Enum && b instanceof Enum) return a.en === b.en && a.vn === b.vn && a.v.length === b.v.length && a.v.every(function (x, i) { return eq(x, b.v[i]); });
    return a === b;
  };
  var cmp = V.cmp = function (a, b) {
    a = dr(a); b = dr(b);
    if (a instanceof I && b instanceof I) return a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
    if (a instanceof Fl && b instanceof Fl) return a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
    var sa = V.str(a), sb = V.str(b);
    if (sa !== null && sb !== null) return sa < sb ? -1 : sa > sb ? 1 : 0;
    if (typeof a === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0);
    if (a instanceof Tup && b instanceof Tup) { for (var i = 0; i < a.a.length; i++) { var c = cmp(a.a[i], b.a[i]); if (c) return c; } return 0; }
    if (Array.isArray(a) && Array.isArray(b)) { for (var j = 0; j < Math.min(a.length, b.length); j++) { var c2 = cmp(a[j], b[j]); if (c2) return c2; } return a.length - b.length < 0 ? -1 : a.length > b.length ? 1 : 0; }
    if (a instanceof Enum && b instanceof Enum) { if (a.vn !== b.vn) { var order = V.variantOrder(a); return order.indexOf(a.vn) - order.indexOf(b.vn) < 0 ? -1 : 1; } for (var k = 0; k < a.v.length; k++) { var c3 = cmp(a.v[k], b.v[k]); if (c3) return c3; } return 0; }
    if (a instanceof Struct && b instanceof Struct) { for (var q = 0; q < a.o.length; q++) { var c4 = cmp(a.f[a.o[q]], b.f[a.o[q]]); if (c4) return c4; } return 0; }
    return 0;
  };
  V.variantOrder = function (e) { return (V.enumDefs && V.enumDefs[e.en]) || (e.en === 'Option' ? ['None', 'Some'] : e.en === 'Result' ? ['Ok', 'Err'] : [e.vn]); };
  // ---------- formatting ----------
  function fmtFloat(x, prec, debug) {
    if (isNaN(x)) return 'NaN'; if (x === Infinity) return 'inf'; if (x === -Infinity) return '-inf';
    if (prec != null) return x.toFixed(prec);
    var s = String(x);
    if (/e/.test(s)) { s = x.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 20 }); }
    if (debug && !/[.]/.test(s)) s += '.0';
    return s;
  }
  V.fmtFloat = fmtFloat;
  function escStr(s) { return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r'); }
  V.display = function (v) {
    v = dr(v);
    if (v instanceof I) return v.v.toString();
    if (v instanceof Fl) return fmtFloat(v.v, null, false);
    if (typeof v === 'boolean') return String(v);
    if (v instanceof Ch) return v.c;
    if (typeof v === 'string') return v;
    if (v instanceof RS) return v.s;
    if (v === UNIT) return '()';
    if (v instanceof ErrVal) return v.disp;
    if (v instanceof Struct || v instanceof Enum) { var u = V.userDisplay && V.userDisplay(v); if (u != null) return u; }
    throw new RL.RustError('E0277', '`' + V.typeName(v) + '` doesn\'t implement `std::fmt::Display`', 0, 0, { help: 'the trait `std::fmt::Display` is not implemented for `' + V.typeName(v) + '`; in format strings you may be able to use `{:?}` (or {:#?} for pretty-print) instead' });
  };
  function debug(v, pretty, ind) {
    v = v instanceof Ref ? v.get() : v;
    ind = ind || 0; var pad = pretty ? new Array(ind + 5).join(' ') : '', pad0 = pretty ? new Array(ind + 1).join(' ') : '';
    function seq(open, close, items) { if (!items.length) return open + close; return pretty ? open + '\n' + items.map(function (x) { return pad + x + ',\n'; }).join('') + pad0 + close : open + items.join(', ') + close; }
    if (v instanceof I) return v.v.toString();
    if (v instanceof Fl) return fmtFloat(v.v, null, true);
    if (typeof v === 'boolean') return String(v);
    if (v instanceof Ch) return "'" + (v.c === "'" ? "\\'" : v.c === '\n' ? '\\n' : v.c) + "'";
    if (typeof v === 'string') return '"' + escStr(v) + '"';
    if (v instanceof RS) return '"' + escStr(v.s) + '"';
    if (v === UNIT) return '()';
    if (v instanceof ErrVal) return v.dbg;
    if (Array.isArray(v)) return seq('[', ']', v.map(function (x) { return debug(x, pretty, ind + 4); }));
    if (v instanceof Tup) { var it = v.a.map(function (x) { return debug(x, pretty, ind + 4); }); if (v.a.length === 1 && !pretty) return '(' + it[0] + ',)'; return seq('(', ')', it); }
    if (v instanceof Bx) return debug(v.v, pretty, ind);
    if (v instanceof Rc) return debug(v.box.v, pretty, ind);
    if (v instanceof RefCell) return 'RefCell { value: ' + debug(v.v, pretty, ind) + ' }';
    if (v instanceof Range) return (v.lo ? debug(v.lo) : '') + (v.incl ? '..=' : '..') + (v.hi ? debug(v.hi) : '');
    if (v instanceof RMap) { var es = []; v.m.forEach(function (e) { es.push(debug(e[0], pretty, ind + 4) + ': ' + debug(e[1], pretty, ind + 4)); }); return seq('{', '}', es); }
    if (v instanceof RSet) { var ss = []; v.m.forEach(function (e) { ss.push(debug(e[0], pretty, ind + 4)); }); return seq('{', '}', ss); }
    if (v instanceof Struct || v instanceof Enum) {
      var ud = V.userDebug && V.userDebug(v); if (ud != null) return ud;
      var name, tup, fields;
      if (v instanceof Struct) { name = v.st; if (v.tuple) { tup = v.o.map(function (k) { return v.f[k]; }); } else fields = v.o.map(function (k) { return [k, v.f[k]]; }); }
      else { name = v.vn; if (v.names) fields = v.names.map(function (k, i) { return [k, v.v[i]]; }); else if (v.v.length) tup = v.v; }
      if (tup) return name + seq('(', ')', tup.map(function (x) { return debug(x, pretty, ind + 4); }));
      if (fields) { if (!fields.length) return name; var items = fields.map(function (f) { return f[0] + ': ' + debug(f[1], pretty, ind + 4); }); if (pretty) return name + ' {\n' + items.map(function (x) { return pad + x + ',\n'; }).join('') + pad0 + '}'; return name + ' { ' + items.join(', ') + ' }'; }
      return name;
    }
    return V.typeName(v);
  }
  V.debug = debug;
  // format spec application
  V.applySpec = function (v, spec) {
    var s;
    var ty = spec.ty;
    var dv = dr(v);
    if (ty === '?' || ty === '#?') s = debug(v, spec.alt || ty === '#?', 0);
    else if (ty === 'x' || ty === 'X' || ty === 'b' || ty === 'o' || ty === 'e') {
      if (!(dv instanceof I) && !(dv instanceof Fl)) throw new RL.RustError('E0277', 'the trait bound is not satisfied for `{:' + ty + '}`', 0, 0);
      var n = dv instanceof I ? dv.v : BigInt(Math.trunc(dv.v));
      if (n < 0n && dv.t && V.BOUNDS[dv.t]) n += 1n << BigInt(dv.t.replace(/\D/g, '') || 64);
      s = ty === 'x' ? n.toString(16) : ty === 'X' ? n.toString(16).toUpperCase() : ty === 'b' ? n.toString(2) : ty === 'o' ? n.toString(8) : String(dv.v);
      if (spec.alt) s = (ty === 'b' ? '0b' : ty === 'o' ? '0o' : '0x') + s;
    }
    else if (dv instanceof Fl) s = fmtFloat(dv.v, spec.prec, false);
    else if (dv instanceof I && spec.prec != null) s = dv.v.toString();
    else { s = V.display(v); if (spec.prec != null && V.str(dv) !== null && !(dv instanceof Ch)) s = s.slice(0, spec.prec); }
    if (spec.plus && (dv instanceof I || dv instanceof Fl) && s[0] !== '-') s = '+' + s;
    if (spec.width != null) {
      var w = spec.width, len = Array.from(s).length;
      if (len < w) {
        var fill = spec.fill || ' ', al = spec.align;
        var numeric = dv instanceof I || dv instanceof Fl;
        if (spec.zero && numeric) { var sign = /^[+-]/.test(s) ? s[0] : ''; var rest = sign ? s.slice(1) : s; s = sign + new Array(w - len + 1).join('0') + rest; }
        else {
          if (!al) al = numeric ? '>' : '<';
          var gap = w - len;
          if (al === '<') s = s + new Array(gap + 1).join(fill); else if (al === '>') s = new Array(gap + 1).join(fill) + s;
          else { var l = Math.floor(gap / 2); s = new Array(l + 1).join(fill) + s + new Array(gap - l + 1).join(fill); }
        }
      }
    }
    return s;
  };
})();

/* Rust Lab core, part 4: tree-walking interpreter with ownership tracking. */
(function () {
  var V = RL.V, RustError = RL.RustError;
  var I = V.I, Fl = V.Fl, Ch = V.Ch, RS = V.RS, Tup = V.Tup, Struct = V.Struct, Enum = V.Enum, Range = V.Range, Ref = V.Ref, Bx = V.Bx, Rc = V.Rc, RefCell = V.RefCell, RMap = V.RMap, RSet = V.RSet, It = V.It, Fn = V.Fn, UNIT = V.UNIT, dr = V.dr;
  function BreakEx(label, val) { this.label = label; this.val = val; }
  function ContEx(label) { this.label = label; }
  function RetEx(val) { this.val = val; }
  function Scope(parent) { this.vars = Object.create(null); this.parent = parent || null; this.owned = []; }
  Scope.prototype.find = function (n) { for (var s = this; s; s = s.parent) { var c = s.vars[n]; if (c) return c; } return null; };
  function Cell(name, v, mut, node) { this.name = name; this.v = v; this.mut = mut; this.moved = null; this.decl = node ? { line: node.line, col: node.col } : null; this.init = true; this.own = false; this.isRef = false; }
  function err(code, msg, node, extra) { throw new RustError(code, msg, node ? node.line : 0, node ? node.col : 0, extra); }
  RL.err = err;
  function typeStr(t) { if (!t) return '_'; switch (t.k) { case 'tref': return '&' + (t.mut ? 'mut ' : '') + typeStr(t.to); case 'ttuple': return '(' + t.items.map(typeStr).join(', ') + ')'; case 'tarray': return '[' + typeStr(t.el) + '; _]'; case 'tslice': return '[' + typeStr(t.el) + ']'; case 'tpath': return t.name === 'str' ? 'str' : t.name + (t.args && t.args.length ? '<' + t.args.map(typeStr).join(', ') + '>' : ''); case 'tdyn': return 'dyn ' + typeStr(t.of); } return '_'; }
  RL.typeStr = typeStr;

  RL.makeInterp = function (ast, opts) {
    opts = opts || {};
    var out = [], errOut = [], steps = 0, MAXSTEPS = opts.maxSteps || 4000000, trace = [];
    var fns = Object.create(null), structs = Object.create(null), enums = Object.create(null), impls = Object.create(null), traitImpls = Object.create(null), traits = Object.create(null), consts = Object.create(null);
    var globalScope = new Scope(null);
    var hasDrop = false, depth = 0;
    V.enumDefs = { Ordering: ['Less', 'Equal', 'Greater'] };
    V.derives = {};
    var NOMETH = RL.NOMETH = { nometh: 1 };
    var ST = { out: out, errOut: errOut, fns: fns, structs: structs, enums: enums, impls: impls, traitImpls: traitImpls, traits: traits, consts: consts, trace: trace };

    function tick(node) { if (++steps > MAXSTEPS) err('limit', 'the program ran for too long (is there an infinite loop?)', node); }
    // ---- registering items ----
    function register(items) {
      items.forEach(function (it) {
        switch (it.k) {
          case 'fn': fns[it.name] = it; break;
          case 'struct': structs[it.name] = it; V.derives[it.name] = it.derive; break;
          case 'enum': enums[it.name] = it; V.derives[it.name] = it.derive; V.enumDefs[it.name] = it.variants.map(function (v) { return v.name; }); break;
          case 'trait': traits[it.name] = it; break;
          case 'const': consts[it.name] = it; break;
          case 'mod': register(it.items); break;
        }
      });
      items.forEach(function (it) {
        if (it.k === 'impl') {
          var m = impls[it.ty] || (impls[it.ty] = {});
          it.items.forEach(function (f) {
            if (f.k === 'const') { m['const:' + f.name] = f; return; }
            m[f.name] = f;
            if (it.trait) { var ti = traitImpls[it.ty] || (traitImpls[it.ty] = {}); (ti[it.trait] || (ti[it.trait] = {}))[f.name] = f; }
          });
          if (it.trait === 'Drop') hasDrop = true;
          if (it.trait) { var d = V.derives[it.ty]; if (d) d.push('impl:' + it.trait); else V.derives[it.ty] = ['impl:' + it.trait]; }
        }
      });
      items.forEach(function (it) {
        if (it.k === 'impl' && it.trait && traits[it.trait]) {
          traits[it.trait].items.forEach(function (f) { if (f.body && !impls[it.ty][f.name]) { impls[it.ty][f.name] = f; (traitImpls[it.ty][it.trait])[f.name] = f; } });
        }
      });
    }
    ST.hasImpl = function (ty, trait) { return !!(traitImpls[ty] && traitImpls[ty][trait]); };
    V.userDisplay = function (v) { var tn = v instanceof Struct ? v.st : v.en; var ti = traitImpls[tn]; if (ti && ti.Display && ti.Display.fmt) return runFmt(ti.Display.fmt, v); return null; };
    V.userDebug = function (v) { var tn = v instanceof Struct ? v.st : v.en; var ti = traitImpls[tn]; if (ti && ti.Debug && ti.Debug.fmt) return runFmt(ti.Debug.fmt, v); return null; };
    function runFmt(def, v) { var f = { fmtr: true, buf: '' }; callUser(def, [f], v, null, def); return f.buf; }
    // ---- helpers ----
    function logT(kind, node, name, extra) { if (opts.trace !== false && trace.length < 400) trace.push({ kind: kind, line: node ? node.line : 0, name: name, info: extra || '' }); }
    function moveErr(cell, node, borrow) {
      var tn = V.typeName(cell.v);
      var labels = [];
      if (cell.decl) labels.push({ line: cell.decl.line, col: cell.decl.col, len: cell.name.length, text: 'move occurs because `' + cell.name + '` has type `' + tn + '`, which does not implement the `Copy` trait' });
      if (cell.moved.line === node.line && cell.moved.col === node.col) labels.push({ line: node.line, col: node.col, len: cell.name.length, primary: true, text: 'value moved here, in previous iteration of loop' });
      else {
        labels.push({ line: cell.moved.line, col: cell.moved.col, len: cell.name.length, text: cell.moved.partial ? 'value partially moved here' : cell.moved.why || 'value moved here' });
        labels.push({ line: node.line, col: node.col, len: cell.name.length, primary: true, text: borrow ? 'value borrowed here after move' : 'value used here after move' });
      }
      err('E0382', (borrow ? 'borrow' : 'use') + ' of ' + (cell.moved.partial ? 'partially ' : '') + 'moved value: `' + cell.name + '`', node, { labels: labels, help: 'consider cloning the value if the performance cost is acceptable: `' + cell.name + '.clone()`' });
    }
    function lookup(name, env, node, borrow) {
      var c = env.find(name);
      if (c) { if (c.moved) moveErr(c, node, borrow); if (!c.init) err('E0381', 'used binding `' + name + '` isn\'t initialized', node, { labels: [{ line: node.line, col: node.col, len: name.length, primary: true, text: '`' + name + '` used here but it isn\'t initialized' }] }); return c; }
      return null;
    }
    function isOwnedInit(n) {
      if (!n) return false;
      if (n.k === 'macro') return n.name === 'vec' || n.name === 'vec_repeat' || n.name === 'format';
      if (n.k === 'call' && n.f.k === 'path') { var s = n.f.segs; return (s[0] === 'String' || s[0] === 'Vec' || s[0] === 'Box' || s[0] === 'HashMap') && (s[1] === 'from' || s[1] === 'new' || s[1] === 'with_capacity'); }
      if (n.k === 'mcall') return n.name === 'to_string' || n.name === 'to_owned' || n.name === 'clone' && false;
      if (n.k === 'struct_lit') return true;
      return false;
    }
    // evaluating in move context
    function evalMove(n, env, why) {
      if (n.k === 'paren') return evalMove(n.e, env, why);
      if (n.k === 'path' && n.segs.length === 1) {
        var c = lookup(n.segs[0], env, n, false);
        if (c) {
          var v = c.v;
          if (v instanceof Ref && v.mut) { return v; }
          if (V.isCopy(v)) return V.copy(v);
          c.moved = { line: n.line, col: n.col, why: why || null };
          logT('move', n, c.name, V.typeName(v));
          return v;
        }
      }
      return ev(n, env);
    }
    function coerce(t, v, node, what) {
      if (!t) return v;
      var dv = v;
      if (t.k === 'tref') { return v; }
      if (t.k === 'tpath') {
        var nm = t.name;
        if (V.isIntT(nm)) {
          if (dv instanceof I) {
            var b = V.BOUNDS[nm];
            if (dv.t && dv.t !== nm) mismatch(nm, dv.t, node);
            if (dv.v < b[0] || dv.v > b[1]) { if (node && (node.k === 'int' || node.k === 'unary')) err('lint', 'literal out of range for `' + nm + '`', node, { help: 'the literal `' + dv.v + '` does not fit into the type `' + nm + '` whose range is `' + b[0] + '..=' + b[1] + '`' }); err('panic', 'attempt to convert value out of range', node); }
            return dv.t === nm ? dv : new I(dv.v, nm);
          }
          if (dv instanceof Fl) mismatch(nm, dv.t || '{float}', node);
          if (typeof dv === 'string' || dv instanceof RS) mismatch(nm, typeof dv === 'string' ? '&str' : 'String', node);
          if (typeof dv === 'boolean' || dv instanceof Ch) mismatch(nm, V.typeName(dv), node);
          return v;
        }
        if (nm === 'f64' || nm === 'f32') {
          if (dv instanceof Fl) { if (dv.t && dv.t !== nm) mismatch(nm, dv.t, node); return dv.t === nm ? dv : new Fl(dv.v, nm); }
          if (dv instanceof I) mismatch(nm, dv.t || '{integer}', node, 'use a float literal: `' + dv.v + '.0`');
          if (typeof dv === 'string' || dv instanceof RS || typeof dv === 'boolean') mismatch(nm, V.typeName(dv), node);
          return v;
        }
        if (nm === 'bool') { if (!(typeof dv === 'boolean') && (dv instanceof I || dv instanceof Fl || typeof dv === 'string' || dv instanceof RS)) mismatch('bool', V.typeName(dv), node); return v; }
        if (nm === 'String') { if (typeof dv === 'string') mismatch('String', '&str', node, 'try using a conversion method: `.to_string()`'); if (dv instanceof I || dv instanceof Fl || typeof dv === 'boolean') mismatch('String', V.typeName(dv), node); return v; }
        if (nm === 'char') { if (typeof dv === 'string' || dv instanceof RS) mismatch('char', V.typeName(dv), node); if (dv instanceof I) mismatch('char', V.typeName(dv), node); return v; }
        if (nm === 'Vec' && t.args.length === 1 && Array.isArray(dv)) { dv.forEach(function (e, i) { dv[i] = coerce(t.args[0], e, null); }); return v; }
        if (nm === 'Option' && dv instanceof Enum && dv.vn === 'Some' && t.args.length === 1) { dv.v[0] = coerce(t.args[0], dv.v[0], null); return v; }
        if ((structs[nm] || enums[nm]) && (dv instanceof I || dv instanceof Fl || typeof dv === 'string' || dv instanceof RS)) mismatch(nm, V.typeName(dv), node);
        return v;
      }
      if (t.k === 'ttuple' && dv instanceof Tup && dv.a.length === t.items.length) { dv.a = dv.a.map(function (x, i) { return coerce(t.items[i], x, null); }); return v; }
      if ((t.k === 'tarray' || t.k === 'tslice') && Array.isArray(dv)) { dv.forEach(function (e, i) { dv[i] = coerce(t.el, e, null); }); return v; }
      return v;
    }
    function mismatch(exp, found, node, help) {
      err('E0308', 'mismatched types', node, { labels: node ? [{ line: node.line, col: node.col, len: 1, primary: true, text: 'expected `' + exp + '`, found `' + found + '`' }] : [], help: help || null });
    }
    // ---- scopes & drops ----
    function bindCell(env, name, v, mut, node) { var c = new Cell(name, v, mut, node); env.vars[name] = c; env.owned.push(c); return c; }
    function dropValue(v, node, name) {
      if (v === null || v === undefined || typeof v !== 'object') return;
      if (v instanceof Struct) {
        if (v.dropped) return; v.dropped = true;
        var d = traitImpls[v.st] && traitImpls[v.st].Drop;
        if (d && d.drop) { logT('drop', node, name || v.st, v.st); callUser(d.drop, [], new Ref(function () { return v; }, function () { }, true), v.st, d.drop); }
        v.o.forEach(function (k) { dropValue(v.f[k]); });
      } else if (v instanceof Enum) { if (v.dropped) return; v.dropped = true; var d2 = traitImpls[v.en] && traitImpls[v.en].Drop; if (d2) { callUser(d2.drop, [], new Ref(function () { return v; }, function () { }, true), v.en, d2.drop); } v.v.forEach(function (x) { dropValue(x); }); }
      else if (Array.isArray(v)) v.forEach(function (x) { dropValue(x); });
      else if (v instanceof Tup) v.a.forEach(function (x) { dropValue(x); });
      else if (v instanceof Bx) dropValue(v.v);
      else if (v instanceof Rc) { if (!v.dead) { v.dead = true; v.box.n--; logT('drop', node, name || 'Rc', 'strong_count = ' + v.box.n); if (v.box.n === 0) dropValue(v.box.v); } }
      else if (v instanceof RefCell) dropValue(v.v);
      else if (v instanceof RMap) v.m.forEach(function (e) { dropValue(e[1]); });
    }
    function exitScope(sc) {
      if (!(hasDrop || ST.usesRc)) return;
      for (var i = sc.owned.length - 1; i >= 0; i--) { var c = sc.owned[i]; if (!c.moved && c.init && c.name !== '_' && !(c.v instanceof Ref)) dropValue(c.v, c.decl, c.name); }
    }
    ST.dropValue = dropValue;
    // ---- patterns ----
    function slotOf(get, set) { return new Ref(get, set, true); }
    function matchPat(p, v, env, viaMut, slot, declNode, mutBind) {
      if (v instanceof Ref) { viaMut = viaMut || v.mut; slot = v; v = v.get(); }
      while (v instanceof Bx && p.k !== 'pid' && p.k !== 'pwild') v = v.v;
      switch (p.k) {
        case 'pwild': return true;
        case 'pid': {
          var bv = (viaMut && slot) ? slot : v;
          if (!viaMut && slot && slot.mut === false) bv = v;
          var cell = bindCell(env, p.name, bv, p.mut, p); cell.decl = { line: p.line, col: p.col || declNode && declNode.col || 0 };
          if (declNode) cell.decl = { line: p.line, col: declNode.col };
          return true;
        }
        case 'pbind': { if (!matchPat(p.p, v, env, viaMut, slot)) return false; bindCell(env, p.name, v, false, p); return true; }
        case 'pref': return matchPat(p.p, v, env, false, null);
        case 'plit': { var lv = ev(p.e, env); return V.eq(v, lv); }
        case 'prange': { var lo = p.lo ? ev(p.lo, env) : null, hi = p.hi ? ev(p.hi, env) : null; if (lo && V.cmp(v, lo) < 0) return false; if (hi) { var c = V.cmp(v, hi); if (p.incl ? c > 0 : c >= 0) return false; } return true; }
        case 'por': { for (var i = 0; i < p.alts.length; i++) { if (matchPat(p.alts[i], v, env, viaMut, slot)) return true; } return false; }
        case 'ptuple': {
          var arr = v instanceof Tup ? v.a : Array.isArray(v) ? v : null; if (!arr) return false;
          if (arr.length !== p.items.length && !p.items.some(function (q) { return q.k === 'prest'; })) return false;
          for (var j = 0; j < p.items.length; j++) { (function (j) { var sl = viaMut ? slotOf(function () { return arr[j]; }, function (x) { arr[j] = x; }) : null; if (!matchPat(p.items[j], arr[j], env, viaMut, sl)) { j = -1; } if (j === -1) throw 0; })(j); }
          return true;
        }
        case 'pvar': return matchVar(p, v, env, viaMut, slot);
      }
      return false;
    }
    function matchVar(p, v, env, viaMut, slot) {
      var path = p.path, last = path[path.length - 1], first = path[0];
      var target = v;
      if (target instanceof Enum) {
        var en = path.length > 1 ? path[path.length - 2] : null;
        if (en === 'Self') en = null;
        if (path.length === 1 && (target.en === 'Option' || target.en === 'Result' || true)) {
          // bare variant name (Some/None/Ok/Err or imported variant)
          if (target.vn !== last) return false;
        } else {
          if (target.vn !== last) return false; if (en && target.en !== en && en !== 'Self' && V.enumDefs[en]) return false;
        }
        if (p.fields) { for (var i = 0; i < p.fields.length; i++) { var f = p.fields[i], idx = target.names ? target.names.indexOf(f.name) : -1; if (idx < 0) return false; if (!subMatch(f.p, target.v, idx, env, viaMut)) return false; } return true; }
        if (p.items) { if (p.items.length !== target.v.length) { var rest = p.items.some(function (q) { return q.k === 'prest'; }); if (!rest) return false; } for (var k = 0; k < p.items.length; k++) if (!subMatch(p.items[k], target.v, k, env, viaMut)) return false; return true; }
        return true;
      }
      if (target instanceof Struct) {
        if (target.st !== last && !(last === 'Self')) return false;
        if (p.fields) { for (var q = 0; q < p.fields.length; q++) { var fq = p.fields[q]; var host = target.f; var nm = fq.name; var sl = viaMut ? slotOf(function () { return host[nm]; }, function (x) { host[nm] = x; }) : null; if (!matchPat(fq.p, host[nm], env, viaMut, sl)) return false; } return true; }
        if (p.items) { for (var r = 0; r < p.items.length; r++) { if (!subMatch(p.items[r], target.o.map(function (kk) { return target.f[kk]; }), r, env, viaMut, target)) return false; } return true; }
        return true;
      }
      // unit-like constant pattern (e.g. a const)
      if (path.length === 1 && consts[last]) return V.eq(v, ev(consts[last].e, globalScope));
      return false;
    }
    function subMatch(pp, arr, i, env, viaMut, struct) {
      var sl = viaMut ? slotOf(function () { return arr[i]; }, function (x) { arr[i] = x; if (struct) struct.f[struct.o[i]] = x; }) : null;
      return matchPat(pp, arr[i], env, viaMut, sl);
    }
    // tuple pattern uses throw hack above; wrap
    var _mp = matchPat;
    matchPat = function (p, v, env, viaMut, slot, d) { try { return _mp(p, v, env, viaMut, slot, d); } catch (e) { if (e === 0) return false; throw e; } };

    // ---- places ----
    function getPlace(n, env, forMutBorrow) {
      if (n.k === 'paren') return getPlace(n.e, env);
      if (n.k === 'path' && n.segs.length === 1) {
        var c = env.find(n.segs[0]);
        if (!c) err('E0425', 'cannot find value `' + n.segs[0] + '` in this scope', n, { labels: [{ line: n.line, col: n.col, len: n.segs[0].length, primary: true, text: 'not found in this scope' }] });
        return { cell: c, get: function () { if (c.moved) moveErr(c, n, false); return c.v; }, set: function (x) { c.v = x; c.moved = null; } };
      }
      if (n.k === 'field') {
        var base = ev(n.e, env, true); var o = dr(base);
        if (!(o instanceof Struct)) err('E0609', 'no field `' + n.name + '` on type `' + V.typeName(base) + '`', n, {});
        if (!(n.name in o.f)) err('E0609', 'no field `' + n.name + '` on type `' + o.st + '`', n, { labels: [{ line: n.line, col: n.col, len: n.name.length, primary: true, text: 'unknown field' }], help: 'available fields are: ' + o.o.join(', ') });
        return { owner: n.e, struct: o, get: function () { return o.f[n.name]; }, set: function (x) { o.f[n.name] = x; } };
      }
      if (n.k === 'tfield') {
        var tb = dr(ev(n.e, env, true));
        if (tb instanceof Tup) return { get: function () { return tb.a[n.idx]; }, set: function (x) { tb.a[n.idx] = x; } };
        if (tb instanceof Struct) { var key = String(n.idx); return { get: function () { return tb.f[key]; }, set: function (x) { tb.f[key] = x; } }; }
        err('E0609', 'no field `' + n.idx + '` on type `' + V.typeName(tb) + '`', n);
      }
      if (n.k === 'index') {
        var cont = dr(ev(n.e, env, true)); var ix = ev(n.idx, env);
        if (cont instanceof RMap) { var kk = V.key(ix); return { get: function () { var e = cont.m.get(kk); if (!e) err('panic', 'key not found in map', n); return e[1]; }, set: function (x) { var e = cont.m.get(kk); e[1] = x; } }; }
        if (Array.isArray(cont)) { var i = idxOf(ix, cont.length, n); return { get: function () { return cont[i]; }, set: function (x) { cont[i] = x; } }; }
        err('E0608', 'cannot index into a value of type `' + V.typeName(cont) + '`', n);
      }
      if (n.k === 'deref') {
        var r = ev(n.e, env);
        if (r instanceof Ref) return { get: r.get, set: r.set, deref: true, mutRef: r.mut };
        if (r instanceof Bx) return { get: function () { return r.v; }, set: function (x) { r.v = x; } };
        if (r instanceof Rc) return { get: function () { return r.box.v; }, set: function () { err('E0594', 'cannot assign to data in an `Rc`', n); } };
        return { get: function () { return r; }, set: function () { err('E0594', 'cannot assign to a `&` reference', n, { labels: [{ line: n.line, col: n.col, len: 1, primary: true, text: '`&` reference, so the data it refers to cannot be written' }], help: 'consider changing this to be a mutable reference: `&mut`' }); }, deref: true, shared: true };
      }
      var tmp = ev(n, env);
      return { get: function () { return tmp; }, set: function (x) { tmp = x; } };
    }
    function idxOf(ix, len, n) {
      ix = dr(ix);
      if (!(ix instanceof I)) err('E0277', 'the type `[_]` cannot be indexed by `' + V.typeName(ix) + '`', n, { help: 'the trait `SliceIndex<[_]>` is not implemented for `' + V.typeName(ix) + '`; slice indices are of type `usize`' });
      if (ix.t && ix.t !== 'usize') err('E0277', 'the type `[_]` cannot be indexed by `' + ix.t + '`', n, { help: 'slice indices are of type `usize` (use `as usize`)' });
      var i = Number(ix.v);
      if (i < 0 || i >= len) err('panic', 'index out of bounds: the len is ' + len + ' but the index is ' + ix.v, n);
      return i;
    }
    ST.idxOf = idxOf;
    // root variable of a place expression
    function rootVar(n) { while (n) { if (n.k === 'path') return n.segs.length === 1 ? n.segs[0] : null; if (n.k === 'field' || n.k === 'tfield' || n.k === 'index' || n.k === 'paren') n = n.e; else return null; } return null; }
    function checkMutable(n, env, kind) {
      // n: place expression being mutated / mutably borrowed
      var root = rootVar(n); if (!root) return;
      var c = env.find(root); if (!c) return;
      var viaRef = c.v instanceof Ref; var m = n; var through = false;
      while (m && m.k !== 'path') { if (m.k === 'deref') return; m = m.e; }
      if (viaRef) { if (c.v.mut) return; if (c.isRef && !c.v.mut) { /* shared ref */ } }
      if (c.mut || c.init === false) return;
      if (c.isSharedRef) {
        err('E0596', 'cannot borrow `*' + root + '` as mutable, as it is behind a `&` reference', n, { labels: [{ line: n.line, col: n.col, len: root.length, primary: true, text: '`' + root + '` is a `&` reference, so the data it refers to cannot be borrowed as mutable' }], help: 'consider changing this to be a mutable reference: `&mut`' });
      }
      var fieldAssign = kind === 'assign' && n.k !== 'path';
      var code = fieldAssign ? 'E0594' : 'E0596';
      var txt = fieldAssign ? 'cannot assign to `' + srcOf(n) + '`, as `' + root + '` is not declared as mutable' : 'cannot borrow `' + root + '` as mutable, as it is not declared as mutable';
      err(code, txt, n, { labels: [{ line: n.line, col: n.col, len: root.length, primary: true, text: fieldAssign ? 'cannot assign' : 'cannot borrow as mutable' }, c.decl ? { line: c.decl.line, col: c.decl.col, len: root.length, text: 'help: consider changing this to be mutable: `mut ' + root + '`', help: true } : null].filter(Boolean) });
    }
    function srcOf(n) { if (n.k === 'path') return n.segs.join('::'); if (n.k === 'field') return srcOf(n.e) + '.' + n.name; if (n.k === 'tfield') return srcOf(n.e) + '.' + n.idx; if (n.k === 'index') return srcOf(n.e) + '[..]'; if (n.k === 'paren') return srcOf(n.e); return '_'; }
    ST.checkMutable = checkMutable; ST.srcOf = srcOf;
    // ---- arithmetic ----
    var OPNAME = { '+': ['add', 'add `B` to `A`'], '-': ['sub', 'subtract `B` from `A`'], '*': ['mul', 'multiply `A` by `B`'], '/': ['div', 'divide `A` by `B`'], '%': ['rem', 'calculate the remainder of `A` divided by `B`'] };
    var OVF = { '+': 'add', '-': 'subtract', '*': 'multiply' };
    function arith(op, a, b, node) {
      a = dr(a); b = dr(b);
      if (a instanceof I && b instanceof I) {
        var t = a.t || b.t;
        if (a.t && b.t && a.t !== b.t) mismatchOp(a, b, node);
        var x = a.v, y = b.v, r;
        switch (op) {
          case '+': r = x + y; break; case '-': r = x - y; break; case '*': r = x * y; break;
          case '/': if (y === 0n) err('panic', 'attempt to divide by zero', node); r = x / y; break;
          case '%': if (y === 0n) err('panic', 'attempt to calculate the remainder with a divisor of zero', node); r = x % y; break;
          case '&': r = x & y; break; case '|': r = x | y; break; case '^': r = x ^ y; break;
          case '<<': r = x << y; if (t && V.BOUNDS[t]) { var bits = BigInt(t.replace(/\D/g, '') || 64); r = BigInt.asUintN(Number(bits), r); if (V.BOUNDS[t][0] < 0n) r = BigInt.asIntN(Number(bits), r); } break;
          case '>>': r = x >> y; break;
        }
        var bd = V.BOUNDS[t || 'i64'];
        if (r < bd[0] || r > bd[1]) err('panic', 'attempt to ' + (OVF[op] || 'compute') + ' with overflow', node);
        return new I(r, t);
      }
      if (a instanceof Fl && b instanceof Fl) {
        if (a.t && b.t && a.t !== b.t) mismatchOp(a, b, node);
        var u = a.t || b.t, z;
        switch (op) { case '+': z = a.v + b.v; break; case '-': z = a.v - b.v; break; case '*': z = a.v * b.v; break; case '/': z = a.v / b.v; break; case '%': z = a.v % b.v; break; default: err('E0369', 'no implementation for `f64 ' + op + ' f64`', node); }
        if (u === 'f32') z = Math.fround(z);
        return new Fl(z, u);
      }
      if ((a instanceof Fl && b instanceof I) || (a instanceof I && b instanceof Fl)) {
        var ta = V.typeName(a), tb = V.typeName(b); if (a instanceof I && !a.t) ta = '{integer}'; if (b instanceof I && !b.t) tb = '{integer}'; if (a instanceof Fl && !a.t) ta = '{float}'; if (b instanceof Fl && !b.t) tb = '{float}';
        var nm = OPNAME[op] ? OPNAME[op][1].replace('A', ta).replace('B', tb) : op;
        err('E0277', 'cannot ' + nm, node, { labels: [{ line: node.line, col: node.col, len: 1, primary: true, text: 'no implementation for `' + ta + ' ' + op + ' ' + tb + '`' }], help: 'the trait `' + (OPNAME[op] ? OPNAME[op][0].replace(/^./, function (c) { return c.toUpperCase(); }) : 'Op') + '<' + tb + '>` is not implemented for `' + ta + '`' });
      }
      if (typeof a === 'boolean' && typeof b === 'boolean') { if (op === '&') return a && b; if (op === '|') return a || b; if (op === '^') return a !== b; }
      if (a instanceof RS && op === '+') { var sb = V.str(b); if (sb === null || b instanceof Ch) err('E0308', 'mismatched types', node, { labels: [{ line: node.line, col: node.col, len: 1, primary: true, text: 'expected `&str`, found `' + V.typeName(b) + '`' }] }); return new RS(a.s + sb); }
      if (typeof a === 'string' && op === '+') err('E0369', 'cannot add `' + (typeof b === 'string' ? '&str' : V.typeName(b)) + '` to `&str`', node, { labels: [{ line: node.line, col: node.col, len: 1, primary: true, text: 'cannot add' }], help: 'create an owned `String` from a string reference: `.to_owned()` or `String::from(...)`' });
      // operator overloading
      var tn = a instanceof Struct ? a.st : a instanceof Enum ? a.en : null;
      if (tn && OPNAME[op] && impls[tn] && impls[tn][OPNAME[op][0]]) return callUser(impls[tn][OPNAME[op][0]], [b], a, tn, node);
      err('E0369', 'cannot apply binary operator `' + op + '` to type `' + V.typeName(a) + '`', node, { labels: [{ line: node.line, col: node.col, len: 1, primary: true, text: '' }] });
    }
    function mismatchOp(a, b, node) { err('E0308', 'mismatched types', node, { labels: [{ line: node.line, col: node.col, len: 1, primary: true, text: 'expected `' + (a.t) + '`, found `' + (b.t) + '`' }], help: 'you can convert a `' + b.t + '` to `' + a.t + '` with `as` or `.into()`' }); }
    function needEq(a, b, op, node) {
      var x = dr(a), y = dr(b);
      if ((x instanceof I && y instanceof Fl) || (x instanceof Fl && y instanceof I)) mismatch(V.typeName(x), V.typeName(y), node);
      if (x instanceof I && y instanceof I && x.t && y.t && x.t !== y.t) mismatchOp(x, y, node);
      var tn = x instanceof Struct ? x.st : x instanceof Enum && x.en !== 'Option' && x.en !== 'Result' ? x.en : null;
      if (tn) { var ds = V.derives[tn] || []; if (ds.indexOf('PartialEq') < 0 && ds.indexOf('impl:PartialEq') < 0) err('E0369', 'binary operation `' + op + '` cannot be applied to type `' + tn + '`', node, { labels: [{ line: node.line, col: node.col, len: 1, primary: true, text: '' }], help: 'the trait `PartialEq` is not implemented for `' + tn + '`; consider annotating `' + tn + '` with `#[derive(PartialEq)]`' }); }
    }
    function binop(n, env) {
      var op = n.op;
      if (op === '&&') { var l = ev(n.l, env); if (!dr(l)) return false; return dr(ev(n.r, env)); }
      if (op === '||') { var l2 = ev(n.l, env); if (dr(l2)) return true; return dr(ev(n.r, env)); }
      var a = ev(n.l, env, true), b = ev(n.r, env, true);
      switch (op) {
        case '==': needEq(a, b, op, n); { var ux = userEq(a, b); return ux !== null ? ux : V.eq(a, b); }
        case '!=': needEq(a, b, op, n); { var uy = userEq(a, b); return uy !== null ? !uy : !V.eq(a, b); }
        case '<': case '>': case '<=': case '>=': {
          var x = dr(a), y = dr(b);
          needEq(x, y, op, n);
          var c = V.cmp(x, y); if (x instanceof Fl && (isNaN(x.v) || isNaN(y.v))) return false;
          return op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0;
        }
      }
      return arith(op, a, b, n);
    }
    function userEq(a, b) { a = dr(a); var tn = a instanceof Struct ? a.st : a instanceof Enum ? a.en : null; if (tn && traitImpls[tn] && traitImpls[tn].PartialEq && traitImpls[tn].PartialEq.eq) return !!dr(callUser(traitImpls[tn].PartialEq.eq, [b], a, tn, null)); return null; }
    function cast(v, ty, node) {
      v = dr(v); var nm = ty.name;
      if (V.isIntT(nm)) {
        var n;
        if (v instanceof I) n = v.v; else if (v instanceof Fl) { var f = v.v; if (isNaN(f)) n = 0n; else { f = Math.trunc(f); var bd = V.BOUNDS[nm]; if (f <= Number(bd[0])) n = bd[0]; else if (f >= Number(bd[1])) n = bd[1]; else n = BigInt(f); } return new I(n, nm); }
        else if (typeof v === 'boolean') n = v ? 1n : 0n; else if (v instanceof Ch) n = BigInt(v.c.codePointAt(0));
        else if (v instanceof Enum && (V.enumDefs[v.en])) n = BigInt(V.enumDefs[v.en].indexOf(v.vn));
        else err('E0605', 'non-primitive cast: `' + V.typeName(v) + '` as `' + nm + '`', node);
        var bits = Number(nm.replace(/\D/g, '') || 64), b2 = V.BOUNDS[nm];
        n = b2[0] < 0n ? BigInt.asIntN(bits, n) : BigInt.asUintN(bits, n);
        return new I(n, nm);
      }
      if (nm === 'f64' || nm === 'f32') { if (v instanceof I) return new Fl(Number(v.v), nm); if (v instanceof Fl) return new Fl(nm === 'f32' ? Math.fround(v.v) : v.v, nm); err('E0606', 'casting `' + V.typeName(v) + '` as `' + nm + '` is invalid', node); }
      if (nm === 'char') { if (v instanceof I) { if (v.t !== 'u8' && v.t) err('E0604', 'only `u8` can be cast as `char`, not `' + v.t + '`', node); return new Ch(String.fromCodePoint(Number(v.v))); } if (v instanceof Ch) return v; err('E0604', 'only `u8` can be cast as `char`', node); }
      if (nm === 'bool') err('E0054', 'cannot cast `' + V.typeName(v) + '` as `bool`', node);
      return v;
    }
    // ---- format ----
    var fmtCache = Object.create(null);
    function parseFmt(s, node) {
      if (fmtCache[s]) return fmtCache[s];
      var segs = [], lit = '', i = 0;
      while (i < s.length) {
        var c = s[i];
        if (c === '{') {
          if (s[i + 1] === '{') { lit += '{'; i += 2; continue; }
          var j = s.indexOf('}', i); if (j < 0) err('error', 'invalid format string: expected `}` but string was terminated', node);
          if (lit) { segs.push({ lit: lit }); lit = ''; }
          var body = s.slice(i + 1, j), arg = body, spec = '', ci = body.indexOf(':');
          if (ci >= 0) { arg = body.slice(0, ci); spec = body.slice(ci + 1); }
          segs.push({ arg: arg.trim(), spec: parseSpec(spec) }); i = j + 1; continue;
        }
        if (c === '}') { if (s[i + 1] === '}') { lit += '}'; i += 2; continue; } err('error', 'invalid format string: unmatched `}` found', node); }
        lit += c; i++;
      }
      if (lit) segs.push({ lit: lit });
      return (fmtCache[s] = segs);
    }
    function parseSpec(s) {
      var o = { ty: '' }; if (!s) return o;
      var m = /^(?:(.)?([<^>]))?(\+)?(#)?(0)?(\d+\$?|[A-Za-z_]\w*\$)?(?:\.(\d+\$?|\*|[A-Za-z_]\w*\$))?(\??|x|X|b|o|e)?$/.exec(s);
      if (!m) { return o; }
      if (m[2]) { o.align = m[2]; o.fill = m[1] || ' '; }
      if (m[3]) o.plus = true; if (m[4]) o.alt = true; if (m[5]) o.zero = true;
      if (m[6]) o.widthArg = m[6]; if (m[7]) o.precArg = m[7]; o.ty = m[8] || '';
      if (o.alt && o.ty === '?') o.ty = '#?';
      return o;
    }
    function formatStr(fs, args, env, node) {
      var segs = parseFmt(fs, node), res = '', pos = 0, named = {}, posArgs = [];
      args.forEach(function (a) { if (a.k === 'assign' && a.op === '=' && a.l.k === 'path') named[a.l.segs[0]] = a.r; else posArgs.push(a); });
      var cache = {};
      function argVal(key, nodeFor) {
        if (cache[key] !== undefined) return cache[key];
        var v;
        if (/^\d+$/.test(key)) { var a = posArgs[+key]; if (!a) err('error', 'invalid reference to positional argument ' + key, node); v = ev(a, env, true); }
        else if (named[key]) v = ev(named[key], env, true);
        else { var c = lookup(key, env, node, true); if (!c) { if (consts[key]) v = ev(consts[key].e, globalScope); else err('error', 'cannot find value `' + key + '` in this scope', node); } else v = c.v; }
        return (cache[key] = v);
      }
      var used = 0;
      segs.forEach(function (sg) {
        if (sg.lit !== undefined) { res += sg.lit; return; }
        var key = sg.arg, v;
        var spec = sg.spec, sp = {};
        for (var k0 in spec) sp[k0] = spec[k0];
        if (sp.precArg === '*') { var pv = ev(posArgs[pos++], env, true); sp.prec = Number(dr(pv).v); } else if (sp.precArg) { sp.prec = /\$$/.test(sp.precArg) ? Number(dr(argVal(sp.precArg.slice(0, -1))).v) : +sp.precArg; }
        if (sp.widthArg) { sp.width = /\$$/.test(sp.widthArg) ? Number(dr(argVal(sp.widthArg.slice(0, -1))).v) : +sp.widthArg; }
        if (key === '') { if (pos >= posArgs.length) err('error', 'format string references more arguments than were supplied', node, { help: 'the format string has more `{}` placeholders than arguments' }); v = ev(posArgs[pos], env, true); used = Math.max(used, ++pos); }
        else v = argVal(key);
        try { res += V.applySpec(v, sp); } catch (e) { if (e instanceof RustError && !e.line) { e.line = node.line; e.col = node.col; } throw e; }
      });
      if (pos < posArgs.length && !segs.some(function (s) { return s.arg && /^\d+$/.test(s.arg); })) err('error', 'argument never used', node, { help: 'there are more arguments than `{}` placeholders in the format string' });
      return res;
    }
    ST.formatStr = formatStr;
    // ---- calls ----
    function callUser(def, args, selfVal, tyName, node) {
      if (!def.body) err('error', 'function `' + def.name + '` has no body', node);
      tick(node);
      if (++depth > 400) { depth = 0; err('panic', 'stack overflow: thread \'main\' has overflowed its stack', node, { fatal: 'stack overflow' }); }
      if (args.length !== def.params.length) { depth--; err('E0061', 'this function takes ' + def.params.length + ' argument' + (def.params.length === 1 ? '' : 's') + ' but ' + args.length + ' argument' + (args.length === 1 ? ' was' : 's were') + ' supplied', node, { labels: [{ line: node.line, col: node.col, len: def.name.length, primary: true, text: 'expected ' + def.params.length + ' argument' + (def.params.length === 1 ? '' : 's') + ', found ' + args.length }] }); }
      var sc = new Scope(globalScope);
      try {
        if (def.selfKind) { var sc0 = bindCell(sc, 'self', selfVal, def.selfKind === 'mut' || def.selfKind === 'val', def); sc0.isSharedRef = def.selfKind === 'ref'; sc0.selfTy = tyName; }
        def.params.forEach(function (p, i) {
          var a = args[i];
          var pt = p.ty;
          var cv = pt.k === 'tref' ? a : coerce(pt, a, node);
          if (!matchPat(p.pat, cv, sc, false, null, p.pat)) err('E0005', 'refutable pattern in function argument', node);
          if (p.pat.k === 'pid') { var cc = sc.vars[p.pat.name]; if (pt.k === 'tref') { cc.isRef = true; cc.isSharedRef = !pt.mut; } cc.decl = { line: p.pat.line, col: p.pat.col }; }
        });
        var rv = UNIT;
        try { rv = evalBlock(def.body, sc, true); } catch (e) { if (e instanceof RetEx) rv = e.val; else throw e; }
        if (def.ret) { var rt = def.ret; if (rt.k !== 'tref') rv = coerceRet(rt, rv, def); }
        else if (rv !== UNIT && def.name !== 'main' && !(rv instanceof Ref)) { if (!(rv instanceof Enum && false)) err('E0308', 'mismatched types', def.body.tail || def.body, { labels: [{ line: (def.body.tail || def.body).line, col: (def.body.tail || def.body).col, len: 1, primary: true, text: 'expected `()`, found `' + V.typeName(rv) + '`' }], help: 'try adding a return type: `-> ' + V.typeName(rv) + '`' }); }
        return rv;
      } finally { depth--; exitScope(sc); }
    }
    function coerceRet(rt, rv, def) {
      var node = def.body.tail || def.body;
      if (rv === UNIT && rt.k === 'tpath' && rt.name !== '()' && rt.name !== 'Result' && rt.name !== 'Option' && rt.name !== 'Self') err('E0308', 'mismatched types', def, { labels: [{ line: def.line, col: def.col, len: 2, primary: true, text: 'implicitly returns `()` as its body has no tail or `return` expression' }], help: 'expected `' + typeStr(rt) + '`, found `()`' });
      return coerce(rt, rv, node);
    }
    ST.callUser = callUser;
    function callValue(f, args, node) {
      f = dr(f);
      if (f instanceof Fn) return f.f(args, node);
      err('E0618', 'expected function, found `' + V.typeName(f) + '`', node);
    }
    ST.callValue = callValue;
    function checkArgTypes(def, args, argNodes, env, node) {
      // syntactic borrow-vs-owned mismatch checks, mirrors common rustc E0308 cases
      def.params.forEach(function (p, i) {
        var an = argNodes[i]; if (!an) return; var pt = p.ty;
        var cn = an; while (cn.k === 'paren') cn = cn.e;
        if (pt.k === 'tref' && cn.k === 'path' && cn.segs.length === 1) {
          var c = env.find(cn.segs[0]);
          if (c && c.own && !c.isRef && !(c.v instanceof Ref) && !V.isCopy(c.v)) {
            err('E0308', 'mismatched types', cn, { labels: [{ line: cn.line, col: cn.col, len: cn.segs[0].length, primary: true, text: 'expected `' + typeStr(pt) + '`, found `' + V.typeName(c.v) + '`' }], help: 'consider borrowing here: `&' + (pt.mut ? 'mut ' : '') + cn.segs[0] + '`' });
          }
        }
        if (pt.k === 'tref' && pt.mut && cn.k === 'ref' && !cn.mut) err('E0308', 'mismatched types', cn, { labels: [{ line: cn.line, col: cn.col, len: 1, primary: true, text: 'types differ in mutability' }], help: 'expected mutable reference `' + typeStr(pt) + '`, found shared reference; try `&mut`' });
        if (pt.k === 'tpath' && cn.k === 'ref' && (pt.name === 'String' || pt.name === 'Vec' || V.isIntT(pt.name) || pt.name === 'f64' || structs[pt.name] || enums[pt.name])) err('E0308', 'mismatched types', cn, { labels: [{ line: cn.line, col: cn.col, len: 1, primary: true, text: 'expected `' + typeStr(pt) + '`, found reference' }], help: 'consider removing the borrow' });
      });
    }
    function evalArgs(argNodes, env) { return argNodes.map(function (a) { return evalMove(a, env, 'value moved here'); }); }
    function findMethod(recv, name) {
      var r = dr(recv); var tn = r instanceof Struct ? r.st : r instanceof Enum ? r.en : r instanceof I ? (r.t || 'i32') : r instanceof Fl ? (r.t || 'f64') : typeof r === 'string' || r instanceof RS ? 'String' : Array.isArray(r) ? 'Vec' : typeof r === 'boolean' ? 'bool' : null;
      if (tn && impls[tn] && impls[tn][name]) return { def: impls[tn][name], ty: tn };
      if (r instanceof I && impls['i32'] && impls['i32'][name]) return { def: impls['i32'][name], ty: 'i32' };
      if (typeof r === 'string' && impls['str'] && impls['str'][name]) return { def: impls['str'][name], ty: 'str' };
      return null;
    }
    ST.findMethod = findMethod;
    function methodCall(n, env) {
      var recvNode = n.recv; var name = n.name;
      // receivers evaluate as a borrow (no move) unless the method takes self by value
      var recv = ev(recvNode, env, true);
      var found = findMethod(recv, name);
      if (found) {
        var def = found.def;
        if (!def.selfKind) err('E0599', 'no method named `' + name + '` found (it is an associated function, not a method)', n, { help: 'use the associated function syntax: `' + found.ty + '::' + name + '(...)`' });
        var args = evalArgs(n.args, env);
        checkArgTypes(def, args, n.args, env, n);
        var selfV;
        if (def.selfKind === 'mut') {
          checkMutable(recvNode, env, 'borrow');
          selfV = recv instanceof Ref ? recv : mkPlaceRef(recvNode, env, recv);
        } else if (def.selfKind === 'val') {
          var cn = recvNode; while (cn.k === 'paren') cn = cn.e;
          if (cn.k === 'path' && cn.segs.length === 1) { var cc = env.find(cn.segs[0]); if (cc && !(cc.v instanceof Ref) && !V.isCopy(cc.v)) { cc.moved = { line: cn.line, col: cn.col, why: '`' + cn.segs[0] + '` moved due to this method call' }; logT('move', n, cc.name, V.typeName(cc.v)); } }
          selfV = dr(recv);
        } else selfV = recv;
        return callUser(def, args, selfV, found.ty, n);
      }
      // builtin
      var r = RL.builtinMethod(ST, recv, name, n, env);
      if (r !== NOMETH) return r;
      var tn = V.typeName(dr(recv));
      err('E0599', 'no method named `' + name + '` found for ' + (dr(recv) instanceof Struct || dr(recv) instanceof Enum ? (dr(recv) instanceof Struct ? 'struct' : 'enum') : 'type') + ' `' + tn + '` in the current scope', n, { labels: [{ line: n.line, col: n.col, len: name.length, primary: true, text: 'method not found in `' + tn + '`' }] });
    }
    function mkPlaceRef(node, env, cur) {
      var pl;
      try { pl = getPlace(node, env); } catch (e) { return cur; }
      return new Ref(pl.get, pl.set, true);
    }
    ST.mkPlaceRef = mkPlaceRef; ST.getPlace = getPlace;
    // ---- statements & blocks ----
    function evalBlock(b, env, sameScope) {
      var sc = sameScope ? env : new Scope(env);
      try {
        for (var i = 0; i < b.stmts.length; i++) execStmt(b.stmts[i], sc);
        if (b.tail) return evalMove(b.tail, sc, 'value moved here');
        return UNIT;
      } finally { if (!sameScope) exitScope(sc); }
    }
    function execStmt(s, env) {
      tick(s);
      switch (s.k) {
        case 'let': return execLet(s, env);
        case 'exprstmt': {
          var v = ev(s.e, env);
          if (hasDrop && s.semi && v !== UNIT && s.e.k !== 'path' && (v instanceof Struct || v instanceof Enum)) dropValue(v, s);
          return;
        }
        case 'fn': fns[s.name] = s; return;
        case 'struct': case 'enum': case 'trait': case 'const': case 'impl': case 'use': case 'mod': register([s]); return;
      }
    }
    function execLet(s, env) {
      if (!s.init) { // deferred init
        if (s.pat.k === 'pid') { var c = bindCell(env, s.pat.name, null, s.pat.mut, s.pat); c.init = false; c.deferredMut = s.pat.mut; }
        return;
      }
      var v;
      var hint = s.ty;
      v = hint && hint.k === 'tref' ? ev(s.init, env) : evalMove(s.init, env, 'value moved here');
      if (hint) v = coerce(hint, v, s.init.k === 'int' || s.init.k === 'float' || s.init.k === 'str' || s.init.k === 'bool' || s.init.k === 'char' ? s.init : s.init);
      if (hint && hint.k === 'tpath' && /^f(32|64)$/.test(hint.name) && v instanceof I) v = new Fl(Number(v.v), hint.name);
      if (s.els) {
        var sc2 = new Scope(env); if (!matchPat(s.pat, v, sc2, false, null)) { evalBlock(s.els, env); err('E0308', 'let...else block must diverge', s); }
        for (var k in sc2.vars) { env.vars[k] = sc2.vars[k]; env.owned.push(sc2.vars[k]); } return;
      }
      if (s.pat.k === 'pwild') { if (hasDrop && s.init.k !== 'path') dropValue(v, s); return; }
      if (!matchPat(s.pat, v, env, false, null, s.pat)) err('E0005', 'refutable pattern in local binding', s, { help: 'use `let ... else` or `if let` to handle the case where the pattern does not match' });
      if (s.pat.k === 'pid') {
        var cell = env.vars[s.pat.name];
        cell.own = isOwnedInit(s.init) && !(hint && hint.k === 'tref');
        var ini = s.init; while (ini.k === 'paren') ini = ini.e;
        cell.isRef = ini.k === 'ref' || (hint && hint.k === 'tref');
        cell.isSharedRef = ini.k === 'ref' && !ini.mut;
        if (ini.k === 'ref' && ini.mut) cell.isMutRef = true;
        cell.decl = { line: s.pat.line, col: s.pat.col };
      }
    }
    // ---- main evaluator ----
    function ev(n, env, borrow) {
      switch (n.k) {
        case 'int': { var t = n.suf || null; var bi = BigInt(n.v); if (t && V.BOUNDS[t] && (bi > V.BOUNDS[t][1])) err('lint', 'literal out of range for `' + t + '`', n); if (t === 'f32' || t === 'f64') return new Fl(Number(n.v), t); return new I(bi, t); }
        case 'float': return new Fl(n.v, n.suf || null);
        case 'str': return n.v;
        case 'char': return new Ch(n.v);
        case 'bool': return n.v;
        case 'unit': return UNIT;
        case 'paren': return ev(n.e, env, borrow);
        case 'path': return evalPath(n, env, borrow);
        case 'block': {
          var lb = n.label;
          try { return evalBlock(n, env, false); } catch (e) { if (lb && e instanceof BreakEx && e.label === lb) return e.val; throw e; }
        }
        case 'unary': {
          var x = ev(n.e, env, true); x = dr(x);
          if (n.op === '-') { if (x instanceof I) { if (x.t && V.BOUNDS[x.t][0] === 0n) err('E0600', 'cannot apply unary operator `-` to type `' + x.t + '`', n, { help: 'unsigned values cannot be negated' }); var nv = -x.v; if (x.t && nv < V.BOUNDS[x.t][0]) err('panic', 'attempt to negate with overflow', n); return new I(nv, x.t); } if (x instanceof Fl) return new Fl(-x.v, x.t); var tnn = x instanceof Struct ? x.st : null; if (tnn && impls[tnn] && impls[tnn].neg) return callUser(impls[tnn].neg, [], x, tnn, n); err('E0600', 'cannot apply unary operator `-` to type `' + V.typeName(x) + '`', n); }
          if (n.op === '!') { if (typeof x === 'boolean') return !x; if (x instanceof I) { var bb = x.t ? V.BOUNDS[x.t] : [-(1n << 63n), 0n]; return new I(bb[0] < 0n ? ~x.v : bb[1] - x.v, x.t); } err('E0600', 'cannot apply unary operator `!` to type `' + V.typeName(x) + '`', n); }
          break;
        }
        case 'bin': return binop(n, env);
        case 'cast': return cast(ev(n.e, env, true), n.ty, n);
        case 'assign': return execAssign(n, env);
        case 'ref': {
          if (n.mut) {
            var inner = n.e; while (inner.k === 'paren') inner = inner.e;
            checkMutable(inner, env, 'borrow');
            if (inner.k === 'path' || inner.k === 'field' || inner.k === 'tfield' || inner.k === 'index' || inner.k === 'deref') {
              var cur = ev(inner, env, true);
              if (cur instanceof Ref && cur.mut) return cur;
              var pl = getPlace(inner, env);
              logT('borrow', n, srcOf(inner), '&mut');
              return new Ref(pl.get, pl.set, true);
            }
            var tmp = ev(n.e, env); return new Ref(function () { return tmp; }, function (x) { tmp = x; }, true);
          }
          var iv = ev(n.e, env, true);
          if (opts.trace !== false && n.e.k === 'path') logT('borrow', n, n.e.segs[0], '&');
          return iv;
        }
        case 'deref': { var r = ev(n.e, env, true); if (r instanceof Ref) return r.get(); if (r instanceof Bx) return r.v; if (r instanceof Rc) return r.box.v; return r; }
        case 'tuple': return new Tup(n.items.map(function (e) { return evalMove(e, env); }));
        case 'array': return n.items.map(function (e) { return evalMove(e, env); });
        case 'repeat': { var el = ev(n.e, env); var cnt = Number(dr(ev(n.n, env)).v); var arr = []; for (var i = 0; i < cnt; i++) arr.push(V.clone(el)); return arr; }
        case 'range': { var lo = n.lo ? dr(ev(n.lo, env)) : null, hi = n.hi ? dr(ev(n.hi, env)) : null; if (lo && hi && lo instanceof I && hi instanceof I && lo.t && hi.t && lo.t !== hi.t) mismatchOp(lo, hi, n); return new Range(lo, hi, n.incl); }
        case 'field': {
          var base = ev(n.e, env, true); var o = dr(base);
          if (o instanceof Struct) {
            if (!(n.name in o.f)) err('E0609', 'no field `' + n.name + '` on type `' + o.st + '`', n, { labels: [{ line: n.line, col: n.col, len: n.name.length, primary: true, text: 'unknown field' }], help: 'available fields are: ' + o.o.join(', ') });
            return o.f[n.name];
          }
          err('E0609', 'no field `' + n.name + '` on type `' + V.typeName(o) + '`', n);
          break;
        }
        case 'tfield': { var tb = dr(ev(n.e, env, true)); if (tb instanceof Tup) { if (n.idx >= tb.a.length) err('E0609', 'no field `' + n.idx + '` on type `' + V.typeName(tb) + '`', n); return tb.a[n.idx]; } if (tb instanceof Struct) return tb.f[String(n.idx)]; err('E0609', 'no field `' + n.idx + '` on type `' + V.typeName(tb) + '`', n); break; }
        case 'index': return evalIndex(n, env);
        case 'call': return evalCall(n, env);
        case 'mcall': return methodCall(n, env);
        case 'struct_lit': return evalStructLit(n, env);
        case 'if': {
          var sc = new Scope(env);
          try {
            if (evalCond(n.cond, sc)) return evalBlock(n.then, sc, false);
          } finally { exitScope(sc); }
          if (n.els) return n.els.k === 'if' ? ev(n.els, env) : evalBlock(n.els, env, false);
          return UNIT;
        }
        case 'match': return evalMatch(n, env);
        case 'while': {
          for (;;) {
            var wsc = new Scope(env);
            try {
              tick(n);
              if (!evalCond(n.cond, wsc)) break;
              try { evalBlock(n.body, wsc, false); }
              catch (e) { if (e instanceof BreakEx && (!e.label || e.label === n.label)) break; if (e instanceof ContEx && (!e.label || e.label === n.label)) continue; throw e; }
            } finally { exitScope(wsc); }
          }
          return UNIT;
        }
        case 'loop': {
          for (;;) {
            tick(n);
            try { evalBlock(n.body, env, false); }
            catch (e) { if (e instanceof BreakEx && (!e.label || e.label === n.label)) return e.val === undefined ? UNIT : e.val; if (e instanceof ContEx && (!e.label || e.label === n.label)) continue; throw e; }
          }
        }
        case 'for': return evalFor(n, env);
        case 'break': throw new BreakEx(n.label, n.e ? evalMove(n.e, env) : undefined);
        case 'continue': throw new ContEx(n.label);
        case 'return': throw new RetEx(n.e ? evalMove(n.e, env) : UNIT);
        case 'try': {
          var tv = dr(ev(n.e, env));
          if (tv instanceof Enum && tv.en === 'Option') { if (tv.vn === 'Some') return tv.v[0]; throw new RetEx(tv); }
          if (tv instanceof Enum && tv.en === 'Result') { if (tv.vn === 'Ok') return tv.v[0]; var ev0 = tv.v[0]; throw new RetEx(V.mkErr(convertErr(ev0, env))); }
          err('E0277', 'the `?` operator can only be applied to values that implement `Try`', n, { help: 'the trait `Try` is not implemented for `' + V.typeName(tv) + '`' });
          break;
        }
        case 'closure': return makeClosure(n, env);
        case 'macro': return evalMacro(n, env);
        case 'letcond': return evalCond(n, env);
      }
      err('error', 'unsupported expression `' + n.k + '`', n);
    }
    ST.ev = ev;
    function convertErr(e, env) {
      // From conversion: String errors into Box<dyn Error> are left as-is
      return e;
    }
    function evalCond(c, env) {
      if (c.k === 'letcond') {
        var cn = c.e; while (cn.k === 'paren') cn = cn.e;
        var v = ev(c.e, env, true);
        var ok = matchPat(c.pat, v, env, false, null);
        if (ok && cn.k === 'path' && cn.segs.length === 1) partialMove(cn, c.pat, env);
        return ok;
      }
      if (c.k === 'bin' && c.op === '&&' && (c.l.k === 'letcond' || c.r.k === 'letcond')) return evalCond(c.l, env) && evalCond(c.r, env);
      return !!dr(ev(c, env));
    }
    function partialMove(cn, pat, env) {
      var cell = env.find(cn.segs[0]); if (!cell || cell.moved) return;
      var v = cell.v; if (v instanceof Ref) return;
      if (!(v instanceof Enum || v instanceof Struct || v instanceof Tup)) return;
      if (V.isCopy(v)) return;
      // did the pattern bind a non-Copy value by value?
      var binds = false;
      (function walk(p, val) {
        if (!p || !val) return;
        if (p.k === 'pid') { if (!V.isCopy(val)) binds = true; return; }
        if (p.k === 'pvar' && p.items && val instanceof Enum) p.items.forEach(function (q, i) { walk(q, val.v[i]); });
        if (p.k === 'ptuple' && val instanceof Tup) p.items.forEach(function (q, i) { walk(q, val.a[i]); });
      })(pat, v);
      if (binds) { cell.moved = { line: cn.line, col: cn.col, partial: true, why: 'value partially moved here' }; }
    }
    function evalMatch(n, env) {
      var sn = n.e; while (sn.k === 'paren') sn = sn.e;
      var v = ev(n.e, env, true);
      for (var i = 0; i < n.arms.length; i++) {
        var arm = n.arms[i], sc = new Scope(env);
        try {
          if (!matchPat(arm.pat, v, sc, false, null)) continue;
          if (arm.guard && !dr(ev(arm.guard, sc))) continue;
          if (sn.k === 'path' && sn.segs.length === 1) partialMove(sn, arm.pat, env);
          return ev(arm.body, sc);
        } finally { exitScope(sc); }
      }
      err('E0004', 'non-exhaustive patterns: no arm matched `' + V.debug(v) + '`', n, { help: 'ensure that all possible cases are being handled by adding a match arm with a wildcard pattern `_`' });
    }
    function evalFor(n, env) {
      var itn = n.iter; while (itn.k === 'paren') itn = itn.e;
      var src;
      if (itn.k === 'path' && itn.segs.length === 1) { var c = lookup(itn.segs[0], env, itn, false); src = evalMove(itn, env, '`' + itn.segs[0] + '` moved due to this implicit call to `.into_iter()`'); }
      else src = ev(n.iter, env);
      var it = RL.toIter(ST, src, n.iter);
      for (;;) {
        var x = it.nx(); if (x === undefined) break;
        tick(n);
        var sc = new Scope(env);
        try {
          if (!matchPat(n.pat, x, sc, false, null, n.pat)) err('E0005', 'refutable pattern in `for` loop binding', n);
          try { evalBlock(n.body, sc, true); }
          catch (e) { if (e instanceof BreakEx && (!e.label || e.label === n.label)) break; if (e instanceof ContEx && (!e.label || e.label === n.label)) continue; throw e; }
        } finally { exitScope(sc); }
      }
      return UNIT;
    }
    function evalIndex(n, env) {
      var base = dr(ev(n.e, env, true)); var ix = ev(n.idx, env); var d = dr(ix);
      if (base instanceof RMap) { var e = base.m.get(V.key(d)); if (!e) err('panic', 'key not found in map', n); return e[1]; }
      if (d instanceof Range) {
        var len = Array.isArray(base) ? base.length : V.str(base) !== null ? Array.from(V.str(base)).length : 0;
        var lo = d.lo ? Number(d.lo.v) : 0, hi = d.hi ? Number(d.hi.v) + (d.incl ? 1 : 0) : len;
        if (lo > hi) err('panic', 'slice index starts at ' + lo + ' but ends at ' + hi, n);
        if (hi > len) err('panic', 'range end index ' + hi + ' out of range for slice of length ' + len, n);
        if (Array.isArray(base)) return base.slice(lo, hi);
        var s = V.str(base); var bytes = Buffer ? null : null;
        var ub = RL.utf8(s);
        if (hi > ub.length) err('panic', 'byte index ' + hi + ' is out of bounds of `' + s + '`', n);
        if (RL.notBoundary(ub, lo) || RL.notBoundary(ub, hi)) err('panic', 'byte index ' + (RL.notBoundary(ub, lo) ? lo : hi) + ' is not a char boundary; it is inside a character of `' + s + '`', n);
        return RL.fromUtf8(ub.slice(lo, hi));
      }
      if (typeof base === 'string' || base instanceof RS) err('E0277', 'the type `str` cannot be indexed by `' + V.typeName(d) + '`', n, { labels: [{ line: n.idx.line, col: n.idx.col, len: 1, primary: true, text: 'string indices are ranges of `usize`' }], help: 'the type `str` cannot be indexed by `{integer}`; strings are UTF-8 so a single index is ambiguous. Use `.chars().nth(i)` or `.as_bytes()[i]`' });
      if (Array.isArray(base)) return base[idxOf(d, base.length, n)];
      err('E0608', 'cannot index into a value of type `' + V.typeName(base) + '`', n);
    }
    function evalStructLit(n, env) {
      var name = n.path[n.path.length - 1]; if (name === 'Self') { name = selfTypeName(env); }
      var sd = structs[name];
      if (!sd && n.path.length > 1) { // enum struct variant
        var en = enums[n.path[n.path.length - 2] === 'Self' ? selfTypeName(env) : n.path[n.path.length - 2]];
        if (en) { var vd = en.variants.filter(function (v) { return v.name === name; })[0]; if (vd) { var vals = vd.fields.map(function (f) { var fe = n.fields.filter(function (x) { return x.name === f.name; })[0]; if (!fe) err('E0063', 'missing field `' + f.name + '` in initializer of `' + name + '`', n); return coerce(f.ty, evalMove(fe.e, env), fe.e); }); return new Enum(en.name, name, vals, vd.fields.map(function (f) { return f.name; })); } }
      }
      if (!sd) err('E0422', 'cannot find struct, variant or union type `' + name + '` in this scope', n);
      var f = {}, order = sd.fields ? sd.fields.map(function (x) { return x.name; }) : null;
      if (!sd.fields) err('E0423', 'expected struct, found tuple struct `' + name + '`', n);
      n.fields.forEach(function (fe) {
        var fd = sd.fields.filter(function (x) { return x.name === fe.name; })[0];
        if (!fd) err('E0560', 'struct `' + name + '` has no field named `' + fe.name + '`', n, { labels: [{ line: n.line, col: n.col, len: fe.name.length, primary: true, text: 'unknown field' }], help: 'available fields are: ' + order.join(', ') });
        f[fe.name] = coerce(fd.ty, evalMove(fe.e, env), fe.e);
      });
      if (n.base) { var bv = dr(evalMove(n.base, env)); order.forEach(function (k) { if (!(k in f)) f[k] = bv.f[k]; }); }
      var missing = order.filter(function (k) { return !(k in f); });
      if (missing.length) err('E0063', 'missing field' + (missing.length > 1 ? 's' : '') + ' ' + missing.map(function (m) { return '`' + m + '`'; }).join(', ') + ' in initializer of `' + name + '`', n, { labels: [{ line: n.line, col: n.col, len: name.length, primary: true, text: 'missing ' + missing.map(function (m) { return '`' + m + '`'; }).join(', ') }] });
      var ordered = {}; order.forEach(function (k) { ordered[k] = f[k]; });
      return new Struct(name, ordered, order);
    }
    function selfTypeName(env) { var c = env.find('self'); if (c && c.selfTy) return c.selfTy; return curSelfTy || 'Self'; }
    var curSelfTy = null;
    function evalPath(n, env, borrow) {
      var segs = n.segs;
      if (segs.length === 1) {
        var nm = segs[0];
        var c = lookup(nm, env, n, borrow);
        if (c) { return c.v; }
        if (consts[nm]) { return constVal(nm); }
        if (fns[nm]) return fnValue(fns[nm]);
        if (nm === 'None') return V.NONE();
        if (nm === 'Some' || nm === 'Ok' || nm === 'Err') return new Fn(function (a) { return new Enum(nm === 'Some' ? 'Option' : 'Result', nm, [a[0]]); }, nm);
        if (structs[nm] && !structs[nm].fields && !structs[nm].tuple) return new Struct(nm, {}, []);
        if (structs[nm] && structs[nm].tuple) return new Fn(function (a) { var f = {}, o = []; a.forEach(function (x, i) { f[i] = x; o.push(String(i)); }); var s = new Struct(nm, f, o); s.tuple = true; return s; }, nm);
        for (var en in enums) { var vd = enums[en].variants.filter(function (v) { return v.name === nm; })[0]; if (vd && ST.importedVariants) return variantVal(en, vd); }
        err('E0425', 'cannot find value `' + nm + '` in this scope', n, { labels: [{ line: n.line, col: n.col, len: nm.length, primary: true, text: 'not found in this scope' }], help: similar(nm, env) });
      }
      var tyn = segs[segs.length - 2], last = segs[segs.length - 1];
      if (tyn === 'Self') tyn = selfTypeName(env);
      if (enums[tyn]) { var vd2 = enums[tyn].variants.filter(function (v) { return v.name === last; })[0]; if (vd2) return variantVal(tyn, vd2); }
      if (impls[tyn] && impls[tyn]['const:' + last]) return ev(impls[tyn]['const:' + last].e, globalScope);
      if (impls[tyn] && impls[tyn][last]) { var d = impls[tyn][last]; return new Fn(function (a, nd) { return callUser(d, d.selfKind ? a.slice(1) : a, d.selfKind ? a[0] : null, tyn, nd || n); }, last); }
      var bv = RL.builtinConst(ST, segs, n); if (bv !== NOMETH) return bv;
      if (fns[last] && segs.length > 1) return fnValue(fns[last]);
      if (enums[tyn]) err('E0599', 'no variant or associated item named `' + last + '` found for enum `' + tyn + '` in the current scope', n, { labels: [{ line: n.line, col: n.col, len: segs.join('::').length, primary: true, text: 'variant or associated item not found in `' + tyn + '`' }], help: 'variants: ' + enums[tyn].variants.map(function (v) { return v.name; }).join(', ') });
      err('E0433', 'failed to resolve: use of undeclared type `' + tyn + '`', n, { labels: [{ line: n.line, col: n.col, len: tyn.length, primary: true, text: 'use of undeclared type `' + tyn + '`' }] });
    }
    function similar(nm, env) { var best = null, bd = 99; for (var s = env; s; s = s.parent) for (var k in s.vars) { var d = lev(nm, k); if (d < bd) { bd = d; best = k; } } return best && bd <= 2 ? 'a local variable with a similar name exists: `' + best + '`' : null; }
    function lev(a, b) { var m = []; for (var i = 0; i <= a.length; i++) { m[i] = [i]; } for (var j = 1; j <= b.length; j++) m[0][j] = j; for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; }
    var constCache = Object.create(null);
    function constVal(nm) { if (!(nm in constCache)) { var d = consts[nm]; constCache[nm] = coerce(d.ty, ev(d.e, globalScope), d.e); } return V.clone(constCache[nm]); }
    function fnValue(d) { return new Fn(function (a, nd) { return callUser(d, a, null, null, nd || d); }, d.name); }
    function variantVal(en, vd) {
      if (vd.kind === 'unit') return new Enum(en, vd.name, []);
      if (vd.kind === 'tuple') return new Fn(function (a, nd) { if (a.length !== vd.tys.length) err('E0061', 'this enum variant takes ' + vd.tys.length + ' argument' + (vd.tys.length === 1 ? '' : 's') + ' but ' + a.length + ' ' + (a.length === 1 ? 'argument was' : 'arguments were') + ' supplied', nd); return new Enum(en, vd.name, a.map(function (x, i) { return coerce(vd.tys[i], x, nd); })); }, vd.name);
      return new Fn(function () { err('E0533', 'expected value, found struct variant', null); }, vd.name);
    }
    function execAssign(n, env) {
      var l = n.l; while (l.k === 'paren') l = l.e;
      if (l.k === 'path' && l.segs.length === 1 && l.segs[0] === '_') { ev(n.r, env); return UNIT; }
      var rv;
      if (n.op === '=') {
        rv = evalMove(n.r, env, 'value moved here');
      } else {
        var rhs = ev(n.r, env, true);
        var pl0 = getPlace(l, env);
        var cur = pl0.get();
        var dcur = cur instanceof Ref ? cur : cur;
        rv = arith(n.op[0], dr(cur), rhs, n);
      }
      // deferred initialisation
      if (l.k === 'path' && l.segs.length === 1) {
        var c = env.find(l.segs[0]);
        if (!c) err('E0425', 'cannot find value `' + l.segs[0] + '` in this scope', l, { labels: [{ line: l.line, col: l.col, len: l.segs[0].length, primary: true, text: 'not found in this scope' }] });
        if (!c.init) { c.v = rv; c.init = true; if (!c.deferredMut) c.assignedOnce = true; return UNIT; }
        if (!c.mut) {
          var labs = [{ line: l.line, col: l.col, len: l.segs[0].length, primary: true, text: 'cannot assign twice to immutable variable' }];
          if (c.decl) labs.unshift({ line: c.decl.line, col: c.decl.col, len: c.name.length, text: 'first assignment to `' + c.name + '`' });
          err('E0384', 'cannot assign twice to immutable variable `' + c.name + '`', l, { labels: labs, help: 'consider making this binding mutable: `mut ' + c.name + '`' });
        }
        if (c.v instanceof Ref && n.op !== '=' && false) { }
        if (hasDrop && n.op === '=' && !(c.v instanceof Ref)) dropValue(c.v, n, c.name);
        if (n.op === '=' && c.v instanceof I && rv instanceof I && c.v.t && rv.t && c.v.t !== rv.t) mismatchOp(c.v, rv, n.r);
        if (n.op === '=' && c.v instanceof I && rv instanceof I && c.v.t && !rv.t) rv = new I(rv.v, c.v.t);
        if (n.op === '=' && c.v instanceof Fl && rv instanceof Fl && c.v.t && !rv.t) rv = new Fl(rv.v, c.v.t);
        if (n.op === '=' && c.v !== null && c.v !== undefined) rv = coerceLike(c.v, rv, n.r);
        c.v = rv; c.moved = null; return UNIT;
      }
      checkMutable(l, env, 'assign');
      var pl = getPlace(l, env);
      if (pl.shared) pl.set(rv);
      if (n.op === '=') { var old = pl.get(); if (old instanceof I && rv instanceof I && old.t && !rv.t) rv = new I(rv.v, old.t); else if (old !== undefined && old !== null) rv = coerceLike(old, rv, n.r); if (hasDrop && old && !pl.deref) dropValue(old, n); }
      pl.set(rv); return UNIT;
    }
    function coerceLike(old, nv, node) {
      var o = dr(old), x = nv;
      if (o instanceof I && x instanceof Fl || o instanceof Fl && x instanceof I || (o instanceof I || o instanceof Fl) && (typeof x === 'string' || x instanceof RS) || (typeof o === 'string' || o instanceof RS) && (x instanceof I || x instanceof Fl)) mismatch(V.typeName(o), V.typeName(x), node);
      if (o instanceof RS && typeof x === 'string') mismatch('String', '&str', node, 'try using a conversion method: `.to_string()`');
      return nv;
    }
    function evalCall(n, env) {
      var f = n.f; while (f.k === 'paren') f = f.e;
      if (f.k === 'path') {
        var segs = f.segs;
        var nm = segs[segs.length - 1];
        if (segs.length === 1) {
          var local = env.find(nm);
          if (local) { if (local.moved) moveErr(local, f, true); return callValue(local.v, evalArgs(n.args, env), n); }
          if (fns[nm]) { var d = fns[nm]; var args = evalArgs(n.args, env); checkArgTypes(d, args, n.args, env, n); return callUser(d, args, null, null, n); }
          if (nm === 'Some' || nm === 'Ok' || nm === 'Err') { if (n.args.length !== 1) err('E0061', 'this enum variant takes 1 argument but ' + n.args.length + ' arguments were supplied', n); return new Enum(nm === 'Some' ? 'Option' : 'Result', nm, [evalMove(n.args[0], env)]); }
          if (structs[nm] && structs[nm].tuple) { var tv = evalArgs(n.args, env); var tf = {}, to = []; tv.forEach(function (x, i) { tf[i] = coerce(structs[nm].tuple[i], x, n); to.push(String(i)); }); var ts = new Struct(nm, tf, to); ts.tuple = true; return ts; }
          if (nm === 'drop') { var dn = n.args[0]; var dv = evalMove(dn, env, 'value moved here'); ST.usesDrop = true; dropValue(dv, n, dn.k === 'path' ? dn.segs[0] : null); return UNIT; }
          for (var en in enums) { var vd = enums[en].variants.filter(function (v) { return v.name === nm; })[0]; if (vd && vd.kind === 'tuple') return callValue(variantVal(en, vd), evalArgs(n.args, env), n); }
          var bf = RL.builtinFn(ST, segs, n, env); if (bf !== NOMETH) return bf;
          err('E0425', 'cannot find function `' + nm + '` in this scope', n, { labels: [{ line: f.line, col: f.col, len: nm.length, primary: true, text: 'not found in this scope' }], help: (function () { var best = null, bd = 99; Object.keys(fns).forEach(function (k) { var dd = lev(nm, k); if (dd < bd) { bd = dd; best = k; } }); return best && bd <= 2 ? 'a function with a similar name exists: `' + best + '`' : null; })() });
        }
        var tyn = segs[segs.length - 2];
        if (tyn === 'Self') tyn = selfTypeName(env);
        if (impls[tyn] && impls[tyn][nm]) {
          var def = impls[tyn][nm]; var a2 = evalArgs(n.args, env);
          if (def.selfKind) { var selfV = a2[0]; a2 = a2.slice(1); return callUser(def, a2, def.selfKind === 'val' ? dr(selfV) : selfV, tyn, n); }
          checkArgTypes(def, a2, n.args, env, n);
          var saved = curSelfTy; curSelfTy = tyn; try { return callUser(def, a2, null, tyn, n); } finally { curSelfTy = saved; }
        }
        if (enums[tyn]) { var vd2 = enums[tyn].variants.filter(function (v) { return v.name === nm; })[0]; if (vd2) return callValue(variantVal(tyn, vd2), evalArgs(n.args, env), n); }
        if (traits[tyn] && n.args.length) { var rv0 = evalMove(n.args[0], env); var fm = findMethod(rv0, nm); if (fm) return callUser(fm.def, evalArgs(n.args.slice(1), env), rv0, fm.ty, n); }
        if ((structs[tyn] || enums[tyn]) && nm === 'default') return defaultOf(tyn, n);
        if (structs[tyn] || enums[tyn]) {
          var cand = Object.keys(impls[tyn] || {}).filter(function (k) { return k.indexOf('const:') !== 0; });
          err('E0599', 'no function or associated item named `' + nm + '` found for ' + (structs[tyn] ? 'struct' : 'enum') + ' `' + tyn + '` in the current scope', n, { labels: [{ line: f.line, col: f.col, len: segs.join('::').length, primary: true, text: 'function or associated item not found in `' + tyn + '`' }], help: cand.length ? 'available: ' + cand.join(', ') : null });
        }
        var bf2 = RL.builtinFn(ST, segs, n, env); if (bf2 !== NOMETH) return bf2;
        err('E0433', 'failed to resolve: use of undeclared type or module `' + tyn + '`', n, { labels: [{ line: f.line, col: f.col, len: tyn.length, primary: true, text: 'use of undeclared type `' + tyn + '`' }] });
      }
      var fv = ev(n.f, env);
      return callValue(fv, evalArgs(n.args, env), n);
    }
    function defaultOf(tyn, node) {
      if (structs[tyn]) { var sd = structs[tyn]; if (impls[tyn] && impls[tyn].default) return callUser(impls[tyn].default, [], null, tyn, node); var f = {}, o = []; (sd.fields || []).forEach(function (fd) { f[fd.name] = defaultForType(fd.ty); o.push(fd.name); }); return new Struct(tyn, f, o); }
      var ed = enums[tyn]; return new Enum(tyn, ed.variants[0].name, []);
    }
    function defaultForType(t) {
      if (t.k === 'tpath') { var nm = t.name; if (V.isIntT(nm)) return new I(0n, nm); if (nm === 'f64' || nm === 'f32') return new Fl(0, nm); if (nm === 'bool') return false; if (nm === 'String') return new RS(''); if (nm === 'Vec') return []; if (nm === 'Option') return V.NONE(); if (nm === 'char') return new Ch('\0'); if (nm === 'HashMap') return new RMap(); if (structs[nm] || enums[nm]) return defaultOf(nm, null); }
      if (t.k === 'ttuple') return new Tup(t.items.map(defaultForType));
      return UNIT;
    }
    ST.defaultOf = defaultOf; ST.defaultForType = defaultForType;
    function makeClosure(n, env) {
      return new Fn(function (args, nd) {
        tick(n);
        var sc = new Scope(env);
        n.params.forEach(function (p, i) { var a = args[i]; if (p.ty) a = coerce(p.ty, a, nd); if (!matchPat(p.pat, a, sc, false, null, p.pat)) err('E0005', 'refutable pattern in closure argument', n); });
        try { return ev(n.body, sc); } catch (e) { if (e instanceof RetEx) return e.val; throw e; } finally { exitScope(sc); }
      }, 'closure');
    }
    // ---- macros ----
    function evalMacro(n, env) {
      var nm = n.name, a = n.args;
      switch (nm) {
        case 'println': case 'print': case 'eprintln': case 'eprint': {
          var s = '';
          if (a.length) { if (a[0].k !== 'str') err('error', 'format argument must be a string literal', a[0]); s = formatStr(a[0].v, a.slice(1), env, n); }
          if (nm === 'println' || nm === 'eprintln') s += '\n';
          if (nm[0] === 'e') errOut.push(s); else out.push(s);
          return UNIT;
        }
        case 'format': { if (!a.length || a[0].k !== 'str') err('error', 'requires at least a format string argument', n); return new RS(formatStr(a[0].v, a.slice(1), env, n)); }
        case 'write': case 'writeln': {
          var tgt = dr(ev(a[0], env, true)); var txt = a.length > 1 ? formatStr(a[1].v, a.slice(2), env, n) : ''; if (nm === 'writeln') txt += '\n';
          if (tgt && tgt.fmtr) tgt.buf += txt; else if (tgt instanceof RS) tgt.s += txt; else out.push(txt);
          return V.mkOk(UNIT);
        }
        case 'panic': { var msg = a.length ? formatStr(a[0].v, a.slice(1), env, n) : 'explicit panic'; err('panic', msg, n); break; }
        case 'unreachable': err('panic', 'internal error: entered unreachable code' + (a.length ? ': ' + formatStr(a[0].v, a.slice(1), env, n) : ''), n); break;
        case 'todo': err('panic', 'not yet implemented', n); break;
        case 'unimplemented': err('panic', 'not implemented', n); break;
        case 'vec': return a.map(function (e) { return evalMove(e, env); });
        case 'vec_repeat': { var el = ev(a[0], env); var cnt = Number(dr(ev(a[1], env)).v); var r = []; for (var i = 0; i < cnt; i++) r.push(V.clone(el)); return r; }
        case 'assert': { var ok = dr(ev(a[0], env)); if (!ok) err('panic', a.length > 1 ? formatStr(a[1].v, a.slice(2), env, n) : 'assertion failed: ' + srcText(a[0]), n); return UNIT; }
        case 'assert_eq': case 'assert_ne': {
          var x = ev(a[0], env, true), y = ev(a[1], env, true); var eq = V.eq(x, y);
          if (nm === 'assert_eq' ? !eq : eq) err('panic', 'assertion `left ' + (nm === 'assert_eq' ? '==' : '!=') + ' right` failed' + (a.length > 2 ? ': ' + formatStr(a[2].v, a.slice(3), env, n) : '') + '\n  left: ' + V.debug(x) + '\n right: ' + V.debug(y), n);
          return UNIT;
        }
        case 'dbg': { var dv = ev(a[0], env); errOut.push('[src/main.rs:' + n.line + ':' + n.col + '] ' + srcText(a[0]) + ' = ' + V.debug(dv, true) + '\n'); return dv; }
        case 'matches': { var mv = ev(a[0], env, true); var sc = new Scope(env); var m = matchPat(n.pat, mv, sc, false, null); if (m && n.guard) m = !!dr(ev(n.guard, sc)); return m; }
      }
      err('error', 'cannot find macro `' + nm + '` in this scope', n);
    }
    function srcText(n) {
      if (n.k === 'path') return n.segs.join('::'); if (n.k === 'int' || n.k === 'float') return String(n.v); if (n.k === 'bool') return String(n.v); if (n.k === 'str') return '"' + n.v + '"';
      if (n.k === 'bin') return srcText(n.l) + ' ' + n.op + ' ' + srcText(n.r); if (n.k === 'unary') return n.op + srcText(n.e); if (n.k === 'paren') return '(' + srcText(n.e) + ')';
      if (n.k === 'mcall') return srcText(n.recv) + '.' + n.name + '(' + n.args.map(srcText).join(', ') + ')'; if (n.k === 'call') return srcText(n.f) + '(' + n.args.map(srcText).join(', ') + ')'; if (n.k === 'field') return srcText(n.e) + '.' + n.name;
      if (n.k === 'index') return srcText(n.e) + '[' + srcText(n.idx) + ']'; if (n.k === 'ref') return '&' + (n.mut ? 'mut ' : '') + srcText(n.e);
      return '..';
    }
    // ---- entry ----
    ST.run = function () {
      register(ast.items);
      var main = fns.main;
      if (!main) err('E0601', '`main` function not found in crate', { line: 1, col: 1 });
      callUser(main, [], null, null, main);
      return UNIT;
    };
    ST.Scope = Scope; ST.globalScope = globalScope;
    ST.coerce = coerce; ST.moveErr = moveErr;
    ST.usesRcFlag = function () { ST.usesRc = true; };
    ST.BreakEx = BreakEx; ST.RetEx = RetEx;
    ST.mismatchFn = mismatch;
    return ST;
  };
})();

/* Rust Lab core, part 5: built-in methods, iterators, std functions. */
(function () {
  var V = RL.V, NOMETH = RL.NOMETH || (RL.NOMETH = { nometh: 1 });
  var I = V.I, Fl = V.Fl, Ch = V.Ch, RS = V.RS, Tup = V.Tup, Struct = V.Struct, Enum = V.Enum, Range = V.Range, Ref = V.Ref, Bx = V.Bx, Rc = V.Rc, RefCell = V.RefCell, RMap = V.RMap, RSet = V.RSet, It = V.It, Fn = V.Fn, UNIT = V.UNIT, dr = V.dr, err = function (c, m, n, x) { return RL.err(c, m, n, x); };
  var usize = V.usize, Some = V.mkSome, None = V.NONE, Ok = V.mkOk, Er = V.mkErr;
  RL.utf8 = function (s) { return Array.from(new TextEncoder().encode(s)); };
  RL.fromUtf8 = function (b) { return new TextDecoder().decode(new Uint8Array(b)); };
  RL.notBoundary = function (b, i) { return i > 0 && i < b.length && (b[i] & 0xC0) === 0x80; };
  function arrIt(a) { var i = 0; return new It(function () { return i < a.length ? a[i++] : undefined; }); }
  function elemRefs(a) { var i = 0; return new It(function () { if (i >= a.length) return undefined; var k = i++; return new Ref(function () { return a[k]; }, function (x) { a[k] = x; }, true); }); }
  RL.toIter = function (ST, v, node) {
    var raw = v;
    if (v instanceof Ref) { var inner = v.get(); if (v.mut && Array.isArray(inner)) return elemRefs(inner); if (v.mut && inner instanceof RMap) { var ent = []; inner.m.forEach(function (e) { ent.push(new Tup([e[0], new Ref(function () { return e[1]; }, function (x) { e[1] = x; }, true)])); }); return arrIt(ent); } v = inner; }
    if (v instanceof It) return v;
    if (v instanceof Range) {
      if (!(v.lo instanceof I)) err('E0277', '`' + V.typeName(v) + '` is not an iterator', node);
      var cur = v.lo.v, hi = v.hi ? v.hi.v : null, t = v.lo.t || (v.hi && v.hi.t);
      return new It(function () { if (hi !== null && (v.incl ? cur > hi : cur >= hi)) return undefined; var r = new I(cur, t); cur++; return r; });
    }
    if (Array.isArray(v)) return arrIt(v);
    if (v instanceof RMap) { var es = []; v.m.forEach(function (e) { es.push(new Tup([e[0], e[1]])); }); return arrIt(es); }
    if (v instanceof RSet) { var ss = []; v.m.forEach(function (e) { ss.push(e[0]); }); return arrIt(ss); }
    if (v instanceof Enum && v.en === 'Option') return arrIt(v.v);
    if (v instanceof Struct) {
      var f = ST.findMethod(v, 'next');
      if (f) return new It(function () { var r = dr(ST.callUser(f.def, [], new Ref(function () { return v; }, function () { }, true), f.ty, node)); return r.vn === 'Some' ? r.v[0] : undefined; });
      err('E0277', '`' + v.st + '` is not an iterator', node, { labels: [{ line: node.line, col: node.col, len: 1, primary: true, text: '`' + v.st + '` is not an iterator' }], help: 'the trait `Iterator` is not implemented for `' + v.st + '`' });
    }
    err('E0277', '`' + V.typeName(v) + '` is not an iterator', node, { labels: [{ line: node.line, col: node.col, len: 1, primary: true, text: '`' + V.typeName(v) + '` is not an iterator' }], help: 'the trait `Iterator` is not implemented for `' + V.typeName(v) + '`' + (V.str(v) !== null ? '; if you want to iterate over the chars, use `.chars()`' : '') });
  };
  function drain(it) { var r = [], x; while ((x = it.nx()) !== undefined) r.push(x); return r; }
  function call(ST, f, args, node) { return ST.callValue(f, args, node); }
  function truthy(x) { return !!dr(x); }
  function num(x) { return Number(dr(x).v); }
  function mkErrVal(dbg, disp) { return new V.ErrVal(dbg, disp); }
  function parseTo(s, ty, node) {
    var nm = ty ? ty.name : null; var t = s;
    if (nm === 'f64' || nm === 'f32') { if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t) || /^[+-]?(inf|NaN)$/.test(t)) return Ok(new Fl(parseFloat(t), nm)); return Er(mkErrVal('ParseFloatError { kind: Invalid }', 'invalid float literal')); }
    if (nm === 'bool') { if (t === 'true') return Ok(true); if (t === 'false') return Ok(false); return Er(mkErrVal('ParseBoolError', 'provided string was not `true` or `false`')); }
    if (nm === 'char') { return Array.from(t).length === 1 ? Ok(new Ch(t)) : Er(mkErrVal('CharTryFromError(())', 'too many characters in string')); }
    if (nm === 'String') return Ok(new RS(t));
    var ity = nm && V.isIntT(nm) ? nm : null;
    if (t === '') return Er(mkErrVal('ParseIntError { kind: Empty }', 'cannot parse integer from empty string'));
    if (!/^[+-]?\d+$/.test(t)) { if (!ity && /^[+-]?\d*\.\d+$/.test(t)) return Ok(new Fl(parseFloat(t), null)); return Er(mkErrVal('ParseIntError { kind: InvalidDigit }', 'invalid digit found in string')); }
    var bi = BigInt(t), b = V.BOUNDS[ity || 'i32'];
    if (ity && ity[0] === 'u' && t[0] === '-') return Er(mkErrVal('ParseIntError { kind: InvalidDigit }', 'invalid digit found in string'));
    if (bi < b[0]) return Er(mkErrVal('ParseIntError { kind: NegOverflow }', 'number too small to fit in target type'));
    if (bi > b[1]) return Er(mkErrVal('ParseIntError { kind: PosOverflow }', 'number too large to fit in target type'));
    return Ok(new I(bi, ity));
  }
  var VEC_MUT = { push: 1, pop: 1, insert: 1, remove: 1, clear: 1, sort: 1, sort_by: 1, sort_by_key: 1, sort_unstable: 1, reverse: 1, extend: 1, truncate: 1, swap: 1, retain: 1, drain: 1, dedup: 1, append: 1, iter_mut: 1, push_str: 1, resize: 1, swap_remove: 1, entry: 1, get_mut: 1, values_mut: 1, last_mut: 1, first_mut: 1, take: 0, extend_from_slice: 1 };
  var STR_MUT = { push_str: 1, push: 1, clear: 1, insert: 1, insert_str: 1, pop: 1, truncate: 1, remove: 1, retain: 1 };
  function ordFn(a, b) { return V.cmp(a, b); }
  function ordEnum(c) { return new Enum('Ordering', c < 0 ? 'Less' : c > 0 ? 'Greater' : 'Equal', []); }

  RL.builtinMethod = function (ST, recvRaw, name, n, env) {
    var args = n.args, ev = ST.ev;
    var recv = dr(recvRaw);
    function A(i) { return ST.ev(args[i], env); }
    function AM(i) { var a = args[i]; var v = a.k === 'path' ? ST.ev(a, env) : ST.ev(a, env); return v; }
    function argMoved(i) { var a = args[i]; if (a.k === 'path' && a.segs.length === 1) { var c = env.find(a.segs[0]); if (c && !(c.v instanceof Ref) && !V.isCopy(c.v)) { c.moved = { line: a.line, col: a.col, why: 'value moved here' }; } return c ? c.v : ev(a, env); } return ev(a, env); }
    function mutOK() { if (VEC_MUT[name] || STR_MUT[name]) ST.checkMutable(n.recv, env, 'borrow'); }
    var m;
    // universal
    switch (name) {
      case 'clone': case 'cloned': if (!(recv instanceof It) && !(recv instanceof Enum && recv.en === 'Option' && name === 'cloned' && false)) { if (name === 'clone') return V.clone(recv instanceof Ref ? recv.get() : recv); } break;
      case 'to_string': if (V.str(recv) !== null || recv instanceof I || recv instanceof Fl || typeof recv === 'boolean' || recv instanceof Ch || recv instanceof Struct || recv instanceof Enum || recv instanceof V.ErrVal) return new RS(V.display(recv)); break;
      case 'into': case 'as_ref': case 'borrow_mut_': case 'by_ref': case 'to_owned': case 'as_mut': if (name === 'to_owned' && typeof recv === 'string') return new RS(recv); if (name === 'into' && typeof recv === 'string') return new RS(recv); if (name !== 'as_mut' && name !== 'as_ref') return V.clone(recv); break;
      case 'eq': return V.eq(recv, A(0)); case 'ne': return !V.eq(recv, A(0));
      case 'cmp': case 'partial_cmp': { var cc = ordEnum(V.cmp(recv, A(0))); return name === 'cmp' ? cc : Some(cc); }
      case 'lt': return V.cmp(recv, A(0)) < 0; case 'gt': return V.cmp(recv, A(0)) > 0; case 'le': return V.cmp(recv, A(0)) <= 0; case 'ge': return V.cmp(recv, A(0)) >= 0;
      case 'max': if (!(recv instanceof It)) { var o = A(0); return V.cmp(recv, o) >= 0 && !(recv instanceof Fl) ? (V.cmp(recv, o) > 0 ? recv : o) : (recv instanceof Fl ? new Fl(Math.max(recv.v, dr(o).v), recv.t) : o); } break;
      case 'min': if (!(recv instanceof It)) { var o2 = A(0); return recv instanceof Fl ? new Fl(Math.min(recv.v, dr(o2).v), recv.t) : V.cmp(recv, o2) <= 0 ? recv : o2; } break;
      case 'fmt': if (recv && recv !== UNIT) { var f = dr(A(0)); if (f && f.fmtr) { f.buf += V.display(recv); return Ok(UNIT); } } break;
    }
    if (typeof recv === 'boolean' && name === 'then') { return recv ? Some(call(ST, A(0), [], n)) : None(); }
    if (typeof recv === 'boolean' && name === 'then_some') return recv ? Some(A(0)) : None();
    // integers
    if (recv instanceof I) {
      var t = recv.t, b = V.BOUNDS[t || 'i64'];
      function wrapT(x) { if (!t) return x; var bits = Number(t.replace(/\D/g, '') || 64); return b[0] < 0n ? BigInt.asIntN(bits, x) : BigInt.asUintN(bits, x); }
      function inR(x) { return x >= b[0] && x <= b[1]; }
      function other() { var o = dr(A(0)); if (!(o instanceof I)) err('E0308', 'mismatched types', args[0], { labels: [{ line: args[0].line, col: args[0].col, len: 1, primary: true, text: 'expected `' + (t || 'integer') + '`, found `' + V.typeName(o) + '`' }] }); if (t && o.t && o.t !== t) ST.mismatchFn(t, o.t, args[0]); return o.v; }
      switch (name) {
        case 'abs': return new I(recv.v < 0n ? -recv.v : recv.v, t);
        case 'pow': { var r = recv.v ** BigInt(num(A(0))); if (!inR(r)) err('panic', 'attempt to multiply with overflow', n); return new I(r, t); }
        case 'checked_add': case 'checked_sub': case 'checked_mul': case 'checked_div': case 'checked_rem': case 'checked_pow': { var y = name === 'checked_pow' ? BigInt(num(A(0))) : other(), x = recv.v, r2; if (name === 'checked_add') r2 = x + y; else if (name === 'checked_sub') r2 = x - y; else if (name === 'checked_mul') r2 = x * y; else if (name === 'checked_pow') r2 = x ** y; else { if (y === 0n) return None(); r2 = name === 'checked_div' ? x / y : x % y; } return inR(r2) ? Some(new I(r2, t)) : None(); }
        case 'wrapping_add': return new I(wrapT(recv.v + other()), t); case 'wrapping_sub': return new I(wrapT(recv.v - other()), t); case 'wrapping_mul': return new I(wrapT(recv.v * other()), t);
        case 'saturating_add': case 'saturating_sub': case 'saturating_mul': { var yy = other(); var rr = name === 'saturating_add' ? recv.v + yy : name === 'saturating_sub' ? recv.v - yy : recv.v * yy; return new I(rr < b[0] ? b[0] : rr > b[1] ? b[1] : rr, t); }
        case 'overflowing_add': { var s = recv.v + other(); return new Tup([new I(wrapT(s), t), !inR(s)]); }
        case 'rem_euclid': { var d = other(); var rm = ((recv.v % d) + d) % d; return new I(rm, t); }
        case 'div_euclid': { var d2 = other(); var q = recv.v / d2; if (recv.v % d2 < 0n) q = d2 > 0n ? q - 1n : q + 1n; return new I(q, t); }
        case 'signum': return new I(recv.v > 0n ? 1n : recv.v < 0n ? -1n : 0n, t);
        case 'is_positive': return recv.v > 0n; case 'is_negative': return recv.v < 0n;
        case 'abs_diff': { var od = other(); return new I(recv.v > od ? recv.v - od : od - recv.v, t); }
        case 'count_ones': return new I(BigInt(recv.v.toString(2).replace(/0|-/g, '').length), 'u32');
        case 'is_power_of_two': return recv.v > 0n && (recv.v & (recv.v - 1n)) === 0n;
        case 'clamp': { var lo = dr(A(0)).v, hi = dr(A(1)).v; return new I(recv.v < lo ? lo : recv.v > hi ? hi : recv.v, t); }
        case 'sqrt': break;
        case 'to_le_bytes': break;
      }
    }
    if (recv instanceof Fl) {
      var T = recv.t, x = recv.v; function F(v) { return new Fl(T === 'f32' ? Math.fround(v) : v, T); }
      switch (name) {
        case 'sqrt': return F(Math.sqrt(x)); case 'abs': return F(Math.abs(x)); case 'floor': return F(Math.floor(x)); case 'ceil': return F(Math.ceil(x)); case 'round': return F(x < 0 ? -Math.round(-x) : Math.round(x)); case 'trunc': return F(Math.trunc(x));
        case 'powi': return F(Math.pow(x, num(A(0)))); case 'powf': return F(Math.pow(x, num(A(0))));
        case 'sin': return F(Math.sin(x)); case 'cos': return F(Math.cos(x)); case 'tan': return F(Math.tan(x)); case 'ln': return F(Math.log(x)); case 'log10': return F(Math.log10(x)); case 'exp': return F(Math.exp(x));
        case 'is_nan': return isNaN(x); case 'signum': return F(x < 0 ? -1 : 1); case 'fract': return F(x - Math.trunc(x)); case 'to_degrees': return F(x * 180 / Math.PI); case 'to_radians': return F(x * Math.PI / 180);
        case 'hypot': return F(Math.hypot(x, num(A(0)))); case 'atan2': return F(Math.atan2(x, num(A(0))));
        case 'clamp': return F(Math.min(Math.max(x, num(A(0))), num(A(1))));
        case 'total_cmp': return ordEnum(V.cmp(recv, A(0)));
      }
    }
    if (recv instanceof Ch) {
      var c = recv.c;
      switch (name) {
        case 'is_alphabetic': return /\p{L}/u.test(c); case 'is_numeric': return /\p{N}/u.test(c); case 'is_alphanumeric': return /[\p{L}\p{N}]/u.test(c); case 'is_whitespace': return /\s/.test(c);
        case 'is_uppercase': return /\p{Lu}/u.test(c); case 'is_lowercase': return /\p{Ll}/u.test(c); case 'is_ascii_digit': return /[0-9]/.test(c); case 'is_ascii_alphabetic': return /[A-Za-z]/.test(c); case 'is_ascii_punctuation': return /[!-\/:-@\[-`{-~]/.test(c);
        case 'is_digit': return /[0-9]/.test(c);
        case 'to_ascii_uppercase': return new Ch(c.toUpperCase()); case 'to_ascii_lowercase': return new Ch(c.toLowerCase());
        case 'to_uppercase': return arrIt([new Ch(c.toUpperCase())]); case 'to_lowercase': return arrIt([new Ch(c.toLowerCase())]);
        case 'to_digit': { var rdx = args.length ? num(A(0)) : 10; var dv = parseInt(c, rdx); return isNaN(dv) ? None() : Some(new I(BigInt(dv), 'u32')); }
        case 'len_utf8': return usize(RL.utf8(c).length);
      }
    }
    // Strings / &str
    var sv = V.str(recv);
    if (sv !== null && !(recv instanceof Ch)) {
      switch (name) {
        case 'len': return usize(RL.utf8(sv).length); case 'is_empty': return sv.length === 0;
        case 'push_str': { mutOK(); var a0 = V.str(A(0)); if (a0 === null) err('E0308', 'mismatched types', args[0], { labels: [{ line: args[0].line, col: args[0].col, len: 1, primary: true, text: 'expected `&str`, found `' + V.typeName(A(0)) + '`' }] }); recv.s += a0; return UNIT; }
        case 'push': { mutOK(); var ch = dr(A(0)); if (!(ch instanceof Ch)) err('E0308', 'mismatched types', args[0], { labels: [{ line: args[0].line, col: args[0].col, len: 1, primary: true, text: 'expected `char`, found `' + V.typeName(ch) + '`' }], help: 'use `push_str` for string slices' }); recv.s += ch.c; return UNIT; }
        case 'pop': { mutOK(); var cs = Array.from(recv.s); if (!cs.length) return None(); var l = cs.pop(); recv.s = cs.join(''); return Some(new Ch(l)); }
        case 'clear': mutOK(); recv.s = ''; return UNIT;
        case 'insert': { mutOK(); var cs2 = Array.from(recv.s); cs2.splice(num(A(0)), 0, dr(A(1)).c); recv.s = cs2.join(''); return UNIT; }
        case 'insert_str': { mutOK(); var cs3 = Array.from(recv.s); cs3.splice(num(A(0)), 0, V.str(A(1))); recv.s = cs3.join(''); return UNIT; }
        case 'truncate': mutOK(); recv.s = Array.from(recv.s).slice(0, num(A(0))).join(''); return UNIT;
        case 'as_str': case 'as_ref': case 'borrow': case 'trim_matches_': return sv;
        case 'to_string': case 'to_owned': case 'into': case 'into_string': return new RS(sv);
        case 'chars': return arrIt(Array.from(sv).map(function (x) { return new Ch(x); }));
        case 'char_indices': { var pos = 0; return arrIt(Array.from(sv).map(function (x) { var t = new Tup([usize(pos), new Ch(x)]); pos += RL.utf8(x).length; return t; })); }
        case 'bytes': case 'as_bytes': case 'into_bytes': { var bs = RL.utf8(sv).map(function (x) { return new I(BigInt(x), 'u8'); }); return name === 'bytes' ? arrIt(bs) : bs; }
        case 'trim': return sv.trim(); case 'trim_start': return sv.replace(/^\s+/, ''); case 'trim_end': return sv.replace(/\s+$/, '');
        case 'to_uppercase': case 'to_ascii_uppercase': return new RS(sv.toUpperCase()); case 'to_lowercase': case 'to_ascii_lowercase': return new RS(sv.toLowerCase());
        case 'contains': { var p = A(0); p = dr(p); if (p instanceof Fn) return Array.from(sv).some(function (ch2) { return truthy(call(ST, p, [new Ch(ch2)], n)); }); return sv.indexOf(V.str(p)) >= 0; }
        case 'starts_with': return sv.indexOf(V.str(A(0))) === 0; case 'ends_with': { var e = V.str(A(0)); return sv.length >= e.length && sv.slice(sv.length - e.length) === e; }
        case 'find': { var fp = dr(A(0)); var ix; if (fp instanceof Fn) { var cs4 = Array.from(sv); ix = -1; var off = 0; for (var qi = 0; qi < cs4.length; qi++) { if (truthy(call(ST, fp, [new Ch(cs4[qi])], n))) { ix = off; break; } off += RL.utf8(cs4[qi]).length; } } else { var ji = sv.indexOf(V.str(fp)); ix = ji < 0 ? -1 : RL.utf8(sv.slice(0, ji)).length; } return ix < 0 ? None() : Some(usize(ix)); }
        case 'replace': return new RS(sv.split(V.str(A(0))).join(V.str(A(1))));
        case 'repeat': { var r = ''; for (var i = 0; i < num(A(0)); i++) r += sv; return new RS(r); }
        case 'split_whitespace': return arrIt(sv.split(/\s+/).filter(Boolean));
        case 'lines': return arrIt(sv.split('\n').filter(function (x, i, a) { return !(i === a.length - 1 && x === ''); }).map(function (x) { return x.replace(/\r$/, ''); }));
        case 'split': { var sp = dr(A(0)); var parts; if (sp instanceof Fn) { parts = []; var cur = ''; Array.from(sv).forEach(function (cc2) { if (truthy(call(ST, sp, [new Ch(cc2)], n))) { parts.push(cur); cur = ''; } else cur += cc2; }); parts.push(cur); } else parts = sv.split(V.str(sp)); return arrIt(parts); }
        case 'splitn': { var lim = num(A(0)), sep = V.str(A(1)), ps = sv.split(sep); if (ps.length > lim) ps = ps.slice(0, lim - 1).concat([ps.slice(lim - 1).join(sep)]); return arrIt(ps); }
        case 'split_once': { var sep2 = V.str(A(0)), k = sv.indexOf(sep2); return k < 0 ? None() : Some(new Tup([sv.slice(0, k), sv.slice(k + sep2.length)])); }
        case 'strip_prefix': { var pf = V.str(A(0)); return sv.indexOf(pf) === 0 ? Some(sv.slice(pf.length)) : None(); }
        case 'strip_suffix': { var sf = V.str(A(0)); return sv.length >= sf.length && sv.slice(sv.length - sf.length) === sf ? Some(sv.slice(0, sv.length - sf.length)) : None(); }
        case 'parse': return parseTo(sv, n.tf && n.tf[0], n);
        case 'get': { var rg = dr(A(0)); if (rg instanceof Range) { var u8 = RL.utf8(sv); var lo = rg.lo ? Number(rg.lo.v) : 0, hi = rg.hi ? Number(rg.hi.v) + (rg.incl ? 1 : 0) : u8.length; if (hi > u8.length || lo > hi || RL.notBoundary(u8, lo) || RL.notBoundary(u8, hi)) return None(); return Some(RL.fromUtf8(u8.slice(lo, hi))); } break; }
        case 'eq_ignore_ascii_case': return sv.toLowerCase() === V.str(A(0)).toLowerCase();
        case 'is_char_boundary': return !RL.notBoundary(RL.utf8(sv), num(A(0)));
        case 'concat': break;
        case 'capacity': return usize(sv.length);
        case 'remove': { mutOK(); var cs5 = Array.from(recv.s); var rc = cs5.splice(num(A(0)), 1)[0]; recv.s = cs5.join(''); return new Ch(rc); }
        case 'matches': { var mp = V.str(A(0)); return arrIt(sv.split(mp).slice(1).map(function () { return mp; })); }
      }
    }
    // Option / Result
    if (recv instanceof Enum && (recv.en === 'Option' || recv.en === 'Result')) {
      var isO = recv.en === 'Option', good = isO ? recv.vn === 'Some' : recv.vn === 'Ok', val = recv.v[0];
      switch (name) {
        case 'is_some': case 'is_ok': return good; case 'is_none': case 'is_err': return !good;
        case 'unwrap': if (good) return val; if (isO) err('panic', 'called `Option::unwrap()` on a `None` value', n); err('panic', 'called `Result::unwrap()` on an `Err` value: ' + V.debug(val), n); break;
        case 'expect': if (good) return val; { var em = V.str(A(0)); if (isO) err('panic', em, n); err('panic', em + ': ' + V.debug(val), n); } break;
        case 'unwrap_or': return good ? val : A(0);
        case 'unwrap_or_else': return good ? val : call(ST, A(0), isO ? [] : [val], n);
        case 'unwrap_or_default': return good ? val : (n.tf && n.tf[0] ? ST.defaultForType(n.tf[0]) : new I(0n, null));
        case 'unwrap_err': if (!good) return val; err('panic', 'called `Result::unwrap_err()` on an `Ok` value: ' + V.debug(val), n); break;
        case 'map': return good ? (isO ? Some(call(ST, A(0), [val], n)) : Ok(call(ST, A(0), [val], n))) : recv;
        case 'map_err': return good ? recv : Er(call(ST, A(0), [val], n));
        case 'and_then': return good ? call(ST, A(0), [val], n) : recv;
        case 'or_else': return good ? recv : call(ST, A(0), isO ? [] : [val], n);
        case 'or': return good ? recv : A(0);
        case 'ok': return good ? Some(val) : None();
        case 'err': return good ? None() : Some(val);
        case 'ok_or': return good ? Ok(val) : Er(A(0));
        case 'ok_or_else': return good ? Ok(val) : Er(call(ST, A(0), [], n));
        case 'filter': return good && truthy(call(ST, A(0), [val], n)) ? recv : None();
        case 'is_some_and': return good && truthy(call(ST, A(0), [val], n));
        case 'as_ref': case 'as_mut': case 'copied': case 'cloned': case 'as_deref': return recv;
        case 'take': { if (recvRaw instanceof Ref) { var old = recvRaw.get(); recvRaw.set(None()); return old; } var pl = ST.getPlace(n.recv, env); ST.checkMutable(n.recv, env, 'borrow'); var o3 = pl.get(); pl.set(None()); return o3; }
        case 'insert': break;
        case 'iter': case 'into_iter': return arrIt(good ? [val] : []);
        case 'zip': { var oz = dr(A(0)); return good && oz.vn === 'Some' ? Some(new Tup([val, oz.v[0]])) : None(); }
        case 'map_or': return good ? call(ST, A(1), [val], n) : A(0);
        case 'get_or_insert_with': break;
        case 'replace': { var pl2 = ST.getPlace(n.recv, env); var o4 = pl2.get(); pl2.set(Some(A(0))); return o4; }
      }
    }
    // Vec / slices / arrays
    if (Array.isArray(recv)) {
      switch (name) {
        case 'len': return usize(recv.length); case 'is_empty': return recv.length === 0;
        case 'push': { mutOK(); recv.push(argMoved(0)); return UNIT; }
        case 'pop': { mutOK(); return recv.length ? Some(recv.pop()) : None(); }
        case 'insert': { mutOK(); var ii = num(A(0)); if (ii > recv.length) err('panic', 'insertion index (is ' + ii + ') should be <= len (is ' + recv.length + ')', n); recv.splice(ii, 0, argMoved(1)); return UNIT; }
        case 'remove': { mutOK(); var ri = num(A(0)); if (ri >= recv.length) err('panic', 'removal index (is ' + ri + ') should be < len (is ' + recv.length + ')', n); return recv.splice(ri, 1)[0]; }
        case 'swap_remove': { mutOK(); var si = num(A(0)); var lastv = recv.pop(); if (si < recv.length) { var rv = recv[si]; recv[si] = lastv; return rv; } return lastv; }
        case 'clear': mutOK(); recv.length = 0; return UNIT;
        case 'truncate': mutOK(); recv.length = Math.min(recv.length, num(A(0))); return UNIT;
        case 'extend': case 'extend_from_slice': case 'append': { mutOK(); var src = args[0]; var other2 = ev(src, env); var it2 = RL.toIter(ST, name === 'append' ? dr(other2) : other2, n); var xs = drain(it2); xs.forEach(function (x) { recv.push(dr(x)); }); if (name === 'append') dr(other2).length = 0; return UNIT; }
        case 'iter': case 'into_iter': return arrIt(recv.slice());
        case 'iter_mut': mutOK(); return elemRefs(recv);
        case 'get': { var gi = dr(A(0)); if (gi instanceof Range) { var lo = gi.lo ? Number(gi.lo.v) : 0, hi = gi.hi ? Number(gi.hi.v) + (gi.incl ? 1 : 0) : recv.length; return hi <= recv.length && lo <= hi ? Some(recv.slice(lo, hi)) : None(); } var g = Number(gi.v); return g >= 0 && g < recv.length ? Some(recv[g]) : None(); }
        case 'get_mut': { mutOK(); var gm = num(A(0)); return gm < recv.length ? Some(new Ref(function () { return recv[gm]; }, function (x) { recv[gm] = x; }, true)) : None(); }
        case 'first': return recv.length ? Some(recv[0]) : None(); case 'last': return recv.length ? Some(recv[recv.length - 1]) : None();
        case 'first_mut': case 'last_mut': { mutOK(); if (!recv.length) return None(); var fi = name === 'first_mut' ? 0 : recv.length - 1; return Some(new Ref(function () { return recv[fi]; }, function (x) { recv[fi] = x; }, true)); }
        case 'contains': { var cv = A(0); return recv.some(function (x) { return V.eq(x, cv); }); }
        case 'reverse': mutOK(); recv.reverse(); return UNIT;
        case 'sort': case 'sort_unstable': mutOK(); recv.sort(function (a, b) { return V.cmp(a, b); }); return UNIT;
        case 'sort_by': case 'sort_unstable_by': { mutOK(); var f2 = A(0); recv.sort(function (a, b) { var o = dr(call(ST, f2, [a, b], n)); return o.vn === 'Less' ? -1 : o.vn === 'Greater' ? 1 : 0; }); return UNIT; }
        case 'sort_by_key': { mutOK(); var f3 = A(0); recv.sort(function (a, b) { return V.cmp(call(ST, f3, [a], n), call(ST, f3, [b], n)); }); return UNIT; }
        case 'dedup': { mutOK(); for (var di = recv.length - 1; di > 0; di--) if (V.eq(recv[di], recv[di - 1])) recv.splice(di, 1); return UNIT; }
        case 'retain': { mutOK(); var f4 = A(0); var keep = recv.filter(function (x) { return truthy(call(ST, f4, [x], n)); }); recv.length = 0; keep.forEach(function (x) { recv.push(x); }); return UNIT; }
        case 'drain': { mutOK(); var dg = dr(A(0)); var dl = dg.lo ? Number(dg.lo.v) : 0, dh = dg.hi ? Number(dg.hi.v) + (dg.incl ? 1 : 0) : recv.length; return arrIt(recv.splice(dl, dh - dl)); }
        case 'swap': { mutOK(); var a1 = num(A(0)), b1 = num(A(1)); if (a1 >= recv.length || b1 >= recv.length) err('panic', 'index out of bounds: the len is ' + recv.length + ' but the index is ' + Math.max(a1, b1), n); var tmp = recv[a1]; recv[a1] = recv[b1]; recv[b1] = tmp; return UNIT; }
        case 'join': { var js = V.str(A(0)); return new RS(recv.map(function (x) { return V.display(x); }).join(js)); }
        case 'concat': return V.str(recv[0]) !== null ? new RS(recv.map(function (x) { return V.str(x); }).join('')) : [].concat.apply([], recv);
        case 'to_vec': case 'into_boxed_slice': return V.clone(recv);
        case 'as_slice': case 'as_ref': case 'as_mut_slice': case 'borrow': return recv;
        case 'windows': { var w = num(A(0)), wr = []; for (var wi = 0; wi + w <= recv.length; wi++) wr.push(recv.slice(wi, wi + w)); return arrIt(wr); }
        case 'chunks': { var ck = num(A(0)), cr = []; for (var ci = 0; ci < recv.length; ci += ck) cr.push(recv.slice(ci, ci + ck)); return arrIt(cr); }
        case 'split_at': { var sa = num(A(0)); return new Tup([recv.slice(0, sa), recv.slice(sa)]); }
        case 'resize': { mutOK(); var nl = num(A(0)), fv = A(1); while (recv.length < nl) recv.push(V.clone(fv)); recv.length = nl; return UNIT; }
        case 'capacity': return usize(recv.length);
        case 'binary_search': { var tv = A(0), lo2 = 0, hi2 = recv.length - 1; while (lo2 <= hi2) { var mid = (lo2 + hi2) >> 1, c2 = V.cmp(recv[mid], tv); if (c2 === 0) return Ok(usize(mid)); if (c2 < 0) lo2 = mid + 1; else hi2 = mid - 1; } return Er(usize(lo2)); }
        case 'starts_with': { var pre = dr(A(0)); return pre.every(function (x, i) { return V.eq(x, recv[i]); }); }
        case 'fill': { mutOK(); var fv2 = A(0); for (var fi2 = 0; fi2 < recv.length; fi2++) recv[fi2] = V.clone(fv2); return UNIT; }
        case 'split_first': return recv.length ? Some(new Tup([recv[0], recv.slice(1)])) : None();
        case 'split_last': return recv.length ? Some(new Tup([recv[recv.length - 1], recv.slice(0, -1)])) : None();
      }
    }
    // Tuples
    if (recv instanceof Tup) { /* no methods */ }
    // Ranges as iterators
    if (recv instanceof Range) {
      if (name === 'contains') { var cv2 = dr(A(0)); return V.cmp(cv2, recv.lo) >= 0 && (recv.incl ? V.cmp(cv2, recv.hi) <= 0 : V.cmp(cv2, recv.hi) < 0); }
      if (name === 'len') return usize(Math.max(0, Number(recv.hi.v - recv.lo.v) + (recv.incl ? 1 : 0)));
      if (name === 'is_empty') return recv.incl ? recv.lo.v > recv.hi.v : recv.lo.v >= recv.hi.v;
      return RL.builtinMethod(ST, RL.toIter(ST, recv, n), name, n, env);
    }
    // HashMap
    if (recv instanceof RMap) {
      switch (name) {
        case 'insert': { mutOK(); var k = argMoved(0), vv = argMoved(1), ks = V.key(k); var prev = recv.m.get(ks); if (prev) { var po = prev[1]; prev[1] = vv; return Some(po); } recv.m.set(ks, [k, vv]); return None(); }
        case 'get': { var e = recv.m.get(V.key(A(0))); return e ? Some(e[1]) : None(); }
        case 'get_mut': { mutOK(); var e2 = recv.m.get(V.key(A(0))); return e2 ? Some(new Ref(function () { return e2[1]; }, function (x) { e2[1] = x; }, true)) : None(); }
        case 'contains_key': return recv.m.has(V.key(A(0)));
        case 'remove': { mutOK(); var ky = V.key(A(0)), e3 = recv.m.get(ky); if (!e3) return None(); recv.m.delete(ky); return Some(e3[1]); }
        case 'len': return usize(recv.m.size); case 'is_empty': return recv.m.size === 0; case 'clear': mutOK(); recv.m.clear(); return UNIT;
        case 'keys': { var kl = []; recv.m.forEach(function (x) { kl.push(x[0]); }); return arrIt(kl); }
        case 'values': { var vl = []; recv.m.forEach(function (x) { vl.push(x[1]); }); return arrIt(vl); }
        case 'values_mut': { mutOK(); var vm = []; recv.m.forEach(function (x) { vm.push(new Ref(function () { return x[1]; }, function (y) { x[1] = y; }, true)); }); return arrIt(vm); }
        case 'iter': case 'into_iter': return RL.toIter(ST, recv, n);
        case 'iter_mut': { mutOK(); return RL.toIter(ST, new Ref(function () { return recv; }, null, true), n); }
        case 'entry': { mutOK(); var ek = argMoved(0); return { entryOf: recv, k: ek }; }
        case 'extend': { mutOK(); drain(RL.toIter(ST, A(0), n)).forEach(function (t) { recv.m.set(V.key(t.a[0]), [t.a[0], t.a[1]]); }); return UNIT; }
      }
    }
    if (recv && recv.entryOf) {
      var mp2 = recv.entryOf, kk = V.key(recv.k), ent = mp2.m.get(kk);
      function slot() { var e5 = mp2.m.get(kk); return new Ref(function () { return e5[1]; }, function (x) { e5[1] = x; }, true); }
      switch (name) {
        case 'or_insert': if (!ent) mp2.m.set(kk, [recv.k, argMoved(0)]); return slot();
        case 'or_insert_with': if (!ent) mp2.m.set(kk, [recv.k, call(ST, A(0), [], n)]); return slot();
        case 'or_default': if (!ent) mp2.m.set(kk, [recv.k, n.tf && n.tf[0] ? ST.defaultForType(n.tf[0]) : new I(0n, null)]); return slot();
        case 'and_modify': if (ent) call(ST, A(0), [slot()], n); return recv;
      }
    }
    if (recv instanceof RSet) {
      switch (name) {
        case 'insert': { mutOK(); var sk = argMoved(0), sks = V.key(sk); if (recv.m.has(sks)) return false; recv.m.set(sks, [sk]); return true; }
        case 'contains': return recv.m.has(V.key(A(0))); case 'remove': mutOK(); return recv.m.delete(V.key(A(0)));
        case 'len': return usize(recv.m.size); case 'is_empty': return recv.m.size === 0;
        case 'iter': case 'into_iter': return RL.toIter(ST, recv, n);
        case 'union': case 'intersection': case 'difference': { var o5 = dr(A(0)), res = []; recv.m.forEach(function (e, ky) { var inO = o5.m.has(ky); if (name === 'union' || (name === 'intersection' ? inO : !inO)) res.push(e[0]); }); if (name === 'union') o5.m.forEach(function (e, ky) { if (!recv.m.has(ky)) res.push(e[0]); }); return arrIt(res); }
      }
    }
    // Box / Rc / RefCell
    if (recvRaw instanceof Rc || recv instanceof RefCell) { /* handled by dr for Rc */ }
    if (recv instanceof RefCell) {
      if (name === 'borrow') { return recv.v; }
      if (name === 'borrow_mut') { var cellv = recv; return new Ref(function () { return cellv.v; }, function (x) { cellv.v = x; }, true); }
      if (name === 'lock') { var cl = recv; return Ok(new Ref(function () { return cl.v; }, function (x) { cl.v = x; }, true)); }
      if (name === 'into_inner') return recv.v;
    }
    if (recv && recv.fmtr) { if (name === 'write_str') { recv.buf += V.str(A(0)); return Ok(UNIT); } if (name === 'write_fmt') return Ok(UNIT); }
    if (recvRaw instanceof Rc && name === 'clone') { return new Rc(recvRaw.box); }
    if (recv && recv.chan) {
      if (name === 'send') { recv.chan.q.push(argMoved(0)); return Ok(UNIT); }
      if (name === 'recv') return recv.chan.q.length ? Ok(recv.chan.q.shift()) : Er(mkErrVal('RecvError', 'receiving on a closed channel'));
      if (name === 'try_recv') return recv.chan.q.length ? Ok(recv.chan.q.shift()) : Er(mkErrVal('Empty', 'receiving on an empty channel'));
      if (name === 'clone') return recv;
      if (name === 'iter' || name === 'into_iter') return new It(function () { return recv.chan.q.length ? recv.chan.q.shift() : undefined; });
    }
    if (recv && recv.handle) { if (name === 'join') return recv.handle.res; }
    if (recv instanceof Fn) { if (name === 'call') return recv.f(args.map(function (a, i) { return A(i); }), n); }
    // Iterators
    if (recv instanceof It) return iterMethod(ST, recv, name, n, env, A, argMoved);
    if (recv instanceof Struct || recv instanceof Enum) {
      if (name === 'iter' || name === 'into_iter') return RL.toIter(ST, recv, n);
      if (name === 'into' || name === 'clone') return recv;
      var ud = ST.findMethod(recv, 'next'); if (ud) return iterMethod(ST, RL.toIter(ST, recv, n), name, n, env, A, argMoved);
    }
    if (name === 'to_string' || name === 'iter') { }
    return NOMETH;
  };
  function iterMethod(ST, it, name, n, env, A, argMoved) {
    function C(f, a) { return ST.callValue(f, a, n); }
    function T(x) { return !!dr(x); }
    switch (name) {
      case 'iter': case 'into_iter': case 'by_ref': return it;
      case 'next': { var x = it.nx(); return x === undefined ? None() : Some(x); }
      case 'map': { var f = A(0); return new It(function () { var x = it.nx(); return x === undefined ? undefined : C(f, [x]); }); }
      case 'filter': { var f2 = A(0); return new It(function () { for (;;) { var x = it.nx(); if (x === undefined) return undefined; if (T(C(f2, [x]))) return x; } }); }
      case 'filter_map': { var f3 = A(0); return new It(function () { for (;;) { var x = it.nx(); if (x === undefined) return undefined; var r = dr(C(f3, [x])); if (r.vn === 'Some') return r.v[0]; } }); }
      case 'flat_map': { var f4 = A(0), cur = null; return new It(function () { for (;;) { if (cur) { var y = cur.nx(); if (y !== undefined) return y; cur = null; } var x = it.nx(); if (x === undefined) return undefined; cur = RL.toIter(ST, C(f4, [x]), n); } }); }
      case 'flatten': { var cur2 = null; return new It(function () { for (;;) { if (cur2) { var y = cur2.nx(); if (y !== undefined) return y; cur2 = null; } var x = it.nx(); if (x === undefined) return undefined; cur2 = RL.toIter(ST, x, n); } }); }
      case 'enumerate': { var i = 0; return new It(function () { var x = it.nx(); return x === undefined ? undefined : new Tup([V.usize(i++), x]); }); }
      case 'zip': { var o = RL.toIter(ST, A(0), n); return new It(function () { var a = it.nx(); if (a === undefined) return undefined; var b = o.nx(); return b === undefined ? undefined : new Tup([a, b]); }); }
      case 'chain': { var o2 = RL.toIter(ST, A(0), n), first = true; return new It(function () { if (first) { var x = it.nx(); if (x !== undefined) return x; first = false; } return o2.nx(); }); }
      case 'rev': { var all = drain(it).reverse(); return arrIt(all); }
      case 'take': { var k = Number(dr(A(0)).v); return new It(function () { if (k <= 0) return undefined; k--; return it.nx(); }); }
      case 'skip': { var s = Number(dr(A(0)).v); return new It(function () { while (s > 0) { s--; if (it.nx() === undefined) return undefined; } return it.nx(); }); }
      case 'step_by': { var st = Number(dr(A(0)).v), first2 = true; return new It(function () { if (first2) { first2 = false; return it.nx(); } for (var q = 0; q < st - 1; q++) if (it.nx() === undefined) return undefined; return it.nx(); }); }
      case 'take_while': { var f5 = A(0), done = false; return new It(function () { if (done) return undefined; var x = it.nx(); if (x === undefined || !T(C(f5, [x]))) { done = true; return undefined; } return x; }); }
      case 'skip_while': { var f6 = A(0), sk = true; return new It(function () { for (;;) { var x = it.nx(); if (x === undefined) return undefined; if (sk && T(C(f6, [x]))) continue; sk = false; return x; } }); }
      case 'peekable': { var buf; return Object.assign(new It(function () { if (buf !== undefined) { var b = buf; buf = undefined; return b; } return it.nx(); }), { peek: function () { if (buf === undefined) buf = it.nx(); return buf; } }); }
      case 'peek': if (it.peek) { var p = it.peek(); return p === undefined ? None() : Some(p); } break;
      case 'cloned': case 'copied': return new It(function () { var x = it.nx(); return x === undefined ? undefined : V.clone(dr(x)); });
      case 'inspect': { var f7 = A(0); return new It(function () { var x = it.nx(); if (x !== undefined) C(f7, [x]); return x; }); }
      case 'cycle': { var items = drain(it), ci = 0; return new It(function () { return items.length ? items[ci++ % items.length] : undefined; }); }
      case 'collect': {
        var xs = drain(it), tt = n.tf && n.tf[0] ? n.tf[0] : null, tn = tt ? tt.name : (n.hintTy ? n.hintTy.name : null);
        if (tn === 'String') return new RS(xs.map(function (x) { return V.display(x); }).join(''));
        if (tn === 'HashMap') { var m = new RMap(); xs.forEach(function (t) { m.m.set(V.key(t.a[0]), [t.a[0], t.a[1]]); }); return m; }
        if (tn === 'HashSet') { var hs = new RSet(); xs.forEach(function (x) { hs.m.set(V.key(x), [x]); }); return hs; }
        if (tn === 'Result' || tn === 'Option') { var vals = []; for (var qi = 0; qi < xs.length; qi++) { var r = dr(xs[qi]); if (r.vn === 'Err' || r.vn === 'None') return r; vals.push(r.v[0]); } return tn === 'Result' ? Ok(vals) : Some(vals); }
        return xs.map(function (x) { return x; });
      }
      case 'sum': case 'product': { var xs2 = drain(it); var isF = xs2.length && dr(xs2[0]) instanceof Fl; var tt2 = n.tf && n.tf[0] ? n.tf[0].name : null; if (isF || tt2 === 'f64') return new Fl(xs2.reduce(function (a, b) { return name === 'sum' ? a + dr(b).v : a * dr(b).v; }, name === 'sum' ? 0 : 1), 'f64'); var acc = name === 'sum' ? 0n : 1n, ty = tt2; xs2.forEach(function (b) { var d = dr(b); ty = ty || d.t; acc = name === 'sum' ? acc + d.v : acc * d.v; }); var bd = V.BOUNDS[ty || 'i32']; if (acc < bd[0] || acc > bd[1]) err('panic', 'attempt to ' + (name === 'sum' ? 'add' : 'multiply') + ' with overflow', n); return new I(acc, ty); }
      case 'count': return V.usize(drain(it).length);
      case 'last': { var l = drain(it); return l.length ? Some(l[l.length - 1]) : None(); }
      case 'nth': { var nn = Number(dr(A(0)).v), v; for (var j = 0; j <= nn; j++) { v = it.nx(); if (v === undefined) return None(); } return Some(v); }
      case 'fold': { var acc2 = argMoved(0), f8 = A(1), x2; while ((x2 = it.nx()) !== undefined) acc2 = C(f8, [acc2, x2]); return acc2; }
      case 'reduce': { var a3 = it.nx(); if (a3 === undefined) return None(); var f9 = A(0), x3; while ((x3 = it.nx()) !== undefined) a3 = C(f9, [a3, x3]); return Some(a3); }
      case 'for_each': { var f10 = A(0), x4; while ((x4 = it.nx()) !== undefined) C(f10, [x4]); return UNIT; }
      case 'any': { var f11 = A(0), x5; while ((x5 = it.nx()) !== undefined) if (T(C(f11, [x5]))) return true; return false; }
      case 'all': { var f12 = A(0), x6; while ((x6 = it.nx()) !== undefined) if (!T(C(f12, [x6]))) return false; return true; }
      case 'find': { var f13 = A(0), x7; while ((x7 = it.nx()) !== undefined) if (T(C(f13, [x7]))) return Some(x7); return None(); }
      case 'find_map': { var f14 = A(0), x8; while ((x8 = it.nx()) !== undefined) { var r2 = dr(C(f14, [x8])); if (r2.vn === 'Some') return r2; } return None(); }
      case 'position': { var f15 = A(0), x9, idx = 0; while ((x9 = it.nx()) !== undefined) { if (T(C(f15, [x9]))) return Some(V.usize(idx)); idx++; } return None(); }
      case 'max': case 'min': { var xs3 = drain(it); if (!xs3.length) return None(); var best = xs3[0]; xs3.forEach(function (x) { var c = V.cmp(x, best); if (name === 'max' ? c >= 0 : c < 0) best = x; }); return Some(best); }
      case 'max_by_key': case 'min_by_key': { var f16 = A(0), xs4 = drain(it); if (!xs4.length) return None(); var bst = xs4[0], bk = C(f16, [bst]); xs4.forEach(function (x) { var k2 = C(f16, [x]); var c = V.cmp(k2, bk); if (name === 'max_by_key' ? c >= 0 : c < 0) { bst = x; bk = k2; } }); return Some(bst); }
      case 'max_by': case 'min_by': { var f17 = A(0), xs5 = drain(it); if (!xs5.length) return None(); var b5 = xs5[0]; xs5.forEach(function (x) { var o = dr(C(f17, [x, b5])); var c = o.vn === 'Less' ? -1 : o.vn === 'Greater' ? 1 : 0; if (name === 'max_by' ? c >= 0 : c < 0) b5 = x; }); return Some(b5); }
      case 'unzip': { var xs6 = drain(it); return new Tup([xs6.map(function (t) { return t.a[0]; }), xs6.map(function (t) { return t.a[1]; })]); }
      case 'partition': { var f18 = A(0), xs7 = drain(it), yes = [], no = []; xs7.forEach(function (x) { (T(C(f18, [x])) ? yes : no).push(x); }); return new Tup([yes, no]); }
      case 'windows': case 'len': { return V.usize(drain(it).length); }
    }
    return NOMETH;
  }
  // ---- associated functions / paths ----
  RL.builtinConst = function (ST, segs, n) {
    var last = segs[segs.length - 1], ty = segs[segs.length - 2];
    if (V.isIntT(ty)) { if (last === 'MAX') return new I(V.BOUNDS[ty][1], ty); if (last === 'MIN') return new I(V.BOUNDS[ty][0], ty); if (last === 'BITS') return new I(BigInt(ty.replace(/\D/g, '') || 64), 'u32'); }
    if (ty === 'f64' || ty === 'f32') { var c = { MAX: Number.MAX_VALUE, MIN: -Number.MAX_VALUE, EPSILON: Number.EPSILON, INFINITY: Infinity, NEG_INFINITY: -Infinity, NAN: NaN }[last]; if (c !== undefined) return new Fl(c, ty); }
    if (ty === 'consts') { var k = { PI: Math.PI, E: Math.E, TAU: 2 * Math.PI, SQRT_2: Math.SQRT2, LN_2: Math.LN2 }[last]; if (k !== undefined) return new Fl(k, segs[segs.length - 3] === 'f32' ? 'f32' : 'f64'); }
    if (ty === 'Ordering') return new Enum('Ordering', last, []);
    if (segs.length >= 2 && (ty === 'String' || ty === 'Vec' || ty === 'Box' || ty === 'Rc' || ty === 'Arc' || ty === 'HashMap' || ty === 'HashSet' || ty === 'Some' || ty === 'Option' || ty === 'Result' || ty === 'RefCell' || ty === 'Mutex' || ty === 'Cell' || ty === 'thread' || ty === 'mpsc' || ty === 'mem' || ty === 'char' || ty === 'u8' || ty === 'str' || ty === 'process' || ty === 'cmp' || ty === 'iter')) return new Fn(function (a, nd) { return RL.builtinCallPath(ST, segs, a, nd || n); }, last);
    return NOMETH;
  };
  RL.builtinFn = function (ST, segs, n, env) {
    var args;
    var last = segs[segs.length - 1], ty = segs[segs.length - 2];
    var known = ty === undefined || ['String', 'Vec', 'Box', 'Rc', 'Arc', 'HashMap', 'HashSet', 'Option', 'Result', 'RefCell', 'Mutex', 'Cell', 'thread', 'mpsc', 'mem', 'char', 'str', 'process', 'cmp', 'iter', 'Default', 'From', 'f64', 'f32', 'i32', 'u8', 'u32', 'u64', 'i64', 'usize', 'isize', 'i8', 'i16', 'u16', 'i128', 'u128', 'BTreeMap', 'VecDeque', 'fmt', 'io', 'env', 'time', 'Instant', 'Duration'].indexOf(ty) >= 0;
    if (ty === undefined && ['drop', 'min', 'max', 'swap', 'spawn', 'channel'].indexOf(last) < 0) return NOMETH;
    if (!known) return NOMETH;
    args = n.args.map(function (a) { return ST.ev(a, env); });
    // moves for owned args
    n.args.forEach(function (a, i) { if (a.k === 'path' && a.segs.length === 1 && !(last === 'clone' && (ty === 'Rc' || ty === 'Arc'))) { var c = env.find(a.segs[0]); if (c && !(c.v instanceof Ref) && !V.isCopy(c.v) && ['from', 'new', 'swap', 'replace', 'take', 'spawn', 'send'].indexOf(last) >= 0 && !(ty === 'mem' && (last === 'swap' || last === 'replace' || last === 'take'))) c.moved = { line: a.line, col: a.col, why: 'value moved here' }; } });
    return RL.builtinCallPath(ST, segs, args, n);
  };
  RL.builtinCallPath = function (ST, segs, a, n) {
    var last = segs[segs.length - 1], ty = segs[segs.length - 2] || '';
    function A(i) { return a[i]; }
    switch (ty + '::' + last) {
      case 'String::new': return new RS(''); case 'String::from': case 'String::from_str': { var s = V.str(A(0)); if (s === null) RL.err('E0277', 'the trait bound `String: From<' + V.typeName(A(0)) + '>` is not satisfied', n); return new RS(s); }
      case 'String::with_capacity': return new RS(''); case 'String::from_utf8': return Ok(new RS(RL.fromUtf8(dr(A(0)).map(function (x) { return Number(x.v); })))); case 'String::from_utf8_lossy': return new RS(RL.fromUtf8(dr(A(0)).map(function (x) { return Number(x.v); })));
      case 'Vec::new': case 'Vec::with_capacity': case 'VecDeque::new': return []; case 'Vec::from': return V.clone(dr(A(0)));
      case 'HashMap::new': case 'HashMap::with_capacity': case 'BTreeMap::new': return new RMap(); case 'HashSet::new': return new RSet();
      case 'HashMap::from': { var m = new RMap(); dr(A(0)).forEach(function (t) { m.m.set(V.key(t.a[0]), [t.a[0], t.a[1]]); }); return m; }
      case 'Box::new': return new Bx(A(0));
      case 'Rc::new': case 'Arc::new': ST.usesRc = true; return new Rc({ v: A(0), n: 0 });
      case 'Rc::clone': case 'Arc::clone': { var r = a[0] instanceof Ref ? a[0].get() : a[0]; return new Rc(r.box); }
      case 'Rc::strong_count': case 'Arc::strong_count': { var rr = dr1(A(0)); return V.usize(rr.box.n); }
      case 'Rc::ptr_eq': case 'Arc::ptr_eq': return dr1(A(0)).box === dr1(A(1)).box;
      case 'RefCell::new': case 'Mutex::new': case 'Cell::new': return new RefCell(A(0));
      case 'Option::Some': return Some(A(0));
      case 'mem::swap': { var x = A(0), y = A(1); var t = x.get(); x.set(y.get()); y.set(t); return UNIT; }
      case 'mem::replace': { var old = A(0).get(); A(0).set(A(1)); return old; }
      case 'mem::take': { var o2 = A(0).get(); A(0).set(ST.defaultForType ? defFor(o2) : o2); return o2; }
      case 'thread::spawn': { var res = Ok(ST.callValue(A(0), [], n)); return { handle: { res: res } }; }
      case 'mpsc::channel': { var ch = { q: [] }; return new Tup([{ chan: ch }, { chan: ch }]); }
      case 'char::from_u32': return Some(new Ch(String.fromCodePoint(Number(dr(A(0)).v)))); case 'char::from_digit': return Some(new Ch(Number(dr(A(0)).v).toString(Number(dr(A(1)).v)))); case 'char::from': return new Ch(String.fromCodePoint(Number(dr(A(0)).v)));
      case 'process::exit': throw { exit: Number(dr(A(0)).v) };
      case 'cmp::max': return V.cmp(A(0), A(1)) >= 0 ? A(0) : A(1); case 'cmp::min': return V.cmp(A(0), A(1)) <= 0 ? A(0) : A(1);
      case 'iter::repeat': { var rv = A(0); return new It(function () { return V.clone(rv); }); }
      case 'str::from_utf8': return Ok(RL.fromUtf8(dr(A(0)).map(function (x) { return Number(x.v); })));
      case 'Default::default': return new I(0n, null);
    }
    if (ty === 'f64' || ty === 'f32' || V.isIntT(ty)) {
      if (last === 'from') { var v = dr(A(0)); if (ty[0] === 'f') return new Fl(Number(v.v), ty); return new I(v.v !== undefined ? BigInt(v.v) : 0n, ty); }
      if (last === 'sqrt' || last === 'abs' || last === 'max' || last === 'min' || last === 'pow') return RL.builtinMethod(ST, A(0), last, { args: a.slice(1).map(function (x) { return { k: 'lit_', v: x }; }), recv: n.recv, line: n.line, col: n.col }, new ST.Scope(null));
    }
    if (ty === 'i32' || ty === 'u8' || ty === 'u32' || ty === 'u64' || ty === 'i64' || ty === 'usize') { if (last === 'from_str_radix') { var pr = parseInt(V.str(A(0)), Number(dr(A(1)).v)); return isNaN(pr) ? Er(new V.ErrVal('ParseIntError { kind: InvalidDigit }', 'invalid digit found in string')) : Ok(new I(BigInt(pr), ty)); } }
    if (last === 'drop') return UNIT;
    if (last === 'from' && (ty === 'Option' || ty === 'Result')) return A(0);
    if (last === 'from' || last === 'new') return A(0);
    if (ty === 'Default' || last === 'default') return new I(0n, null);
    return NOMETH;
  };
  function dr1(v) { return v instanceof Ref ? v.get() : v; }
  function defFor(o) { if (Array.isArray(o)) return []; if (o instanceof RS) return new RS(''); if (o instanceof I) return new I(0n, o.t); if (o instanceof Fl) return new Fl(0, o.t); if (o instanceof Enum && o.en === 'Option') return None(); return o; }
})();

/* Rust Lab core, part 6: static checks (borrow conflicts, lifetimes, exhaustiveness, threads). */
(function () {
  var RustError = RL.RustError;
  function E(code, msg, node, extra) { throw new RustError(code, msg, node.line, node.col, extra); }
  var SKIP = { line: 1, col: 1, k: 1, endLine: 1, endCol: 1 };
  function walk(n, f, parent) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(function (x) { walk(x, f, parent); }); return; }
    if (n.k && f(n, parent) === false) return;
    for (var key in n) { if (SKIP[key]) continue; var v = n[key]; if (v && typeof v === 'object') walk(v, f, n.k ? n : parent); }
  }
  function rootOf(n) { while (n) { if (n.k === 'path') return n.segs.length === 1 ? n.segs[0] : null; if (n.k === 'field' || n.k === 'tfield' || n.k === 'index' || n.k === 'paren') n = n.e; else return null; } return null; }
  function rootNode(n) { while (n && n.k !== 'path') { if (n.k === 'field' || n.k === 'tfield' || n.k === 'index' || n.k === 'paren') n = n.e; else return null; } return n; }
  var MUTM = { push: 1, pop: 1, insert: 1, remove: 1, clear: 1, sort: 1, reverse: 1, extend: 1, truncate: 1, push_str: 1, retain: 1, drain: 1, dedup: 1, append: 1, swap: 1, sort_by: 1, sort_by_key: 1, iter_mut: 1, entry: 1, get_mut: 1, resize: 1, swap_remove: 1 };
  var BORROWY = { first: 1, last: 1, get: 1, iter: 1, as_str: 1, as_slice: 1, keys: 1, values: 1, chars: 1, split_whitespace: 1, trim: 1, unwrap: 1, expect: 1, as_ref: 1, lines: 1, split: 1, bytes: 1 };
  var userMut = {};
  function lenOf(n) { return n.k === 'path' ? n.segs.join('::').length : n.k === 'ref' ? 1 : n.k === 'mcall' ? n.name.length : 1; }
  function srcSlice(lines, n, len) { return n; }
  // collect accesses to variable `name` inside a statement
  function accesses(stmt, name) {
    var found = [], seen = new Set();
    walk(stmt, function (n) {
      if (n.k === 'ref') { var r = rootOf(n.e); if (r === name) { found.push({ kind: n.mut ? 'mutref' : 'ref', node: n }); var rn = rootNode(n.e); if (rn) seen.add(rn); } }
      else if (n.k === 'assign') { var r2 = rootOf(n.l); if (r2 === name) { found.push({ kind: 'assign', node: n }); var rn2 = rootNode(n.l); if (rn2) seen.add(rn2); } }
      else if (n.k === 'mcall') { var r3 = rootOf(n.recv); if (r3 === name && (MUTM[n.name] || userMut[n.name])) { found.push({ kind: 'mutcall', node: n }); var rn3 = rootNode(n.recv); if (rn3) seen.add(rn3); } }
      else if (n.k === 'path' && n.segs.length === 1 && n.segs[0] === name && !seen.has(n)) found.push({ kind: 'read', node: n });
    });
    return found;
  }
  function mentions(stmt, name) { var c = 0; walk(stmt, function (n) { if (n.k === 'path' && n.segs.length === 1 && n.segs[0] === name) c++; else if (n.k === 'macro' && false) { } }); if (stmt && stmt.k === 'macro') { } return c; }
  function mentionsFmt(stmt, name) {
    var c = mentions(stmt, name);
    // inline format args `{name}`
    walk(stmt, function (n) { if (n.k === 'macro' && n.args.length && n.args[0].k === 'str') { var re = new RegExp('\\{' + name + '(?::[^}]*)?\\}'); if (re.test(n.args[0].v)) c++; } });
    return c;
  }
  function borrowInfo(init) {
    // returns {root, mut, node} if init creates a reference to a place
    var n = init; while (n && n.k === 'paren') n = n.e;
    if (!n) return null;
    if (n.k === 'ref') { var r = rootOf(n.e); if (r) return { root: r, mut: n.mut, node: n }; }
    if (n.k === 'mcall') {
      var c = n, ok = true; while (c.k === 'mcall') { if (!BORROWY[c.name] && !(MUTM[c.name] && c.name === 'iter_mut')) { ok = false; break; } c = c.recv; }
      if (ok) { var r2 = rootOf(c); if (r2) { var isMut = false; var q = n; while (q.k === 'mcall') { if (q.name === 'iter_mut') isMut = true; q = q.recv; } return { root: r2, mut: isMut, node: n, viaMethod: true }; } }
    }
    return null;
  }
  function checkBlockBorrows(block, lines, declared) {
    var stmts = block.stmts.slice(); if (block.tail) stmts.push({ k: 'exprstmt', e: block.tail, line: block.tail.line, col: block.tail.col });
    stmts.forEach(function (s, i) {
      if (s.k !== 'let' || !s.init || s.pat.k !== 'pid') return;
      var b = borrowInfo(s.init); if (!b) return;
      var rname = s.pat.name;
      var lastUse = -1;
      for (var j = i + 1; j < stmts.length; j++) { if (stmts[j].k === 'let' && stmts[j].pat.k === 'pid' && stmts[j].pat.name === rname) { if (mentionsFmt(stmts[j].init, rname)) lastUse = j; break; } if (mentionsFmt(stmts[j], rname)) lastUse = j; }
      if (lastUse < 0) return;
      var usePos = null; walk(stmts[lastUse], function (n) { if (!usePos && n.k === 'path' && n.segs.length === 1 && n.segs[0] === rname) usePos = n; });
      if (!usePos) { var m = stmts[lastUse]; usePos = { line: m.line, col: m.col }; walk(m, function (n) { if (n.k === 'macro' && n.args.length && n.args[0].k === 'str' && new RegExp('\\{' + rname + '(?::[^}]*)?\\}').test(n.args[0].v)) { var idx = lines[n.line - 1].indexOf('{' + rname); usePos = { line: n.line, col: idx >= 0 ? idx + 2 : n.col, len: rname.length }; } }); }
      for (var j2 = i + 1; j2 < lastUse; j2++) {
        var acc = accesses(stmts[j2], b.root);
        for (var a = 0; a < acc.length; a++) {
          var ac = acc[a], bad = null;
          if (b.mut) { if (ac.kind === 'mutref' || ac.kind === 'mutcall') bad = 'E0499'; else if (ac.kind === 'ref' || ac.kind === 'read') bad = 'E0502m'; else if (ac.kind === 'assign') bad = 'E0506'; }
          else { if (ac.kind === 'mutref' || ac.kind === 'mutcall') bad = 'E0502'; else if (ac.kind === 'assign') bad = 'E0506'; }
          if (!bad) continue;
          var an = ac.kind === 'mutcall' ? ac.node.recv : ac.node; var rn = rootNode(ac.kind === 'assign' ? ac.node.l : ac.kind === 'mutcall' ? ac.node.recv : ac.kind === 'read' ? ac.node : ac.node.e) || an;
          var bnode = b.node.k === 'ref' ? b.node : (rootNode(b.node.k === 'mcall' ? (function () { var q = b.node; while (q.k === 'mcall') q = q.recv; return q; })() : b.node) || b.node);
          var bl = b.node.k === 'ref' ? 1 + (b.mut ? 4 : 0) + (function () { var t = rootOf(b.node.e) ? exprLen(b.node.e) : 1; return t; })() : exprLen(b.node);
          var L = [{ line: bnode.line, col: bnode.col, len: bl, text: (b.mut ? 'mutable' : 'immutable') + ' borrow occurs here' }];
          var conflictLen = ac.kind === 'mutref' ? 5 + exprLen(ac.node.e) : ac.kind === 'mutcall' ? exprLen(ac.node.recv) + 1 + ac.node.name.length + 2 : ac.kind === 'ref' ? 1 + exprLen(ac.node.e) : ac.kind === 'assign' ? exprLen(ac.node.l) + 3 : b.root.length;
          var cpos = ac.kind === 'mutcall' ? rn : ac.node.k === 'ref' || ac.node.k === 'assign' ? ac.node : rn;
          if (bad === 'E0499') L.push({ line: cpos.line, col: cpos.col, len: conflictLen, primary: true, text: 'second mutable borrow occurs here' });
          else if (bad === 'E0506') L.push({ line: cpos.line, col: cpos.col, len: conflictLen, primary: true, text: '`' + b.root + '` is assigned to here but it was already borrowed' });
          else L.push({ line: cpos.line, col: cpos.col, len: conflictLen, primary: true, text: (b.mut ? 'immutable' : 'mutable') + ' borrow occurs here' });
          L.push({ line: usePos.line, col: usePos.col, len: usePos.len || rname.length, text: (b.mut ? 'first' : (bad === 'E0499' ? 'first' : 'immutable')) + ' borrow later used here' });
          if (bad === 'E0499') L[0].text = 'first mutable borrow occurs here';
          if (bad === 'E0506') L[0].text = '`' + b.root + '` is borrowed here';
          var msg = bad === 'E0499' ? 'cannot borrow `' + b.root + '` as mutable more than once at a time' : bad === 'E0506' ? 'cannot assign to `' + b.root + '` because it is borrowed' : bad === 'E0502m' ? 'cannot borrow `' + b.root + '` as immutable because it is also borrowed as mutable' : 'cannot borrow `' + b.root + '` as mutable because it is also borrowed as immutable';
          E(bad === 'E0502m' ? 'E0502' : bad, msg, cpos, { labels: L, help: bad === 'E0499' || bad === 'E0502' || bad === 'E0502m' ? 'a reference stays alive until its last use; use `' + rname + '` before the conflicting access, or end its use sooner' : null });
        }
      }
    });
  }
  function exprLen(n) { switch (n.k) { case 'path': return n.segs.join('::').length; case 'field': return exprLen(n.e) + 1 + n.name.length; case 'tfield': return exprLen(n.e) + 1 + String(n.idx).length; case 'index': return exprLen(n.e) + 2 + exprLen(n.idx); case 'int': return String(n.v).length; case 'paren': return exprLen(n.e) + 2; case 'mcall': return exprLen(n.recv) + 1 + n.name.length + 2; } return 1; }
  function checkDangling(block, lines) {
    var stmts = block.stmts;
    stmts.forEach(function (s, i) {
      if (s.k !== 'let' || s.init || s.pat.k !== 'pid') return;
      var r = s.pat.name;
      for (var j = i + 1; j < stmts.length; j++) {
        var st = stmts[j];
        if (st.k === 'exprstmt' && st.e.k === 'block') {
          var inner = st.e, declared = {};
          inner.stmts.forEach(function (x) { if (x.k === 'let' && x.pat.k === 'pid') declared[x.pat.name] = x.pat; });
          inner.stmts.concat(inner.tail ? [{ k: 'exprstmt', e: inner.tail }] : []).forEach(function (x) {
            if (x.k === 'exprstmt' && x.e.k === 'assign' && x.e.op === '=' && x.e.l.k === 'path' && x.e.l.segs[0] === r && x.e.r.k === 'ref') {
              var tgt = rootOf(x.e.r.e);
              if (tgt && declared[tgt]) {
                var after = null; for (var q = j + 1; q < stmts.length && !after; q++) { walk(stmts[q], function (n) { if (!after && n.k === 'path' && n.segs.length === 1 && n.segs[0] === r) after = n; }); }
                if (!after) { walk(block.tail, function (n) { if (!after && n.k === 'path' && n.segs.length === 1 && n.segs[0] === r) after = n; }); }
                if (after) E('E0597', '`' + tgt + '` does not live long enough', x.e.r, { labels: [{ line: declared[tgt].line, col: declared[tgt].col, len: tgt.length, text: 'binding `' + tgt + '` declared here' }, { line: x.e.r.line, col: x.e.r.col, len: 1 + exprLen(x.e.r.e), primary: true, text: 'borrowed value does not live long enough' }, { line: inner.endLine, col: inner.endCol, len: 1, text: '`' + tgt + '` dropped here while still borrowed' }, { line: after.line, col: after.col, len: r.length, text: 'borrow later used here' }] });
              }
            }
          });
        }
      }
    });
  }
  function countRefs(t) { if (!t) return 0; switch (t.k) { case 'tref': return 1 + countRefs(t.to); case 'ttuple': return t.items.reduce(function (a, b) { return a + countRefs(b); }, 0); case 'tarray': case 'tslice': return countRefs(t.el); case 'tpath': return (t.args || []).reduce(function (a, b) { return a + countRefs(b); }, 0); } return 0; }
  function unnamedRef(t) { if (!t) return null; switch (t.k) { case 'tref': return t.lt ? unnamedRef(t.to) : t; case 'ttuple': for (var i = 0; i < t.items.length; i++) { var r = unnamedRef(t.items[i]); if (r) return r; } return null; case 'tarray': case 'tslice': return unnamedRef(t.el); case 'tpath': for (var j = 0; j < (t.args || []).length; j++) { var r2 = unnamedRef(t.args[j]); if (r2) return r2; } return null; } return null; }
  function namedLts(t, out) { if (!t) return; if (t.k === 'tref') { if (t.lt) out.push({ n: t.lt, t: t }); namedLts(t.to, out); } else if (t.k === 'ttuple') t.items.forEach(function (x) { namedLts(x, out); }); else if (t.k === 'tarray' || t.k === 'tslice') namedLts(t.el, out); else if (t.k === 'tpath') (t.args || []).forEach(function (x) { namedLts(x, out); }); }
  function checkFnSig(f, lines) {
    var un = unnamedRef(f.ret);
    if (un) {
      var nrefs = f.params.reduce(function (a, p) { return a + countRefs(p.ty); }, 0);
      var selfRef = f.selfKind === 'ref' || f.selfKind === 'mut';
      if (!selfRef && nrefs !== 1) {
        var names = f.params.filter(function (p) { return countRefs(p.ty) > 0; }).map(function (p) { return p.pat.name; });
        var help = nrefs === 0 ? 'this function\'s return type contains a borrowed value, but there is no value for it to be borrowed from; consider using the `\'static` lifetime, or returning an owned value instead' : 'this function\'s return type contains a borrowed value, but the signature does not say whether it is borrowed from ' + names.map(function (x) { return '`' + x + '`'; }).join(' or ') + '; consider introducing a named lifetime parameter: `fn ' + f.name + '<\'a>(' + f.params.map(function (p) { return p.pat.name + ': ' + (countRefs(p.ty) ? '&\'a ' + RL.typeStr(p.ty.to || p.ty) : RL.typeStr(p.ty)); }).join(', ') + ') -> &\'a ' + RL.typeStr(f.ret.to || f.ret) + '`';
        E('E0106', 'missing lifetime specifier', un, { labels: [{ line: un.line, col: un.col, len: 1, primary: true, text: 'expected named lifetime parameter' }], help: help });
      }
    }
    var used = []; namedLts(f.ret, used); f.params.forEach(function (p) { namedLts(p.ty, used); });
    used.forEach(function (u) { if (u.n !== "'static" && u.n !== 'static' && (f.lts || []).indexOf(u.n) < 0) E('E0261', 'use of undeclared lifetime name `' + (u.n[0] === "'" ? u.n : "'" + u.n) + '`', u.t, { labels: [{ line: u.t.line, col: u.t.col, len: 1 + (u.n.length), primary: true, text: 'undeclared lifetime' }], help: 'consider introducing lifetime `' + (u.n[0] === "'" ? u.n : "'" + u.n) + '` here: `<' + (u.n[0] === "'" ? u.n : "'" + u.n) + '>`' }); });
    if (f.body && f.ret && f.ret.k === 'tref') {
      var locals = {}; f.body.stmts.forEach(function (s) { if (s.k === 'let' && s.pat.k === 'pid') locals[s.pat.name] = s.pat; });
      var t = f.body.tail;
      if (t && t.k === 'ref' && rootOf(t.e) && locals[rootOf(t.e)]) E('E0515', 'cannot return reference to local variable `' + rootOf(t.e) + '`', t, { labels: [{ line: t.line, col: t.col, len: 1 + exprLen(t.e), primary: true, text: 'returns a reference to data owned by the current function' }] });
    }
  }
  function checkMatches(ast, enums) {
    walk(ast, function (n) {
      if (n.k !== 'match') return;
      var arms = n.arms.filter(function (a) { return !a.guard; });
      var catchAll = n.arms.some(function (a) { return !a.guard && (function c(p) { return p.k === 'pwild' || (p.k === 'pid') || (p.k === 'por' && p.alts.some(c)) || (p.k === 'pbind' && c(p.p)); })(a.pat); });
      if (catchAll) return;
      var enumName = null, covered = {}, anyLit = false;
      function visit(p) {
        if (p.k === 'por') { p.alts.forEach(visit); return; }
        if (p.k === 'pref') { visit(p.p); return; }
        if (p.k === 'pvar') {
          var last = p.path[p.path.length - 1], en = p.path.length > 1 ? p.path[p.path.length - 2] : (last === 'Some' || last === 'None' ? 'Option' : last === 'Ok' || last === 'Err' ? 'Result' : null);
          if (en) enumName = enumName || en; covered[last] = true;
        } else if (p.k === 'plit' || p.k === 'prange') anyLit = true;
      }
      arms.forEach(function (a) { visit(a.pat); });
      var variants = null;
      if (enumName === 'Option') variants = ['Some', 'None']; else if (enumName === 'Result') variants = ['Ok', 'Err']; else if (enumName && enums[enumName]) variants = enums[enumName].variants.map(function (v) { return v.name; });
      if (variants) {
        var miss = variants.filter(function (v) { return !covered[v]; });
        if (miss.length) {
          var pr = function (v) { var d = enums[enumName] && enums[enumName].variants.filter(function (x) { return x.name === v; })[0]; var base = (enumName === 'Option' || enumName === 'Result' ? '' : enumName + '::') + v; if (enumName === 'Option' && v === 'Some' || enumName === 'Result') return base + '(_)'; if (d && d.kind === 'tuple') return base + '(' + d.tys.map(function () { return '_'; }).join(', ') + ')'; if (d && d.kind === 'struct') return base + ' { .. }'; return base; };
          var list = miss.map(function (v) { return '`' + pr(v) + '`'; });
          var txt = list.length === 1 ? list[0] : list.length === 2 ? list.join(' and ') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
          E('E0004', 'non-exhaustive patterns: ' + txt + ' not covered', n.e, { labels: [{ line: n.e.line, col: n.e.col, len: n.e.k === 'path' ? n.e.segs.join('::').length : 1, primary: true, text: (list.length === 1 ? 'pattern ' : 'patterns ') + txt + ' not covered' }], help: 'ensure that all possible cases are being handled by adding a match arm with a wildcard pattern' + (miss.length === 1 ? ' or an explicit pattern as shown' : ', or multiple match arms') });
        }
      } else if (anyLit) E('E0004', 'non-exhaustive patterns: `_` not covered', n.e, { labels: [{ line: n.e.line, col: n.e.col, len: 1, primary: true, text: 'pattern `_` not covered' }], help: 'ensure that all possible cases are being handled by adding a match arm with a wildcard pattern: `_ => todo!()`' });
    });
  }
  function checkThreads(fnNode) {
    var rcVars = {}, locals = {};
    walk(fnNode.body, function (n) {
      if (n.k === 'let' && n.pat.k === 'pid') { locals[n.pat.name] = true; var i = n.init; if (i && i.k === 'call' && i.f.k === 'path' && i.f.segs[0] === 'Rc') rcVars[n.pat.name] = true; }
    });
    fnNode.params.forEach(function (p) { if (p.pat.k === 'pid') locals[p.pat.name] = true; });
    walk(fnNode.body, function (n) {
      if (n.k === 'call' && n.f.k === 'path' && n.f.segs.join('::').replace(/^std::/, '') === 'thread::spawn' && n.args[0] && n.args[0].k === 'closure') {
        var cl = n.args[0], names = {}, own = {};
        cl.params.forEach(function (p) { if (p.pat.k === 'pid') own[p.pat.name] = true; });
        walk(cl.body, function (m) { if (m.k === 'let' && m.pat.k === 'pid') own[m.pat.name] = true; if (m.k === 'path' && m.segs.length === 1 && !names[m.segs[0]]) names[m.segs[0]] = m; if (m.k === 'macro' && m.args.length && m.args[0].k === 'str') { var re = /\{(\w+)(?::[^}]*)?\}/g, mm; while ((mm = re.exec(m.args[0].v))) if (!names[mm[1]]) names[mm[1]] = m; } });
        for (var k in names) { if (own[k] || !locals[k]) continue;
          if (rcVars[k]) E('E0277', '`Rc<_>` cannot be sent between threads safely', cl, { labels: [{ line: cl.line, col: cl.col, len: 1, primary: true, text: '`Rc<_>` cannot be sent between threads safely' }], help: 'the trait `Send` is not implemented for `Rc<_>`; use `Arc` (atomic reference counting) instead' });
        }
        if (!cl.move) { for (var k2 in names) { if (!own[k2] && locals[k2]) E('E0373', 'closure may outlive the current function, but it borrows `' + k2 + '`, which is owned by the current function', cl, { labels: [{ line: cl.line, col: cl.col, len: 2, primary: true, text: 'may outlive borrowed value `' + k2 + '`' }, { line: names[k2].line, col: names[k2].col, len: k2.length, text: '`' + k2 + '` is borrowed here' }], help: 'to force the closure to take ownership of `' + k2 + '` (and any other referenced variables), use the `move` keyword: `move ||`' }); } }
      }
    });
  }
  RL.check = function (ast, lines) {
    var enums = {};
    function collect(items) { items.forEach(function (it) { if (it.k === 'enum') enums[it.name] = it; if (it.k === 'mod') collect(it.items); if (it.k === 'impl') it.items.forEach(function (f) { if (f.k === 'fn' && f.selfKind === 'mut') userMut[f.name] = 1; }); }); }
    userMut = {}; collect(ast.items);
    function fnsOf(items, out) { items.forEach(function (it) { if (it.k === 'fn') out.push(it); else if (it.k === 'impl') it.items.forEach(function (f) { if (f.k === 'fn') out.push(f); }); else if (it.k === 'trait') it.items.forEach(function (f) { if (f.k === 'fn') out.push(f); }); else if (it.k === 'mod') fnsOf(it.items, out); }); return out; }
    var all = fnsOf(ast.items, []);
    ast.items.forEach(function (it) { if (it.k === 'struct' && it.fields) { var gl = it.gen || []; it.fields.forEach(function (f) { var un = unnamedRef(f.ty); if (un) E('E0106', 'missing lifetime specifier', un, { labels: [{ line: un.line, col: un.col, len: 1, primary: true, text: 'expected named lifetime parameter' }], help: 'consider introducing a named lifetime parameter: `struct ' + it.name + '<\'a>` with `&\'a ' + RL.typeStr(un.to) + '`' }); }); } });
    all.forEach(function (f) { checkFnSig(f, lines); });
    all.forEach(function (f) {
      if (!f.body) return;
      walk(f.body, function (n) { if (n.k === 'block') { checkBlockBorrows(n, lines); checkDangling(n, lines); } });
      checkThreads(f);
    });
    checkMatches(ast, enums);
  };
})();

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

if (typeof module!=="undefined") module.exports=RL;
