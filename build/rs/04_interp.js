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
