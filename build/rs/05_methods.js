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
