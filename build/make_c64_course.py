#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the Commodore 64 for Beginners course. Every lab runs on a real C64 core (c64.wasm from c64-ready, MIT)
with the original BASIC V2; the C labs compile with cc65 inside the app.
Usage: python3 make_c64_course.py [out.json]"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "c64c"))
sys.path.insert(0, os.path.join(HERE, "cd"))
import cmk, cn_a, cn_b, cn_c, figs, maps as cmaps, labs_new, app_c64  # noqa: E402
from clib import T  # noqa: E402

CHS = cn_a.CHS + cn_b.CHS + cn_c.CHS
LAB_FOR = ["hello", "first", "vars", "loops", "tools", "poke", "screen", "sprites", "sound", "input", "ports", "game", "asm1", "asm2", "asm3", "c1", "c2", None]
assert len(CHS) == len(LAB_FOR) == 18, len(CHS)
HELP = ("Tap the C64 screen to type on its real keyboard, or use the Type box. Run types your program into the C64 and runs it. "
        "Each level lists goals that tick as the machine reaches them; Hint and Solution are there when you are stuck. ")
for _c, _k in zip(CHS, LAB_FOR):
    if not _k:
        continue
    _lab = labs_new.LABS[_k]
    _studio = _k.startswith("c") and _k[1:].isdigit()
    _c["practice"].insert(0, {"type": "webxdc", "title": _lab["title"], "intro": HELP + _lab["intro"], "height": 1700,
                              "html": app_c64.make_lab(_lab, studio=_studio)})

# numbered figures and tables: "Figure N.M" / "Table N.M", with a pointer added to the paragraph before each
ANCHOR = re.compile(r"\s*\(See (Figure|Table) [\d.]+ below\.\)")
for _ci, _ch in enumerate(CHS):
    _nf = _nt = 0
    _out = []
    for _b in _ch["lesson"]:
        if _b["type"] == "text":
            _b["items"] = [ANCHOR.sub("", it) for it in _b["items"]]
        if _b["type"] in ("figure", "table"):
            if _b["type"] == "figure":
                _nf += 1; _lab = "Figure %d.%d" % (_ci + 1, _nf); _b["caption"] = _lab + ". " + _b["caption"]
            else:
                _nt += 1; _lab = "Table %d.%d" % (_ci + 1, _nt); _b["title"] = _lab + ". " + _b["title"]
            for _p in reversed(_out):
                if _p["type"] == "text":
                    _p["items"][-1] = _p["items"][-1].rstrip() + " (See %s below.)" % _lab
                    break
        _out.append(_b)
    _ch["lesson"] = _out
    assert _nt >= 1, "chapter %d has no table" % (_ci + 1)

assert len(cmaps.MAPS) == len(CHS)
for _c, _ms in zip(CHS, cmaps.MAPS):
    _c["maps"] = [{"title": _t, "links": _l} for _t, _l in _ms]

for _i in range(1, len(CHS)):
    _prev = CHS[_i - 1]
    CHS[_i]["lesson"].insert(0, T("Quick recap of the last chapter, " + _prev["title"] + ":", *["\u2022 " + k for k in _prev["keyPoints"]]))

MNEM = [
 ("Brain, painter, singer, watchers", "The 6510 Brain thinks, the VIC-II Paints, the SID Sings, the CIAs Watch the keys and ports."),
 ("Number means later", "A line with a Number is kept for Later; no number means Now."),
 ("Dollar for words, percent for wholes", "A $ box holds words (strings), a % box holds whole numbers, a plain name holds any number."),
 ("FOR counts, IF chooses", "FOR Counts round and round; IF Chooses, and a false IF skips the rest of the line."),
 ("GOSUB goes, RETURN returns, END guards", "GOSUB Goes to the helper, RETURN Returns, and END Guards the helpers from being fallen into."),
 ("POKE puts, PEEK peeks", "POKE Puts a number in a box; PEEK Peeks inside. Border 53280, background one more."),
 ("Ten-twenty-four plus forty a row", "Screen starts at 1024, plus 40 for every row, plus the column; colour lives at 55296."),
 ("Data, point, place, paint, power", "Sprite steps: Data at 832, Pointer 2040, Place with V and V+1, Paint with V+39, Power on with V+21."),
 ("Volume, envelope, pitch, gate", "Turn up the Volume, shape the Envelope, pick the Pitch, open the Gate: VEPG, Very Excited People Giggle."),
 ("Pressed is zero", "On the joystick, Pressed is Zero: up 1, down 2, left 4, right 8, fire 16."),
 ("Fifty-six five seven seven, nine to steer", "User port data is 56577; its direction cell is 56579 (one more pair of steps, ending in 9)."),
 ("Read, move, rules, show", "Every game loop: Read, Move, Rules, Show, the RMRS rhythm, round and round."),
 ("Load, store, return", "LDA Loads, STA Stores, RTS Returns: the first three words of machine code."),
 ("Count, compare, branch", "INX Counts, CPX Compares, BNE Branches back: the loop heartbeat."),
 ("Point, enable, choose, acknowledge", "Interrupts: Point $0314 at the handler, Enable in $D01A, Choose the line in $D012, Acknowledge in $D019."),
 ("Compile, assemble, link", "cc65 Compiles, ca65 Assembles, ld65 Links: C goes in, a PRG comes out."),
 ("Same cells, any language", "The chips only see Cells: BASIC, assembly and C all POKE the same addresses."),
 ("Eight for disk, one for tape", "Device 8 is the Disk, device 1 is the Tape, and LOAD \"$\" shows the list."),
]
assert len(MNEM) == len(CHS)
for _c, (_m, _d) in zip(CHS, MNEM):
    _full = _m + ". " + _d
    _c["lesson"].append(T("Memory trick: " + _full))
    _c["cards"].append({"q": "Memory trick for: " + _c["title"] + "?", "a": _full})
IMAGES = figs.build_all()

PRONOUNCE = {
    "C64": "C sixty four", "6510": "sixty five ten", "6502": "sixty five oh two", "VIC-II": "vick two", "SID": "sid", "CIA": "see eye ay", "CIAs": "see eye ays",
    "PETSCII": "pet ski", "KERNAL": "kernel", "PRG": "P R G", "D64": "D sixty four", "RAM": "ram", "ROM": "rom", "ROMs": "roms", "PAL": "pal", "NTSC": "N T S C",
    "IRQ": "I R Q", "SEI": "S E I", "CLI": "C L I", "RTI": "R T I", "RTS": "R T S", "JSR": "J S R", "LDA": "L D A", "STA": "S T A", "LDX": "L D X", "INX": "I N X",
    "CPX": "C P X", "BNE": "B N E", "BEQ": "B E Q", "ADSR": "A D S R", "CHROUT": "char out", "GETIN": "get in", "cc65": "C C sixty five", "ca65": "C A sixty five", "ld65": "L D sixty five",
    "Datassette": "data set", "BASIC": "basic", "PEEK": "peek", "POKE": "poke", "SYS": "sis", "GOSUB": "go sub", "GOTO": "go to", "1541": "fifteen forty one",
    "CHR$": "character string", "STR$": "string string", "LEFT$": "left string", "MID$": "mid string", "RIGHT$": "right string", "printf": "print F", "stdio.h": "standard I O dot H",
    "peekpoke.h": "peek poke dot H", "VICE": "vice", "DIN": "din", "TTL": "T T L", "PB0": "P B zero", "PB7": "P B seven", "ELI5": "E L I five", "wasm": "wasm", "c64-ready": "C sixty four ready",
}

SANDBOX = cmk.terminal("C64 cheat sheet", "c64>", "A scripted lookup, not a real machine. Try: start, basic, screen, colours, sprite, sound, joy, ports, asm, kernal, irq, c, disk", [
    ("start", ["print 6*7  (direct mode)", "10 print \"hi\" then run  (program mode)", "list, new, RUN/STOP to break"]),
    ("basic", ["a=5  a%=5  a$=\"x\"   input \"q\";a", "for i=1 to 10 step 1 ... next   if a=1 then ...", "gosub 100 ... return   read/data   dim a(10)   int(rnd(1)*6)+1"]),
    ("screen", ["cell = 1024 + row*40 + column", "colour = 55296 + row*40 + column", "chr$(147) clear, chr$(19) home, chr$(28) red"]),
    ("colours", ["0 black 1 white 2 red 3 cyan 4 purple 5 green 6 blue 7 yellow", "8 orange 9 brown 10 light red 11 dark grey 12 grey 13 light green 14 light blue 15 light grey"]),
    ("sprite", ["v=53248: data at 832, poke 2040,13", "poke v,x : poke v+1,y : poke v+39,colour : poke v+21,1", "v+23 double height, v+29 double width"]),
    ("sound", ["s=54272: poke s+24,15 (volume)", "poke s+5,9:poke s+6,240 (envelope), poke s+1,34:poke s,75 (pitch)", "poke s+4,17 start (triangle+gate), poke s+4,16 stop"]),
    ("joy", ["j=peek(56320) port 2, peek(56321) port 1", "up 1 down 2 left 4 right 8 fire 16; pressed = 0", "if (j and 16)=0 then fire"]),
    ("ports", ["control ports: 9-pin, pins 1-4 directions, 6 fire, 7 +5V, 8 ground", "user port: poke 56579,255 outputs, poke 56577,v sets PB0-PB7", "serial: disk device 8, printer 4; cassette: device 1"]),
    ("asm", ["*=$C000  lda #2  sta $d020  rts", "ldx #0 / loop: sta $0400,x / inx / cpx #40 / bne loop", "sys 49152 runs code at $C000"]),
    ("kernal", ["$FFD2 CHROUT prints A", "$FFE4 GETIN reads a key", "$FFD5 LOAD, $FFD8 SAVE"]),
    ("irq", ["sei, vector $0314/$0315, $dc0d=$7f, $d01a=1, $d012=line, cli", "handler: work, sta $d019, pla/tay/pla/tax/pla, rti"]),
    ("c", ["#include <peekpoke.h>  POKE(53280U, 0);  PEEK(56320U)", "unsigned char i; for (i = 0; i < 10; i++) { }", "cc65 -> ca65 -> ld65 -> .prg"]),
    ("disk", ["save \"name\",8  load \"name\",8  load \"name\",8,1", "load \"$\",8 then list shows the directory", "1541: 35 tracks, 664 blocks free, directory on track 18"]),
])

EXAM = [
 ("What does the C64 show when it is ready?", ["READY.", "OK", "C:\\>", "$"], 0, "Then a cursor."),
 ("Which chip draws sprites?", ["VIC-II", "SID", "CIA", "6510"], 0, "The video chip."),
 ("Which chip makes sound?", ["SID", "VIC-II", "CIA", "PLA"], 0, "Three voices."),
 ("What is direct mode?", ["A line without a number runs at once", "A fast mode", "A disk mode", "Assembly"], 0, "Numbered lines are stored."),
 ("Which line runs first after RUN?", ["The lowest number", "The first typed", "The last typed", "Line 0 only"], 0, "Sorted order."),
 ("How do you stop a program that loops forever?", ["RUN/STOP", "NEW", "END", "LIST"], 0, "BREAK IN."),
 ("Which variable holds text?", ["N$", "N%", "N", "N#"], 0, "Ends in $."),
 ("Why are SCORE and SCALE the same variable?", ["Only two letters count", "They are not", "Both have an S", "BASIC is case blind"], 0, "BASIC V2 quirk."),
 ("What does STEP -1 do in a FOR loop?", ["Counts down", "Stops", "Counts in twos", "Nothing"], 0, "Rocket countdown."),
 ("When an IF test is false, what is skipped?", ["The rest of the line", "The next line", "Nothing", "The whole program"], 0, "Even after colons."),
 ("What does RETURN do?", ["Goes back after the GOSUB", "Ends the program", "Prints a line", "Restarts"], 0, "Subroutines."),
 ("Which expression rolls a dice?", ["INT(RND(1)*6)+1", "RND(6)", "INT(RND(6))", "RND(1)*6"], 0, "1 to 6."),
 ("What does POKE 53280,0 do?", ["Black border", "Black background", "Clears screen", "Silence"], 0, "Border register."),
 ("What range does one memory cell hold?", ["0 to 255", "0 to 15", "0 to 65535", "1 to 100"], 0, "One byte."),
 ("What is the address of row 1, column 0?", ["1064", "1025", "1040", "2024"], 0, "1024+40."),
 ("Which code POKEs the letter A?", ["1", "65", "97", "0"], 0, "Screen code."),
 ("What does CHR$(147) do?", ["Clears the screen", "Rings a bell", "Prints a heart", "Goes home"], 0, "Clear + home."),
 ("How many bytes is a sprite?", ["63", "64", "8", "21"], 0, "21 rows of 3."),
 ("Which cell is sprite 0's pointer?", ["2040", "53248", "832", "53269"], 0, "Block number goes there."),
 ("What switches sprites 0 and 2 on?", ["POKE 53269,5", "POKE 53269,3", "POKE 53269,2", "POKE 53269,20"], 0, "1+4."),
 ("What must be set before a SID note is heard?", ["Volume S+24", "Border", "Sprite", "Nothing"], 0, "Master volume."),
 ("What does POKE S+4,33 do?", ["Sawtooth with the gate open", "Triangle off", "Noise", "Volume 33"], 0, "32+1."),
 ("What does ADSR stand for?", ["Attack Decay Sustain Release", "Add Data Sum Rate", "Audio Digital Sound Register", "None"], 0, "The envelope."),
 ("What does a pressed joystick switch read?", ["0", "1", "16", "255"], 0, "Active low."),
 ("Which value is joystick fire?", ["16", "1", "4", "128"], 0, "Bit 4."),
 ("Which address reads joystick port 2?", ["56320", "56321", "56577", "53280"], 0, "CIA 1."),
 ("Which cell makes user port lines outputs?", ["56579", "56577", "56320", "54296"], 0, "Data direction."),
 ("Which port does a 1541 disk drive use?", ["Serial", "User", "Control", "Cassette"], 0, "Device 8."),
 ("What does LDA #2 do?", ["Loads the number 2 into A", "Loads cell 2", "Stores 2", "Adds 2"], 0, "Immediate."),
 ("What is $D020 in decimal?", ["53280", "53281", "1024", "49152"], 0, "The border."),
 ("Which routine prints the character in A?", ["$FFD2", "$FFE4", "$C000", "$D012"], 0, "CHROUT."),
 ("When does BNE branch?", ["When not equal (Z clear)", "Always", "When equal", "Never"], 0, "Branch if not equal."),
 ("How many lines in a PAL frame?", ["312", "263", "200", "25"], 0, "About 50 frames a second."),
 ("What must a raster interrupt handler write?", ["$D019 to acknowledge", "$D020", "$FFD2", "Nothing"], 0, "Or it repeats."),
 ("Which cc65 tool links?", ["ld65", "cc65", "ca65", "gcc"], 0, "Makes the PRG."),
 ("Which C type is fastest on the 6510?", ["unsigned char", "long", "int", "float"], 0, "One byte."),
 ("In C, what does == do?", ["Tests equality", "Sets a value", "Adds", "Comments"], 0, "= sets."),
 ("What does LOAD \"$\",8 load?", ["The disk directory", "The first program", "BASIC", "Nothing"], 0, "Then LIST."),
 ("Which device number is tape?", ["1", "8", "4", "0"], 0, "Datassette."),
 ("What does a .prg file start with?", ["Its load address", "Its name", "A checksum", "Zeroes"], 0, "Two bytes."),
]

CFG = dict(id="commodore-64-programming", title="Commodore 64 for Beginners: BASIC, Sprites, Sound, Assembly and C",
    subtitle="Program a real Commodore 64 inside the app: start with BASIC, then the screen, sprites, sound, joystick, the ports and a small game, then gentle machine code and C with cc65",
    description="A true beginners course on the Commodore 64 in 18 chapters. You start at the READY prompt with BASIC V2 (programs, variables, loops, subroutines, PEEK and POKE), then drive the hardware: the screen, sprites, SID sound, joystick and keyboard, and the ports (control ports, user port, serial, cassette, expansion), and build a small game. "
    "Then you meet 6510 machine code (registers, loops, the KERNAL, raster timing and interrupts) and C with the cc65 compiler, and finish with tape and disk. Every chapter has numbered figures and tables, a recap, a memory trick, an expanded ELI5 and a concept map. "
    "17 hands-on labs (64 levels) run on a cycle-exact C64 inside the app with its original BASIC; assembly is assembled in the lab and C is compiled in the lab with cc65. "
    "Credits: the emulator core is c64.wasm from hayesmaker/c64-ready (MIT licence, based on lvllvl's c64.js); it contains the original Commodore KERNAL, BASIC and character ROMs, which remain the property of their copyright holders and are not covered by the MIT licence. "
    "C labs use the cc65 toolchain (zlib licence) compiled to WebAssembly as packaged by 8bitworkshop. The course text, figures and labs are original.",
    pronounce=PRONOUNCE, sandbox=SANDBOX, exam=EXAM, images=IMAGES)

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "courses", "commodore-64-programming.course.json")
    cmk.main(CFG, CHS, [sys.argv[0], out])
