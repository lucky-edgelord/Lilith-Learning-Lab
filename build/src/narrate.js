/* Narration for Lilith Learning Lab: speech-friendly text, chunking, emotion tags,
   a playback engine (play/pause/next/prev/rate), speech backends (Android native bridge,
   Web Speech, silent read-along) and the avatar frame controller. No DOM access except in makeEnv(). */
(function (root) {
  'use strict';
  var LM = root.LilithMath || (typeof module !== 'undefined' && typeof require === 'function' ? require('./math.js') : null);

  /* ---------- speech-friendly text ---------- */
  var SAY = [   // generic computing words; course-specific ones come from the course's "pronounce" map
    ['GPU', 'G P U'], ['CPU', 'C P U'], ['USB', 'U S B'], ['RAM', 'ram'], ['SDK', 'S D K'], ['API', 'A P I'], ['PDF', 'P D F'], ['HTML', 'H T M L'], ['JSON', 'jay son']
  ];
  var CUSTOM = [];
  function setPronounce(map) {
    CUSTOM = Object.keys(map || {}).sort(function (x, y) { return y.length - x.length; }).map(function (k) { return [k, String(map[k])]; });
  }

  function speakable(s) {
    s = String(s);
    if (LM) s = LM.speech(s);
    s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, 'Figure: $1.');
    s = s.replace(/\[ch(\d+)\]/g, '');
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
    s = s.replace(/\|\|([^|]+)\|\|\^2/g, 'the squared norm of $1');
    s = s.replace(/`([^`]+)`/g, '$1');
    s = s.replace(/->|=>|→/g, ' to ');
    s = s.replace(/(^|\s)--(\w)/g, '$1dash dash $2');
    s = s.replace(/(^|\s)-([a-zA-Z])/g, '$1dash $2');
    s = s.replace(/\b(\w+)\.(onnx|engine|cu|py|md|json|txt|xdc|toml|html)\b/g, '$1 dot $2');
    s = s.replace(/GB\/s/g, ' gigabytes per second').replace(/(\d)\s?MHz/g, '$1 megahertz').replace(/(\d)\s?GB\b/g, '$1 gigabytes').replace(/(\d)\s?MB\b/g, '$1 megabytes');
    s = s.replace(/(\d)\s?W\b/g, '$1 watts').replace(/(\d)\s?ms\b/g, '$1 milliseconds');
    s = s.replace(/\bI\/O\b/g, 'I O').replace(/(\w)\/(\w)/g, '$1 slash $2').replace(/\//g, ' slash ');
    s = s.replace(/(\d)x(?=\W|$)/g, '$1 times').replace(/×/g, ' by ').replace(/~/g, 'about ').replace(/%/g, ' percent');
    s = s.replace(/\bsm_(\d+)\b/g, 'S M $1').replace(/_/g, ' ').replace(/[#$*]/g, ' ').replace(/&/g, ' and ');
    CUSTOM.forEach(function (p) { s = s.split(p[0]).join(p[1]); });
    SAY.forEach(function (p) { s = s.split(p[0]).join(p[1]); });
    return s.replace(/\s+/g, ' ').trim();
  }

  function caption(s) { return plain(LM ? LM.caption(s) : s); }

  function plain(s) {
    return String(s).replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[ch(\d+)\]/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\s+/g, ' ').trim();
  }

  function emotionFor(text, label) {
    if (label === 'Answer' || label === 'Correct') return 'happy';
    if (label === 'Not quite') return 'sad';
    if (/\(from memory|not re-checked|unverified|double-check|confirm in the/i.test(text)) return 'shy';
    if (/end[- ]of[- ]life|discontinued|no longer (supported|available|maintained)|deprecated/i.test(text)) return 'sad';
    if (/\b(fail|fails|error|stall|crash|brownouts?|reboots?|throttl\w*|out of memory|killed|hangs?|mistake|warning|wrong)\b/i.test(text)) return 'mad';
    if (/\b(easiest|best|good|great|nice|recommended|safe|reliable|well documented|well)\b/i.test(text)) return 'happy';
    return 'neutral';
  }

  function sentences(text) {
    return text.replace(/([.!?])\s+/g, '$1\u0001').split('\u0001').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function pieces(sn, max) {
    if (sn.length <= max) return [sn];
    var parts = sn.split(/([,;:]\s)/), out = [], cur = '';
    for (var i = 0; i < parts.length; i++) {
      if (cur && (cur + parts[i]).length > max) { out.push(cur.trim()); cur = parts[i]; } else cur += parts[i];
    }
    if (cur.trim()) out.push(cur.trim());
    var res = [];
    out.forEach(function (p) {
      while (p.length > max) { var k = p.lastIndexOf(' ', max); if (k < 40) k = max; res.push(p.slice(0, k).trim()); p = p.slice(k); }
      if (p.trim()) res.push(p.trim());
    });
    return res;
  }
  function group(text, max) {
    var out = [], cur = '';
    sentences(text).forEach(function (sn) {
      pieces(sn, max).forEach(function (pc) {
        if (cur && (cur + ' ' + pc).length > max) { out.push(cur); cur = pc; } else cur = cur ? cur + ' ' + pc : pc;
      });
    });
    if (cur) out.push(cur);
    return out;
  }

  /* split a markdown section into blocks: {type:'p'|'li'|'code'|'img', text} */
  function blocks(md) {
    var lines = String(md || '').split('\n'), out = [], i = 0, para = [];
    function flush() { if (para.length) { out.push({ type: 'p', text: para.join(' ') }); para = []; } }
    while (i < lines.length) {
      var ln = lines[i], f = /^```(\w*)/.exec(ln);
      if (f) {
        flush(); var buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        out.push({ type: 'code', lang: f[1], text: buf.join('\n') });
      } else if (/^\s*\|.*\|\s*$/.test(ln)) {
        flush(); var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(function (x) { return x.trim(); })); i++; }
        i--;
        if (rows.length) {
          out.push({ type: 'p', text: 'Table with columns: ' + rows[0].join(', ') + '.' });
          rows.slice(1, 9).forEach(function (r, k) { out.push({ type: 'p', text: 'Row ' + (k + 1) + '. ' + r.map(function (x, j) { return rows[0][j] + ': ' + x; }).join('. ') + '.' }); });
        }
      } else if (/^!\[/.test(ln.trim())) { flush(); out.push({ type: 'img', text: ln.trim() }); }
      else if (/^\s*-\s+/.test(ln)) { flush(); out.push({ type: 'li', text: ln.replace(/^\s*-\s+/, '') }); }
      else if (!ln.trim()) flush();
      else para.push(ln.trim());
      i++;
    }
    flush();
    return out;
  }

  /* ---------- chunks for a chapter ---------- */
  function buildChunks(ch, opts) {
    opts = opts || {};
    var out = [], MAX = 230, label = opts.label || 'Chapter';
    function add(lab, shown, kind) {
      var spoken = speakable(shown);
      if (!spoken) return;
      group(spoken, MAX).forEach(function (t, k) {
        out.push({ label: lab, kind: kind || 'text', text: t, shown: k === 0 ? caption(shown) : '', emotion: emotionFor(shown, lab) });
      });
    }
    function mapSay(m) { m.links.forEach(function (l) { var p = l.split('|'); add('Concept map', p[0].replace(/\[ch\d+\]/, '').trim() + ', ' + p[1].trim() + ', ' + p[2].replace(/\[ch\d+\]/, '').trim() + '.'); }); }
    add('Chapter', label + ' ' + ch.n + '. ' + ch.title + '.', 'intro');
    (ch.maps || []).forEach(function (m) { add('Concept map', 'Concept map: ' + m.title + '.', 'head'); mapSay(m); });
    if (ch.summary) blocks(ch.summary).forEach(function (b) { add('Summary', b.text); });
    if (ch.glossary && ch.glossary.length) {
      add('Glossary', 'Glossary.', 'head');
      ch.glossary.forEach(function (g) { add('Glossary', g.term + '. ' + g.def); });
    }
    if (ch.points) { add('Key points', 'Key points.', 'head'); blocks(ch.points).forEach(function (b) { add('Key points', b.text); }); }
    if (ch.examples && ch.examples.trim()) {
      add('Lesson', 'Lesson.', 'head');
      var skipped = false;
      blocks(ch.examples).forEach(function (b) {
        if (b.type === 'img') add('Figure', b.text, 'figure');
        else if (b.type === 'code') {
          if (/conceptmap/.test(b.lang)) { add('Concept map', 'Another concept map. I will read its links.', 'head'); b.text.split('\n').forEach(function (l) { var p = l.split('|'); if (p.length === 3) add('Concept map', p[0].replace(/\[ch\d+\]/, '').trim() + ', ' + p[1].trim() + ', ' + p[2].replace(/\[ch\d+\]/, '').trim() + '.'); }); }
          else if (opts.readCode) add('Code', 'Code example. ' + b.text.split('\n').slice(0, 14).join('. '), 'code');
          else if (!skipped) { skipped = true; add('Code', 'There is a code example here. I am skipping it; read it on screen, or turn on read code in settings.', 'code'); }
        } else add('Lesson', b.text);
      });
    }
    add('Chapter', 'That is the end of ' + label.toLowerCase() + ' ' + ch.n + '. The quiz and practice are waiting for you.', 'outro');
    return out;
  }

  /* ---------- diagnostics: a small ring buffer of audio events (Settings > Copy audio log) ---------- */
  var DIAG = [], T0 = Date.now();
  function diag(ev, data) {
    DIAG.push((Date.now() - T0) + 'ms ' + ev + (data === undefined ? '' : ' ' + (typeof data === 'object' ? JSON.stringify(data) : data)));
    if (DIAG.length > 200) DIAG.shift();
  }
  function diagText() { return DIAG.join('\n'); }

  /* ---------- playback engine ---------- */
  function createNarrator(env, hooks) {
    hooks = hooks || {};
    var st = { chunks: [], i: 0, playing: false, rate: 1, token: 0, timer: null, held: false, doneTok: 0, errs: 0, retried: 0, rateT: null };
    var START_WAIT = 9000, IDLE_WAIT = 6000;     // engine cold start / silence between word events
    function note() { if (hooks.onState) hooks.onState({ playing: st.playing, i: st.i, n: st.chunks.length, rate: st.rate }); }
    function clearT() { if (st.timer) { clearTimeout(st.timer); st.timer = null; } }
    function arm(t, ms, why) { clearT(); st.timer = setTimeout(function () { stall(t, why); }, ms); }
    function cut() { st.token++; clearT(); if (st.rateT) { clearTimeout(st.rateT); st.rateT = null; } try { env.cancel(); } catch (e) {} }
    function fail(reason) {
      st.playing = false; st.errs = 0; cut(); diag('FAIL', reason);
      if (hooks.onSpeaking) hooks.onSpeaking(false); note(); if (hooks.onFail) hooks.onFail(reason);
    }
    function problem(t, why) {            // engine error or stall for the current chunk: retry once, then count towards a failure
      if (t !== st.token || !st.playing) return;
      diag('problem', why + ' chunk ' + st.i);
      if (st.retried < 1) { st.retried++; cut(); var again = ++st.token; st.timer = setTimeout(function () { if (again === st.token && st.playing) speakCurrent(true); }, 350); return; }
      st.retried = 0;
      if (++st.errs >= 3) { fail('The voice engine is not responding.'); return; }
      advance(t, true);
    }
    function stall(t, why) { if (t !== st.token || !st.playing) return; cut(); st.token--; problem(st.token, why || 'stall'); }
    function advance(t, skipping) {
      if (t !== st.token || !st.playing || st.doneTok === t) return;   // a duplicate or late end event for a chunk already finished
      st.doneTok = t; clearT();
      if (!skipping) { st.errs = 0; st.retried = 0; }
      var cur = st.chunks[st.i];
      if (cur && cur.hold) {            // wait for the learner (quiz question): stop here, the app resumes with next()+play()
        st.playing = false; st.held = true; cut(); if (hooks.onSpeaking) hooks.onSpeaking(false); note(); if (hooks.onHold) hooks.onHold(st.i, cur); return;
      }
      st.i++; speakCurrent();
    }
    function speakCurrent(isRetry) {
      var c = st.chunks[st.i];
      if (!c) { st.playing = false; st.i = Math.max(0, st.chunks.length - 1); note(); if (hooks.onDone) hooks.onDone(); return; }
      var t = ++st.token;
      if (!isRetry) st.retried = 0;
      if (hooks.onChunk) hooks.onChunk(st.i, c);
      note();
      if (c.wait) { if (hooks.onSpeaking) hooks.onSpeaking(false); clearT(); st.timer = setTimeout(function () { advance(t); }, c.wait); return; }
      var est = Math.max(1500, c.text.length * 95 / st.rate) * 1.3 + 4000;
      arm(t, START_WAIT, 'no start');
      diag('speak', 'chunk ' + st.i + ' len ' + c.text.length + ' rate ' + st.rate);
      env.speak(c.text, st.rate, {
        onstart: function () { if (t !== st.token) return; arm(t, est, 'stall after start'); if (hooks.onSpeaking) hooks.onSpeaking(true); },
        onword: function () { if (t !== st.token) return; arm(t, Math.max(IDLE_WAIT, est - 0), 'silent'); if (hooks.onWord) hooks.onWord(); },
        onend: function () { diag('end', st.i); advance(t); },
        onerror: function (code) { diag('error', code === undefined ? '' : code); problem(t, 'engine error' + (code === undefined ? '' : ' ' + code)); }
      });
    }
    return {
      load: function (chunks, start) { cut(); st.chunks = chunks; st.i = start || 0; st.playing = false; st.errs = 0; note(); },
      play: function () { st.held = false; if (!st.chunks.length) return; if (st.playing) return;          // already playing: a second play must not start a second voice
         if (st.i >= st.chunks.length) st.i = 0; st.playing = true; st.errs = 0; diag('play', st.i); speakCurrent(); },
      pause: function () { diag('pause'); st.playing = false; cut(); if (hooks.onSpeaking) hooks.onSpeaking(false); note(); },
      toggle: function () { st.playing ? this.pause() : this.play(); },
      next: function () { var was = st.playing; cut(); if (st.i < st.chunks.length - 1) st.i++; st.playing = was; if (was) speakCurrent(); else { if (hooks.onChunk) hooks.onChunk(st.i, st.chunks[st.i]); note(); } },
      prev: function () { var was = st.playing; cut(); if (st.i > 0) st.i--; st.playing = was; if (was) speakCurrent(); else { if (hooks.onChunk) hooks.onChunk(st.i, st.chunks[st.i]); note(); } },
      jump: function (i) { var was = st.playing; cut(); st.i = Math.max(0, Math.min(st.chunks.length - 1, i)); st.playing = was; if (was) speakCurrent(); else { if (hooks.onChunk) hooks.onChunk(st.i, st.chunks[st.i]); note(); } },
      setRate: function (r) {
        st.rate = r;
        if (!st.playing) { note(); return; }
        if (st.rateT) clearTimeout(st.rateT);            // restart the same chunk once, after the learner stops tapping
        st.rateT = setTimeout(function () { st.rateT = null; if (st.playing) { cut(); speakCurrent(); } }, 250);
      },
      stop: function () { st.playing = false; cut(); st.i = 0; if (hooks.onSpeaking) hooks.onSpeaking(false); note(); },
      state: st
    };
  }

  /* ---------- speech backends ---------- */
  function silentEnv() {
    var t = null;
    return {
      kind: 'silent',
      speak: function (text, rate, cb) {
        if (cb.onstart) cb.onstart();
        var words = text.split(' '), k = 0, per = 330 / Math.max(0.5, rate);
        (function tick() {
          if (k < words.length) { if (cb.onword) cb.onword(); k++; t = setTimeout(tick, per); } else if (cb.onend) cb.onend();
        })();
      },
      cancel: function () { if (t) clearTimeout(t); t = null; }
    };
  }

  function makeEnv(win, opts) {
    opts = opts || {};
    if (win && win.AndroidTTS) {
      var pending = {}, n = 0, readyTries = 0;
      win.__ttsEvent = function (id, type, code) {
        diag('native', id + ' ' + type + (code === undefined ? '' : ' ' + code));
        if (id === 0 || id === '0') { if ((type === 'focusloss' || type === 'pause') && opts.onFocusLoss) opts.onFocusLoss(type); return; }
        var cb = pending[id]; if (!cb) return;
        if (type === 'start' && cb.onstart) cb.onstart();
        else if (type === 'range' && cb.onword) cb.onword();
        else if (type === 'done') { delete pending[id]; if (cb.onend) cb.onend(); }
        else if (type === 'error') { delete pending[id]; if (cb.onerror) cb.onerror(code); }
      };
      return {
        kind: 'android',
        speak: function (text, rate, cb) {
          var id = ++n; pending[id] = cb;
          try { win.AndroidTTS.speak(text, rate, id); } catch (e) { delete pending[id]; setTimeout(function () { if (cb.onerror) cb.onerror('bridge'); }, 0); }
        },
        cancel: function () { pending = {}; try { win.AndroidTTS.stop(); } catch (e) {} }
      };
    }
    if (win && win.speechSynthesis && win.SpeechSynthesisUtterance) {
      var syn = win.speechSynthesis, voiceName = null, gen = 0, lastCancel = 0, voicesReady = (syn.getVoices() || []).length > 0, keep = null;
      if (!voicesReady && syn.addEventListener) syn.addEventListener('voiceschanged', function () { voicesReady = true; });
      function stopKeep() { if (keep) { clearInterval(keep); keep = null; } }
      function startKeep() {               // Chrome stops long speech after about 15 s unless it is nudged
        stopKeep();
        keep = setInterval(function () { try { if (syn.speaking && !syn.paused) { syn.pause(); syn.resume(); } } catch (e) {} }, 10000);
      }
      function pickVoice() {
        var vs = syn.getVoices() || [], v = null;
        if (voiceName) v = vs.filter(function (x) { return x.name === voiceName; })[0];
        if (!v) v = vs.filter(function (x) { return /^en/i.test(x.lang) && /female|zira|samantha|aria|jenny|google us/i.test(x.name); })[0] || vs.filter(function (x) { return /^en/i.test(x.lang); })[0];
        return v;
      }
      if (win.document && win.document.addEventListener) win.document.addEventListener('visibilitychange', function () { if (win.document.hidden) { try { syn.cancel(); } catch (e) {} } });
      return {
        kind: 'web',
        voices: function () { return (syn.getVoices() || []).filter(function (v) { return /^en/i.test(v.lang); }); },
        setVoice: function (nme) { voiceName = nme; },
        speak: function (text, rate, cb) {
          var parts = group(text, 200), k = 0, my = ++gen, waited = 0;
          function alive() { return my === gen; }
          function go() {
            if (!alive()) return;
            var sinceCancel = Date.now() - lastCancel;
            if (sinceCancel < 80) { setTimeout(go, 80 - sinceCancel); return; }        // speak straight after cancel is dropped by some browsers
            if (!voicesReady && waited < 1500) { waited += 100; setTimeout(go, 100); return; }
            voicesReady = true;                       // wait for the voice list only once; some browsers never have one
            next();
          }
          function next() {
            if (!alive()) return;
            if (k >= parts.length) { stopKeep(); if (cb.onend) cb.onend(); return; }
            var u = new win.SpeechSynthesisUtterance(parts[k++]);
            u.rate = rate; u.pitch = 1.05;
            var v = pickVoice(); if (v) u.voice = v;
            u.onstart = function () { if (alive() && cb.onstart && k === 1) cb.onstart(); };
            u.onboundary = function () { if (alive() && cb.onword) cb.onword(); };
            u.onend = function () { if (alive()) next(); };
            u.onerror = function (e) {
              if (!alive()) return;
              var why = e && e.error; if (why === 'canceled' || why === 'interrupted') return;
              stopKeep(); if (cb.onerror) cb.onerror(why);
            };
            startKeep();
            try { syn.speak(u); } catch (e) { stopKeep(); if (cb.onerror) cb.onerror('throw'); }
          }
          go();
        },
        cancel: function () { gen++; stopKeep(); lastCancel = Date.now(); try { syn.cancel(); } catch (e) {} }
      };
    }
    return silentEnv();
  }

  /* ---------- avatar frame controller (frames: 1 eyes open/mouth closed, 2 open/open, 3 shut/closed, 4 shut/open) ---------- */
  function createAvatar(setFrame) {
    var a = { emotion: 'neutral', mouth: false, blink: false, speaking: false, mt: null, bt: null, wt: null };
    function paint() { setFrame(a.emotion, 1 + (a.blink ? 2 : 0) + (a.mouth ? 1 : 0)); }
    function mouthLoop() {
      if (!a.speaking) { a.mouth = false; paint(); return; }
      a.mouth = !a.mouth; paint();
      a.mt = setTimeout(mouthLoop, a.mouth ? 90 + Math.random() * 70 : 70 + Math.random() * 110);
    }
    function blinkLoop() {
      a.bt = setTimeout(function () { a.blink = true; paint(); setTimeout(function () { a.blink = false; paint(); blinkLoop(); }, 130); }, 2400 + Math.random() * 2800);
    }
    return {
      state: a,
      start: function () { paint(); if (!a.bt) blinkLoop(); },
      emotion: function (e) { if (e !== a.emotion) { a.emotion = e; paint(); } },
      speaking: function (on) { if (on === a.speaking) return; a.speaking = on; if (a.mt) clearTimeout(a.mt); if (on) mouthLoop(); else { a.mouth = false; paint(); } },
      word: function () {
        if (!a.speaking) return;
        if (a.mt) clearTimeout(a.mt);
        a.mouth = true; paint();
        a.mt = setTimeout(function () { a.mouth = false; paint(); a.mt = setTimeout(mouthLoop, 60); }, 110);
      },
      stop: function () { a.speaking = false; if (a.mt) clearTimeout(a.mt); if (a.bt) clearTimeout(a.bt); a.bt = null; a.mouth = false; a.blink = false; paint(); }
    };
  }

  var api = { setPronounce: setPronounce, speakable: speakable, plain: plain, caption: caption, emotionFor: emotionFor, buildChunks: buildChunks, createNarrator: createNarrator, makeEnv: makeEnv, silentEnv: silentEnv, createAvatar: createAvatar, diagText: diagText, diag: diag, blocks: blocks, sentences: sentences };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LilithNarrate = api;
})(typeof window !== 'undefined' ? window : globalThis);
