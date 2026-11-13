// Headless checks of the machine layer on the real c64.wasm.
const fs = require('fs'), path = require('path'), C64M = require('./machine.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const m = await C64M.boot(fs.readFileSync(path.join(__dirname, '..', '..', 'vendor', 'c64-ready', 'c64.wasm')));
  m.reset();
  ok(m.screenText().includes('COMMODORE 64 BASIC V2'), 'boots to BASIC V2'); ok(m.screenRows()[5].startsWith('READY.'), 'READY. prompt');
  m.loadBasic('10 print "hello"\n20 poke 53280,2:poke 53281,0\n30 a=6*7:print a'); m.run(30);
  ok(m.screenText().includes('HELLO') && m.screenText().includes(' 42'), 'BASIC program runs: ' + m.screenRows().filter(r => r.trim()).join('|'));
  ok((m.peek(53280) & 15) === 2 && (m.peek(53281) & 15) === 0, 'POKE changes border and background');
  m.loadBasic('10 input "name";n$\n20 print "hi ";n$'); m.run(20); m.typeNow('ada\n'); m.run(20);
  ok(m.screenText().includes('HI ADA'), 'INPUT works');
  m.loadBasic('10 goto 10'); m.run(20); m.stop(); m.run(10); ok(m.screenText().includes('BREAK IN 10'), 'RUN/STOP breaks');
  m.loadBasic('10 poke 54296,15:poke 54277,9:poke 54278,240\n20 poke 54273,34:poke 54272,75:poke 54276,17'); m.run(40);
  ok(m.peak > 0.02, 'SID makes sound, peak ' + m.peak.toFixed(3)); ok(m.peek(54296) === 15, 'SID register readable');
  m.loadBasic('10 print peek(56320)\n20 get a$:if a$="" then 20\n30 print "got ";a$'); m.run(20); ok(m.screenText().includes('127'), 'joystick idle = 127');
  m.keyChar('q', true); m.run(4); m.keyChar('q', false); m.run(10); ok(m.screenText().includes('GOT Q'), 'matrix key reaches GET');
  m.loadBasic('10 print peek(56320):goto 10'); m.joy(1 | 16); m.run(20); ok(m.screenText().includes('110'), 'joystick up+fire = 110'); m.joy(0); m.stop();
  m.loadPRG(new Uint8Array([0x00, 0xC0, 0xA9, 0x05, 0x8D, 0x20, 0xD0, 0x60])); m.run(20); ok((m.peek(53280) & 15) === 5, 'machine code via SYS');
  ok(m.checkBasic('print 1').length === 1 && m.checkBasic('10 print 1').length === 0, 'listing check');
  m.loadBasic('10 print "{clr}{red}hi"'); m.run(20); ok(m.screenRows()[0].startsWith('HI') && (m.peek(55296) & 15) === 2, 'control codes in strings');
  const t = Date.now(); m.loadBasic('10 for i=1 to 10:print i:next'); m.run(50); console.log('load+run ms', Date.now() - t);
  console.log(fails ? fails + ' FAILED' : 'MACHINE TESTS PASSED'); process.exit(fails ? 1 : 0);
})();
