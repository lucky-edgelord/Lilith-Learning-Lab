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
