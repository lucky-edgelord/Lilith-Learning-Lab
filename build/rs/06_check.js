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
