/* C64 Lab machine layer: a small wrapper around c64.wasm (from c64-ready, MIT; core based on lvllvl c64.js).
   Works in the browser and in node. API: C64M.boot(wasmBytes) -> Promise<machine>. */
var C64M = (function () {
  var DYNAMICTOP_PTR = 5583504, DYNAMIC_BASE = 10826544, W = 384, H = 272;
  // keyboard matrix indices used by keyboard_keyPressed
  var K = { LEFTARROW: 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '0': 10, '+': 11, '-': 12, POUND: 13, HOME: 14, DEL: 15, CTRL: 16,
    Q: 17, W: 18, E: 19, R: 20, T: 21, Y: 22, U: 23, I: 24, O: 25, P: 26, '@': 27, '*': 28, UPARROW: 29, STOP: 30, A: 31, S: 32, D: 33, F: 34, G: 35, H: 36, J: 37, K: 38, L: 39,
    ':': 40, ';': 41, '=': 42, RETURN: 43, CBM: 44, LSHIFT: 45, Z: 46, X: 47, C: 48, V: 49, B: 50, N: 51, M: 52, ',': 53, '.': 54, '/': 55, RSHIFT: 56, CRSR_UD: 57, CRSR_LR: 58, ' ': 59, F1: 60, F3: 61, F5: 62, F7: 63 };
  var SHIFTED = { '!': '1', '"': '2', '#': '3', '$': '4', '%': '5', '&': '6', "'": '7', '(': '8', ')': '9', '<': ',', '>': '.', '?': '/', '[': ':', ']': ';' };
  var CTRLCODES = { clr: 147, clear: 147, home: 19, down: 17, up: 145, right: 29, left: 157, 'rvs on': 18, rvson: 18, 'rvs off': 146, rvsoff: 146,
    blk: 144, black: 144, wht: 5, white: 5, red: 28, cyn: 159, cyan: 159, pur: 156, purple: 156, grn: 30, green: 30, blu: 31, blue: 31, yel: 158, yellow: 158,
    orange: 129, brown: 149, 'lt red': 150, gray1: 151, gray2: 152, 'lt green': 153, 'lt blue': 154, gray3: 155, space: 32, pi: 255 };
  function petscii(text) {            // text -> array of PETSCII codes; {clr} style names and {147} numbers are accepted
    var out = [], i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (ch === '{') { var j = text.indexOf('}', i); if (j > 0) { var nm = text.slice(i + 1, j).toLowerCase().trim(); var code = /^\d+$/.test(nm) ? +nm : CTRLCODES[nm]; if (code !== undefined) { out.push(code & 255); i = j + 1; continue; } } }
      if (ch === '\n') out.push(13);
      else if (ch === '\r' || ch === '\t') { if (ch === '\t') out.push(32); }
      else { var c = ch.charCodeAt(0); if (c >= 97 && c <= 122) c -= 32; if (c === 94) c = 94; if (c >= 32 && c < 96) out.push(c); else if (ch === '£') out.push(92); else if (ch === 'π') out.push(255); else out.push(63); }
      i++;
    }
    return out;
  }
  function sc2ch(v) { v &= 127; if (v === 0) return '@'; if (v <= 26) return String.fromCharCode(64 + v); if (v === 27) return '['; if (v === 28) return '£'; if (v === 29) return ']'; if (v === 30) return '^'; if (v === 31) return '<'; if (v < 64) return String.fromCharCode(v); return ' '; }

  function boot(bytes) {
    var mem = new WebAssembly.Memory({ initial: 256 });
    var env = {
      memory: mem, table: new WebAssembly.Table({ initial: 512, maximum: 512, element: 'anyfunc' }),
      emscripten_get_sbrk_ptr: function () { return DYNAMICTOP_PTR; },
      emscripten_resize_heap: function (req) { try { var need = Math.ceil((Math.max(req, 16777216) - mem.buffer.byteLength) / 65536); if (need > 0) mem.grow(need); return 1; } catch (e) { return 0; } },
      emscripten_memcpy_big: function (d, s, n) { new Uint8Array(mem.buffer).copyWithin(d, s, s + n); return d; },
      setTempRet0: function () { }, emscripten_asm_const_iii: function () { return 0; }
    };
    var wasi = { fd_write: function (fd, iovs, n, nw) { var v = new DataView(mem.buffer), t = 0; for (var i = 0; i < n; i++) t += v.getUint32(iovs + i * 8 + 4, true); v.setUint32(nw, t, true); return 0; } };
    return WebAssembly.instantiate(bytes, { env: env, wasi_snapshot_preview1: wasi }).then(function (r) {
      var x = r.instance.exports;
      new DataView(mem.buffer).setUint32(DYNAMICTOP_PTR, DYNAMIC_BASE, true);
      if (x.__wasm_call_ctors) x.__wasm_call_ctors();
      x.c64_init(); x.sid_setSampleRate(44100); x.debugger_play();
      return make(x, mem);
    });
  }

  function make(x, mem) {
    var m = { W: W, H: H, x: x, peak: 0, audio: [], frames: 0, sinceAudio: 0, typeQ: [], joyBits: 0 };
    m.step = function () {                         // one PAL frame (20 ms of C64 time)
      if (m.typeQ.length) { var n = x.c64_ramRead(198); while (n < 6 && m.typeQ.length) { x.c64_ramWrite(631 + n, m.typeQ.shift()); n++; } x.c64_ramWrite(198, n); }
      x.debugger_update(20); m.frames++; m.sinceAudio += 882;
      if (m.sinceAudio >= 4096) {                  // the SID buffer must be collected about every 4096 samples
        m.sinceAudio -= 4096;
        var p = x.sid_getAudioBuffer(), f = new Float32Array(mem.buffer, p, 4096);
        for (var i = 0; i < 4096; i++) { var v = f[i]; if (v > m.peak) m.peak = v; else if (-v > m.peak) m.peak = -v; }
        if (m.onAudio) m.onAudio(f);
      }
    };
    m.run = function (n) { for (var i = 0; i < n; i++) m.step(); };
    m.peek = function (a) { a &= 65535; if (a >= 0xD400 && a < 0xD420) return x.sid_readNS(a - 0xD400) & 255; if (a >= 0xD000 && a < 0xE000) return x.c64_cpuReadNS(a) & 255; return x.c64_ramRead(a) & 255; };
    m.poke = function (a, v) { a &= 65535; if (a >= 0xD000 && a < 0xE000) x.c64_cpuWrite(a, v & 255); else x.c64_ramWrite(a, v & 255); };
    m.pc = function () { return x.c64_getPC(); };
    m.pixels = function () { return new Uint8Array(mem.buffer, x.c64_getPixelBuffer(), W * H * 4); };
    m.screenRows = function () { var rows = []; for (var r = 0; r < 25; r++) { var s = ''; for (var c = 0; c < 40; c++) s += sc2ch(x.c64_ramRead(1024 + r * 40 + c)); rows.push(s); } return rows; };
    m.screenText = function () { return m.screenRows().join(''); };
    m.colors = function () { var px = new Uint32Array(mem.buffer, x.c64_getPixelBuffer(), W * H), set = {}; for (var y = 0; y < H; y += 2) for (var c = 0; c < W; c += 2) set[px[y * W + c]] = 1; return Object.keys(set).length; };
    m.isReady = function () { return x.c64_ramRead(198) === 0 && !m.typeQ.length; };
    m.reset = function () {                        // cold start, returns when BASIC shows READY.
      for (var i = 0; i < 1000; i++) x.c64_ramWrite(1024 + i, 32);
      m.typeQ = []; m.releaseAll(); x.c64_reset(); m.peak = 0;
      for (var k = 0; k < 400; k++) { m.step(); if (m.screenRows()[5].indexOf('READY.') === 0) break; }
      m.run(3); m.peak = 0;
    };
    m.type = function (text) { petscii(text).forEach(function (c) { m.typeQ.push(c); }); };      // queued, fed to the KERNAL keyboard buffer as frames run
    m.typeNow = function (text, maxFrames) { m.type(text); var g = 0; while ((m.typeQ.length || x.c64_ramRead(198) > 0) && g++ < (maxFrames || 4000)) m.step(); m.run(2); };
    m.key = function (name, down) { var i = K[name]; if (i === undefined) return; if (down) x.keyboard_keyPressed(i); else x.keyboard_keyReleased(i); };
    m.keyChar = function (ch, down) {              // a printable character on the real keyboard matrix
      var up = ch.length === 1 ? ch.toUpperCase() : ch, sh = SHIFTED[ch];
      if (sh) { m.key('LSHIFT', down); m.key(sh, down); return true; }
      if (K[up] !== undefined) { m.key(up, down); return true; }
      return false;
    };
    m.releaseAll = function () { for (var i = 0; i < 65; i++) x.keyboard_keyReleased(i); [1, 2, 4, 8, 16].forEach(function (b) { x.c64_joystick_release(1, b); x.c64_joystick_release(0, b); }); m.joyBits = 0; };
    m.joy = function (bits, port) {                // port 2 by default; bits: 1 up, 2 down, 4 left, 8 right, 16 fire
      var p = port === 1 ? 0 : 1;
      [1, 2, 4, 8, 16].forEach(function (b) { if (bits & b) x.c64_joystick_push(p, b); else x.c64_joystick_release(p, b); }); m.joyBits = bits;
    };
    m.stop = function () { x.keyboard_keyPressed(K.STOP); m.run(4); x.keyboard_keyReleased(K.STOP); m.run(2); };
    /* load a BASIC listing by typing it into the real machine (the ROM tokenises it), then RUN */
    m.checkBasic = function (src) {
      var bad = [];
      src.split('\n').forEach(function (l, i) { var t = l.replace(/\s+$/, ''); if (!t) return; if (!/^\s*\d+/.test(t)) bad.push('Line ' + (i + 1) + ' has no line number: ' + t.slice(0, 30)); else if (petscii(t).length > 80) bad.push('Line ' + t.match(/\d+/)[0] + ' is longer than 80 characters; split it in two.'); });
      return bad;
    };
    m.loadBasic = function (src, run) {
      m.reset();
      var lines = src.split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).filter(function (l) { return l.trim(); });
      lines.forEach(function (l) { m.typeNow(l.replace(/^\s+/, '') + '\n'); });
      for (var i = 0; i < 1000; i++) x.c64_ramWrite(1024 + i, 32);
      x.c64_ramWrite(214, 0); x.c64_ramWrite(211, 0); m.typeNow('{clr}');
      if (run !== false) m.runBasic();
    };
    m.runBasic = function () {                     // start the program without typing RUN, so the screen starts clean (JSR CLR, JMP main loop)
      [0x20, 0x59, 0xA6, 0x4C, 0xAE, 0xA7].forEach(function (b, i) { x.c64_ramWrite(828 + i, b); }); x.c64_setPC(828);
    };
    /* load machine code or a BASIC-stub PRG (first two bytes = load address) and start it */
    m.loadPRG = function (prg, run) {
      var a = prg[0] | (prg[1] << 8), end = a + prg.length - 2;
      m.reset();
      for (var k = 2; k < prg.length; k++) x.c64_ramWrite(a + k - 2, prg[k]);
      if (a === 0x801) { [0x2d, 0x2f, 0x31].forEach(function (p) { x.c64_ramWrite(p, end & 255); x.c64_ramWrite(p + 1, end >> 8); }); if (run !== false) m.typeNow('RUN\n'); }
      else if (run !== false) m.typeNow('SYS ' + a + '\n');
      return a;
    };
    m.petscii = petscii;
    return m;
  }
  return { boot: boot, petscii: petscii, K: K, W: W, H: H };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = C64M;
