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
      var tnm = v instanceof Struct ? v.st : v.en, dd = V.derives[tnm];
      if (dd && dd.indexOf('Debug') < 0 && dd.indexOf('impl:Debug') < 0 || (!dd && V.enumDefs && V.enumDefs[tnm] !== undefined && tnm !== 'Ordering')) throw new RL.RustError('E0277', '`' + tnm + '` doesn\'t implement `Debug`', 0, 0, { help: 'the trait `Debug` is not implemented for `' + tnm + '`; add `#[derive(Debug)]` to the ' + (v instanceof Struct ? 'struct' : 'enum') + ' `' + tnm + '` or manually `impl Debug for ' + tnm + '`' });
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
