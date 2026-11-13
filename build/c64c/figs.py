# -*- coding: utf-8 -*-
"""Original SVG figures for the Commodore 64 beginners course (drawn from scratch, schematic, not photos)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
from make_images import Svg, BG, PANEL, LINE, TX, DIM, VIO, PINK, BLUE, GRN, AMB, RED  # noqa: E402

PAL = ["#000000", "#FFFFFF", "#68372B", "#70A4B2", "#6F3D86", "#588D43", "#352879", "#B8C76F",
       "#6F4F25", "#433900", "#9A6759", "#444444", "#6C6C6C", "#9AD284", "#6C5EB5", "#959595"]
CNAMES = ["black", "white", "red", "cyan", "purple", "green", "blue", "yellow", "orange", "brown", "light red", "dark grey", "grey", "light green", "light blue", "light grey"]


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def mono(s, x, y, t, size=12, fill=TX, anchor="middle"):
    s.add('<text x="%s" y="%s" font-family="ui-monospace,Menlo,monospace" font-size="%s" fill="%s" text-anchor="%s">%s</text>' % (x, y, size, fill, anchor, esc(t)))


def head(s, t):
    s.text(s.w / 2, 26, t, 15, VIO, weight="700")


def f_chips():
    s = Svg(640, 330, "The chips inside a C64", "The 6510 processor talks to memory and to three kinds of helper chips over one shared bus: VIC-II for pictures, SID for sound, two CIAs for keyboard, joysticks, timers and ports.")
    head(s, "A brain and its helpers")
    s.box(245, 50, 150, 64, "6510 CPU", "the brain, 1 MHz", VIO)
    s.rect(30, 150, 580, 14, fill=LINE, stroke=LINE, r=4); s.text(320, 184, "the bus: one shared road of address and data wires", 11, DIM)
    s.line(320, 114, 320, 150, VIO, 3)
    parts = [("RAM", "64 KB memory", BLUE), ("ROM", "BASIC + KERNAL", BLUE), ("VIC-II", "pictures, sprites", GRN), ("SID", "sound, 3 voices", PINK), ("CIA 1", "keys, joysticks", AMB), ("CIA 2", "ports, serial", AMB)]
    for i, (t, sub, c) in enumerate(parts):
        x = 30 + i * 97
        s.line(x + 44, 164, x + 44, 210, c, 3)
        s.box(x, 210, 88, 64, t, sub, c)
    s.text(320, 306, "Every helper chip is just a few memory cells. Writing a number into a cell gives the chip an order.", 12, AMB)
    return s


def f_ready():
    s = Svg(640, 300, "The READY prompt", "After switching on, the C64 shows its banner and READY. A line typed without a number runs at once (direct mode). A line with a number is stored as part of a program.")
    head(s, "Two ways to talk to the C64")
    s.rect(30, 46, 300, 200, fill="#352879", stroke="#6C5EB5", r=6)
    s.rect(44, 60, 272, 172, fill="#352879", stroke="#6C5EB5", r=2)
    for i, line in enumerate(["  **** COMMODORE 64 BASIC V2 ****", "", " 64K RAM SYSTEM  38911 BASIC BYTES", "", "READY.", "PRINT 6*7", " 42", "", "READY.", "█"]):
        mono(s, 50, 78 + i * 15, line, 9, "#6C5EB5" if i < 4 else "#9a8fe0", "start")
    s.box(360, 60, 250, 70, "Direct mode", "print 6*7  runs right now", GRN)
    s.box(360, 150, 250, 70, "Program mode", "10 print \"hi\"  is stored", BLUE)
    s.text(485, 244, "then RUN starts the stored lines", 12, DIM)
    s.text(320, 282, "A number at the start of a line is the only difference.", 12, AMB)
    return s


def f_lines():
    s = Svg(680, 290, "Program lines", "Lines are kept sorted by number whatever order you type them. RUN starts at the lowest number; GOTO jumps to any line.")
    head(s, "Lines run in number order")
    s.text(130, 58, "you type", 12, DIM)
    for i, l in enumerate(["30 print \"go\"", "10 print \"ready\"", "20 print \"set\""]):
        s.rect(40, 70 + i * 44, 180, 34, stroke=DIM, r=6); mono(s, 130, 92 + i * 44, l, 12)
    s.arrow(232, 136, 300, 136, VIO); s.text(266, 126, "sorted", 11, VIO)
    s.text(420, 58, "the C64 keeps", 12, DIM)
    for i, l in enumerate(["10 print \"ready\"", "20 print \"set\"", "30 print \"go\""]):
        s.rect(320, 70 + i * 44, 200, 34, stroke=BLUE, r=6); mono(s, 420, 92 + i * 44, l, 12)
    for i in range(2):
        s.arrow(420, 104 + i * 44, 420, 114 + i * 44, GRN)
    s.add('<path d="M520 197 C 590 197, 590 87, 520 87" fill="none" stroke="%s" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#ah)"/>' % AMB)
    s.text(600, 146, "GOTO 10", 12, AMB, anchor="start")
    s.text(320, 262, "Leave gaps (10, 20, 30) so you can slip new lines in between later.", 12, DIM)
    return s


def f_vars():
    s = Svg(640, 270, "Three kinds of variable", "A plain name holds a decimal number, a name ending in % holds a whole number, a name ending in $ holds text.")
    head(s, "Variables are labelled boxes")
    items = [("A", "7.5", "decimal number", BLUE), ("A%", "7", "whole number", GRN), ("N$", "\"ADA\"", "text (a string)", PINK)]
    for i, (n, v, d, c) in enumerate(items):
        x = 40 + i * 195
        s.rect(x, 60, 170, 120, stroke=c, r=10)
        s.rect(x + 40, 90, 90, 50, fill=BG, stroke=c, r=6); mono(s, x + 85, 121, v, 16, c)
        mono(s, x + 85, 80, n, 14, TX); s.text(x + 85, 164, d, 12, DIM)
    s.text(320, 214, "Only the first two letters of a name count: SCORE and SCALE are the same box!", 12, AMB)
    s.text(320, 238, "Text in a number box gives ?TYPE MISMATCH ERROR.", 12, DIM)
    return s


def f_for():
    s = Svg(640, 300, "How FOR and NEXT work", "FOR sets a counter to its start value. The body runs. NEXT adds the step and goes back while the counter has not passed the end value.")
    head(s, "Inside a FOR loop")
    s.box(220, 46, 200, 44, "FOR I=1 TO 5", None, VIO)
    s.box(220, 112, 200, 44, "body: PRINT I", None, BLUE)
    s.box(220, 178, 200, 44, "NEXT: I = I + 1", None, GRN)
    s.arrow(320, 90, 320, 112); s.arrow(320, 156, 320, 178)
    s.add('<path d="M220 200 C 140 200, 140 134, 220 134" fill="none" stroke="%s" stroke-width="1.8" marker-end="url(#ah)"/>' % GRN)
    s.text(110, 170, "I <= 5 ?", 12, GRN, anchor="end"); s.text(110, 186, "go round", 11, DIM, anchor="end")
    s.arrow(420, 200, 520, 200, AMB); s.text(540, 196, "I > 5:", 12, AMB, anchor="start"); s.text(540, 212, "carry on", 11, DIM, anchor="start")
    s.text(320, 264, "STEP changes how much NEXT adds: STEP 2 counts in twos, STEP -1 counts down.", 12, DIM)
    return s


def f_gosub():
    s = Svg(640, 280, "GOSUB and RETURN", "GOSUB remembers where it came from and jumps to a subroutine. RETURN goes back to the line after the GOSUB.")
    head(s, "A subroutine is a helper you call")
    for i, l in enumerate(["10 gosub 100", "20 print \"title\"", "30 gosub 100", "90 end"]):
        s.rect(40, 54 + i * 42, 200, 32, stroke=BLUE, r=6); mono(s, 140, 75 + i * 42, l, 12)
    for i, l in enumerate(["100 print \"-----\"", "110 return"]):
        s.rect(400, 96 + i * 42, 200, 32, stroke=GRN, r=6); mono(s, 500, 117 + i * 42, l, 12)
    s.arrow(240, 70, 400, 112, VIO); s.text(320, 80, "1. go to 100", 11, VIO)
    s.arrow(400, 154, 240, 112, AMB); s.text(320, 156, "2. back to line 20", 11, AMB)
    s.text(320, 250, "END stops the program so it does not fall into the subroutine by accident.", 12, DIM)
    return s


def f_memmap():
    s = Svg(640, 340, "The C64 memory map", "The 65536 cells in order: the work area, the screen at 1024, your BASIC program from 2049, free RAM at 49152, the chips at 53248, and the ROMs.")
    head(s, "A street of 65536 mailboxes")
    rows = [(0, 1023, "0-1023", "work area, zero page, stack", DIM), (1024, 2023, "1024-2023", "screen memory", GRN), (2049, 40959, "2049-40959", "your BASIC program and variables", BLUE),
            (40960, 49151, "40960-49151", "BASIC ROM (the interpreter)", VIO), (49152, 53247, "49152-53247", "free RAM: a safe place for machine code", AMB),
            (53248, 57343, "53248-57343", "chips: VIC-II, SID, colour RAM, CIAs", PINK), (57344, 65535, "57344-65535", "KERNAL ROM (the operating system)", VIO)]
    for i, (a, b, lab, d, c) in enumerate(rows):
        y = 46 + i * 38
        s.rect(40, y, 150, 30, fill=PANEL, stroke=c, r=5); mono(s, 115, y + 20, lab, 11, c)
        s.text(206, y + 20, d, 12, TX, anchor="start")
    s.text(320, 326, "The ROMs and chips sit on top of RAM. POKE into the chip area and you give orders.", 12, AMB)
    return s


def f_palette():
    s = Svg(640, 230, "The 16 colours", "The C64 has sixteen fixed colours numbered 0 to 15. The same numbers work for the border, background, text and sprites.")
    head(s, "Sixteen colours, numbered 0 to 15")
    for i, c in enumerate(PAL):
        x = 24 + (i % 8) * 76; y = 50 + (i // 8) * 84
        s.rect(x, y, 66, 44, fill=c, stroke=LINE, r=6)
        mono(s, x + 33, y + 28, str(i), 14, "#000000" if i in (1, 3, 7, 13, 15, 12, 10) else "#ffffff")
        s.text(x + 33, y + 62, CNAMES[i], 10, DIM)
    return s


def f_screen():
    s = Svg(640, 320, "Screen memory", "The text screen is 40 columns by 25 rows. Each cell has an address starting at 1024, and a matching colour cell starting at 55296.")
    head(s, "Every character cell has an address")
    x0, y0, cw, ch = 60, 50, 11, 8.4
    s.rect(x0, y0, 40 * cw, 25 * ch, fill="#352879", stroke="#6C5EB5", r=2)
    for c in range(0, 41, 5): s.line(x0 + c * cw, y0, x0 + c * cw, y0 + 25 * ch, "#4a3d99", 0.8)
    for r in range(0, 26, 5): s.line(x0, y0 + r * ch, x0 + 40 * cw, y0 + r * ch, "#4a3d99", 0.8)
    s.rect(x0 + 20 * cw, y0 + 12 * ch, cw, ch, fill=AMB, stroke=AMB, r=1)
    mono(s, x0 - 6, y0 + 8, "1024", 10, GRN, "end"); mono(s, x0 + 40 * cw + 4, y0 + 8, "1063", 10, GRN, "start")
    mono(s, x0 - 6, y0 + 25 * ch, "1984", 10, GRN, "end"); mono(s, x0 + 40 * cw + 4, y0 + 25 * ch, "2023", 10, GRN, "start")
    s.text(x0 + 20 * cw, y0 - 6, "40 columns (0-39)", 11, DIM)
    s.text(x0 + 20 * cw + 26, y0 + 12 * ch + 8, "row 12, column 20", 11, AMB, anchor="start")
    s.text(320, 290, "cell = 1024 + row × 40 + column        colour = 55296 + row × 40 + column", 13, AMB)
    return s


BALL = [0, 126, 0, 1, 255, 128, 3, 255, 192, 7, 255, 224, 15, 255, 240, 15, 255, 240, 15, 255, 240, 15, 255, 240, 7, 255, 224, 3, 255, 192, 1, 255, 128, 0, 126, 0] + [0] * 27


def f_sprite():
    s = Svg(640, 330, "Sprite data", "A sprite is 24 dots wide and 21 rows high. Each row is three bytes; each byte is eight dots. 21 rows times 3 bytes is 63 bytes.")
    head(s, "A sprite is 63 bytes: 3 per row, 21 rows")
    x0, y0, d = 40, 46, 11
    for r in range(21):
        for b in range(3):
            v = BALL[r * 3 + b]
            for bit in range(8):
                on = v & (128 >> bit)
                s.rect(x0 + (b * 8 + bit) * d, y0 + r * d, d - 1, d - 1, fill=PAL[7] if on else PANEL, stroke="none", r=1)
        if r < 6:
            mono(s, x0 + 24 * d + 10, y0 + r * d + 9, ",".join(str(v) for v in BALL[r * 3:r * 3 + 3]), 10, DIM, "start")
    for b in range(1, 3): s.line(x0 + b * 8 * d - 0.5, y0, x0 + b * 8 * d - 0.5, y0 + 21 * d, VIO, 1)
    s.text(x0 + 12 * d, y0 + 21 * d + 18, "byte 1 | byte 2 | byte 3", 11, VIO)
    s.box(420, 70, 200, 56, "bit values in a byte", "128 64 32 16 8 4 2 1", BLUE)
    s.box(420, 146, 200, 56, "data at 832 to 894", "block 13 (13 × 64 = 832)", GRN)
    s.box(420, 222, 200, 56, "POKE 2040,13", "sprite 0 looks at block 13", AMB)
    return s


def f_adsr():
    s = Svg(640, 280, "The ADSR envelope", "Opening the gate starts Attack (rise), then Decay down to the Sustain level, which holds while the gate stays open. Closing the gate starts Release (fade).")
    head(s, "How a note swells and fades")
    pts = [(60, 220), (130, 70), (200, 130), (400, 130), (520, 220)]
    s.add('<polyline points="%s" fill="none" stroke="%s" stroke-width="3"/>' % (" ".join("%d,%d" % p for p in pts), PINK))
    s.line(50, 220, 600, 220, LINE); s.line(60, 60, 60, 220, LINE)
    for (x, l, c) in [(95, "A", GRN), (165, "D", BLUE), (300, "S", AMB), (460, "R", VIO)]:
        s.text(x, 210 if l != "S" else 120, l, 16, c, weight="700")
    s.line(60, 244, 400, 244, GRN, 4); s.text(230, 264, "gate on (POKE S+4,17)", 11, GRN)
    s.line(400, 244, 520, 244, RED, 4); s.text(470, 264, "gate off (16)", 11, RED)
    s.text(560, 100, "S+5 = attack×16 + decay", 11, DIM, anchor="end"); s.text(560, 84, "S+6 = sustain×16 + release", 11, DIM, anchor="end")
    return s


def f_waves():
    s = Svg(640, 240, "SID waveforms", "The four basic waveforms: triangle (soft, flute-like), sawtooth (bright, brassy), pulse (hollow, reedy) and noise (hiss, drums, explosions).")
    head(s, "Four voices of the SID")
    W = [("triangle", 16, "M0 40 L20 0 L40 40 L60 0 L80 40 L100 0 L120 40", GRN), ("sawtooth", 32, "M0 40 L30 0 L30 40 L60 0 L60 40 L90 0 L90 40 L120 0", BLUE),
         ("pulse", 64, "M0 40 L0 0 L20 0 L20 40 L40 40 L40 0 L60 0 L60 40 L80 40 L80 0 L100 0 L100 40 L120 40", AMB), ("noise", 128, "M0 22 L8 4 L14 34 L22 10 L30 40 L38 16 L46 30 L54 2 L62 26 L70 12 L78 38 L86 6 L94 28 L102 18 L110 36 L120 8", PINK)]
    for i, (n, v, d, c) in enumerate(W):
        x = 24 + i * 152
        s.rect(x, 50, 140, 120, stroke=c, r=8)
        s.add('<path transform="translate(%d,78)" d="%s" fill="none" stroke="%s" stroke-width="2.2"/>' % (x + 10, d, c))
        s.text(x + 70, 145, n, 13, TX); mono(s, x + 70, 162, "S+4 = %d+1" % v, 11, DIM)
    s.text(320, 206, "Add 1 (the gate bit) to start the note; write the value without the 1 to let it fade.", 12, AMB)
    return s


def f_joystick():
    s = Svg(640, 300, "Joystick bits", "A joystick has five switches: up 1, down 2, left 4, right 8, fire 16. A pressed switch reads as 0, so PEEK(56320) drops from 127 when you push.")
    head(s, "Five switches, read as bits")
    cx, cy = 150, 150
    s.add('<circle cx="%d" cy="%d" r="80" fill="%s" stroke="%s" stroke-width="1.5"/>' % (cx, cy, PANEL, LINE))
    s.add('<circle cx="%d" cy="%d" r="20" fill="%s"/>' % (cx, cy, RED))
    for (dx, dy, t, c) in [(0, -60, "up 1", GRN), (0, 66, "down 2", GRN), (-62, 4, "left 4", BLUE), (62, 4, "right 8", BLUE)]:
        s.text(cx + dx, cy + dy, t, 12, c)
    s.text(cx, cy + 4, "16", 11, TX); s.text(cx, 256, "fire 16", 12, RED)
    rows = [("nothing pressed", "127", "0111 1111"), ("up", "126", "0111 1110"), ("fire", "111", "0110 1111"), ("left + fire", "107", "0110 1011")]
    s.text(450, 64, "PEEK(56320) for port 2", 12, DIM)
    for i, (a, b, c) in enumerate(rows):
        y = 80 + i * 40
        s.rect(300, y, 310, 32, stroke=LINE, r=6)
        s.text(312, y + 21, a, 12, TX, anchor="start"); mono(s, 470, y + 21, b, 12, AMB); mono(s, 550, y + 21, c, 11, DIM)
    s.text(450, 260, "test one switch: IF (J AND 16)=0 THEN fire is down", 11, AMB)
    return s


def f_ports():
    s = Svg(640, 330, "Where the ports are", "Schematic of the C64 case seen from above: control ports and power on the right side; expansion, RF, audio/video, serial, cassette and user ports along the back.")
    head(s, "The ports around the case (schematic, not to scale)")
    s.rect(70, 90, 440, 170, fill=PANEL, stroke=DIM, r=16)
    s.text(290, 180, "keyboard (front)", 13, DIM)
    s.rect(110, 230, 360, 18, fill=BG, stroke=LINE, r=4)
    back = [("expansion", PINK), ("RF", DIM), ("A/V", DIM), ("serial", BLUE), ("cassette", AMB), ("user", GRN)]
    for i, (t, c) in enumerate(back):
        x = 80 + i * 72
        s.rect(x, 62, 60, 22, fill=BG, stroke=c, r=4); s.text(x + 30, 54, t, 11, c)
    s.text(290, 40, "back edge", 11, DIM)
    side = [("power", RED, 110), ("switch", RED, 140), ("port 2", VIO, 180), ("port 1", VIO, 220)]
    for t, c, y in side:
        s.rect(512, y - 12, 22, 24, fill=BG, stroke=c, r=4); s.text(544, y + 4, t, 11, c, anchor="start")
    s.text(320, 296, "Port 1 sits nearest the front; most games read the joystick in port 2.", 12, AMB)
    s.text(320, 316, "The order of the rear sockets varies a little between case versions.", 11, DIM)
    return s


def f_dsub():
    s = Svg(640, 260, "Control port pins", "The control ports are 9-pin D-sub sockets. Pins 1 to 4 are the directions, 6 is fire, 7 is +5 volts, 8 is ground, and 5 and 9 read paddles.")
    head(s, "Control port: 9 pins (looking at the C64 socket)")
    s.add('<path d="M140 70 L500 70 L470 170 L170 170 Z" fill="%s" stroke="%s" stroke-width="2"/>' % (PANEL, VIO))
    labels = {1: ("up", GRN), 2: ("down", GRN), 3: ("left", BLUE), 4: ("right", BLUE), 5: ("paddle Y", DIM), 6: ("fire", RED), 7: ("+5 V", AMB), 8: ("ground", DIM), 9: ("paddle X", DIM)}
    for i in range(5):
        x = 190 + i * 65
        s.add('<circle cx="%d" cy="100" r="10" fill="%s"/>' % (x, labels[i + 1][1])); s.text(x, 90 - 6, str(i + 1), 11, TX)
        s.text(x, 128, labels[i + 1][0], 10, labels[i + 1][1])
    for i in range(4):
        x = 222 + i * 65
        s.add('<circle cx="%d" cy="148" r="10" fill="%s"/>' % (x, labels[i + 6][1])); s.text(x, 176, str(i + 6), 11, TX)
        s.text(x, 194, labels[i + 6][0], 10, labels[i + 6][1])
    s.text(320, 232, "A switch connects its pin to ground (pin 8); that is why pressed reads 0.", 12, AMB)
    return s


def f_userport():
    s = Svg(640, 270, "The user port", "The user port is a 24-contact edge connector on the main board: 12 contacts on top (1 to 12) and 12 underneath (A to N). The eight data lines PB0 to PB7 sit on the bottom row.")
    head(s, "User port: an edge of the circuit board")
    s.rect(40, 90, 560, 70, fill="#14321f", stroke=GRN, r=4)
    top = ["GND", "+5V", "RESET", "CNT1", "SP1", "CNT2", "SP2", "PC2", "ATN", "9VAC", "9VAC", "GND"]
    bot = [("A", "GND"), ("B", "FLAG2"), ("C", "PB0"), ("D", "PB1"), ("E", "PB2"), ("F", "PB3"), ("H", "PB4"), ("J", "PB5"), ("K", "PB6"), ("L", "PB7"), ("M", "PA2"), ("N", "GND")]
    for i in range(12):
        x = 52 + i * 46
        s.rect(x, 96, 30, 24, fill=AMB, stroke="none", r=2); s.text(x + 15, 113, str(i + 1), 10, "#000")
        s.text(x + 15, 82, top[i], 9, DIM)
        c = GRN if bot[i][1].startswith("PB") else DIM
        s.rect(x, 130, 30, 24, fill=AMB if c == DIM else GRN, stroke="none", r=2); s.text(x + 15, 147, bot[i][0], 10, "#000")
        s.text(x + 15, 176, bot[i][1], 9, c)
    s.text(320, 206, "PB0-PB7 are cell 56577; cell 56579 chooses which are outputs (1) or inputs (0).", 12, AMB)
    s.text(320, 230, "Each line is a 5 V logic signal: always add a resistor before an LED.", 12, DIM)
    return s


def f_gameloop():
    s = Svg(640, 260, "A game loop", "A game repeats the same steps many times a second: read the controls, move things, check rules and score, make sound and pictures, then go round again.")
    head(s, "Every game is one loop")
    steps = [("read", "joystick, keys", BLUE), ("move", "change X and Y", GRN), ("rules", "hits, score", AMB), ("show", "sprites, sound", PINK)]
    for i, (t, sub, c) in enumerate(steps):
        x = 30 + i * 150
        s.box(x, 70, 130, 64, t, sub, c)
        if i < 3: s.arrow(x + 130, 102, x + 150, 102)
    s.add('<path d="M565 134 C 565 210, 95 210, 95 134" fill="none" stroke="%s" stroke-width="1.8" marker-end="url(#ah)"/>' % VIO)
    s.text(330, 226, "GOTO back to the top", 12, VIO)
    return s


def f_regs():
    s = Svg(640, 300, "The 6510 registers", "The processor has three small working registers, A, X and Y, each holding one byte, a program counter PC that points at the next instruction, a stack pointer and a set of flags.")
    head(s, "Inside the 6510: tiny pockets")
    for i, (n, d, c) in enumerate([("A", "accumulator: maths, loads, stores", VIO), ("X", "counter and index", BLUE), ("Y", "second counter and index", BLUE)]):
        y = 56 + i * 52
        s.rect(40, y, 70, 40, fill=BG, stroke=c, r=6); mono(s, 75, y + 26, n, 18, c)
        s.text(126, y + 25, d, 12, TX, anchor="start")
    s.rect(40, 214, 70, 40, fill=BG, stroke=AMB, r=6); mono(s, 75, 240, "PC", 16, AMB); s.text(126, 239, "where we are", 12, TX, anchor="start")
    s.text(470, 60, "flags (one bit each)", 12, DIM)
    for i, (f, d) in enumerate([("N", "negative"), ("V", "overflow"), ("B", "break"), ("D", "decimal"), ("I", "interrupts off"), ("Z", "result was zero"), ("C", "carry")]):
        y = 74 + i * 28
        s.rect(400, y, 26, 22, fill=BG, stroke=GRN if f in "ZC" else LINE, r=4); mono(s, 413, y + 16, f, 12, GRN if f in "ZC" else DIM)
        s.text(436, y + 16, d, 11, TX if f in "ZC" else DIM, anchor="start")
    s.text(320, 288, "Z and C are the ones you use first: BEQ/BNE test Z, BCC/BCS test C.", 12, AMB)
    return s


def f_sys():
    s = Svg(640, 250, "From assembly to running code", "The lab's assembler turns your text into bytes, puts them at 49152, and BASIC starts them with SYS 49152. RTS returns to BASIC.")
    head(s, "Text, bytes, SYS, RTS")
    s.box(24, 60, 140, 70, "lda #2", "sta $d020", BLUE); s.text(94, 150, "your text", 11, DIM)
    s.box(186, 60, 140, 70, "A9 02", "8D 20 D0 60", VIO); s.text(256, 150, "bytes at $C000", 11, DIM)
    s.box(348, 60, 120, 70, "SYS 49152", "BASIC calls it", GRN)
    s.box(490, 60, 126, 70, "RTS", "back to READY.", AMB)
    for x in (164, 326, 468): s.arrow(x, 95, x + 22, 95)
    s.text(320, 200, "$C000 is hexadecimal for 49152. The $ means hex: base 16, digits 0-9 and A-F.", 12, AMB)
    return s


def f_loopx():
    s = Svg(640, 270, "A counting loop in assembly", "X starts at 0. The body stores A into $0400 plus X. INX adds one, CPX compares with 40, BNE jumps back while they are not equal.")
    head(s, "The X loop: store, count, compare, branch")
    lines = [("      ldx #0", "X = 0"), ("loop: sta $0400,x", "cell 1024+X = A"), ("      inx", "X = X + 1"), ("      cpx #40", "is X 40 yet?"), ("      bne loop", "no: go to loop")]
    for i, (c, d) in enumerate(lines):
        y = 54 + i * 34
        s.rect(60, y, 230, 26, fill=BG, stroke=LINE, r=4); mono(s, 70, y + 18, c, 12, TX, "start"); s.text(310, y + 18, d, 12, DIM, anchor="start")
    s.add('<path d="M60 203 C 20 203, 20 101, 60 101" fill="none" stroke="%s" stroke-width="1.8" marker-end="url(#ah)"/>' % GRN)
    s.text(320, 250, "X counts 0..39: forty stores. When X reaches 40, Z is set and BNE falls through.", 12, AMB)
    return s


def f_raster():
    s = Svg(640, 300, "The raster beam", "The picture is drawn line by line, top to bottom, 50 times a second (PAL). $D012 holds the line being drawn. A raster interrupt calls your code when the beam reaches a chosen line.")
    head(s, "The picture is drawn one line at a time")
    s.rect(60, 50, 300, 210, fill="#6C5EB5", stroke=LINE, r=4); s.rect(100, 84, 220, 142, fill="#352879", stroke="none", r=2)
    for i in range(12): s.line(60, 60 + i * 17, 360, 60 + i * 17, "#7d70c8", 0.6)
    s.line(60, 160, 360, 160, AMB, 3); s.text(366, 164, "line 128: IRQ!", 12, AMB, anchor="start")
    s.arrow(60, 60, 360, 60, PINK); s.text(210, 46, "beam", 11, PINK)
    for i, (k, v) in enumerate([("lines per frame (PAL)", "312"), ("cycles per line", "63"), ("cycles per frame", "19656"), ("frames per second", "about 50")]):
        y = 196 + i * 22
        s.text(470, y, k, 11, DIM, anchor="end"); mono(s, 480, y, v, 12, TX, "start")
    return s


def f_cc65():
    s = Svg(640, 230, "The cc65 toolchain", "A C file is compiled by cc65 into assembly, assembled by ca65 into an object file, and linked by ld65 with the C library into a PRG that the C64 runs.")
    head(s, "From C to a C64 program")
    st = [("hello.c", "you write", BLUE), ("cc65", "compiler", VIO), ("ca65", "assembler", VIO), ("ld65", "linker + library", VIO), ("hello.prg", "runs on C64", GRN)]
    for i, (t, sub, c) in enumerate(st):
        x = 16 + i * 126
        s.box(x, 70, 110, 64, t, sub, c)
        if i < 4: s.arrow(x + 110, 102, x + 126, 102)
    s.text(320, 180, "In the lab, all three tools run inside the app, compiled to WebAssembly.", 12, AMB)
    return s


def f_disk():
    s = Svg(640, 300, "Disk and tape", "A 1541 floppy has 35 circular tracks cut into sectors; the directory lives on track 18. A tape stores bits as short, medium and long pulses.")
    head(s, "Storing programs: disk and tape")
    cx, cy = 160, 160
    for r in range(110, 20, -9): s.add('<circle cx="%d" cy="%d" r="%d" fill="none" stroke="%s" stroke-width="1"/>' % (cx, cy, r, LINE))
    s.add('<circle cx="%d" cy="%d" r="65" fill="none" stroke="%s" stroke-width="5"/>' % (cx, cy, AMB))
    s.add('<circle cx="%d" cy="%d" r="18" fill="%s"/>' % (cx, cy, BG))
    s.text(cx, 290, "track 18 = directory", 12, AMB); s.text(cx, 46, "35 tracks, 683 blocks", 11, DIM)
    s.text(470, 64, "tape pulses", 12, DIM)
    for i, (n, w) in enumerate([("short", 14), ("medium", 20), ("long", 28)]):
        y = 84 + i * 50
        s.add('<path d="M380 %d l%d 0 l0 -24 l%d 0 l0 24 l%d 0 l0 -24 l%d 0 l0 24" fill="none" stroke="%s" stroke-width="2"/>' % (y + 26, 0, w, w, w, BLUE))
        s.text(560, y + 20, n, 12, TX, anchor="start")
    s.text(470, 250, "two pulses make one bit", 11, DIM)
    return s


def f_langs():
    s = Svg(640, 260, "Three languages, one chip", "BASIC, assembly and C all end up writing the same number into the same cell; the chip cannot tell which language did it.")
    head(s, "Three languages, one cell")
    for i, (t, code, c) in enumerate([("BASIC", "poke 53269,1", BLUE), ("Assembly", "lda #1 / sta $d015", VIO), ("C (cc65)", "POKE(53269U, 1);", GRN)]):
        y = 52 + i * 62
        s.rect(30, y, 260, 48, stroke=c, r=8); s.text(46, y + 20, t, 12, c, anchor="start"); mono(s, 46, y + 38, code, 12, TX, "start")
        s.arrow(290, y + 24, 400, 138, c)
    s.box(400, 104, 210, 68, "cell 53269", "sprite enable: 1", AMB)
    s.text(320, 244, "Same address, same value, same result: sprite 0 appears.", 12, DIM)
    return s


ALL = {"c64-chips.svg": f_chips, "c64-ready.svg": f_ready, "c64-lines.svg": f_lines, "c64-vars.svg": f_vars, "c64-for.svg": f_for, "c64-gosub.svg": f_gosub,
       "c64-memmap.svg": f_memmap, "c64-palette.svg": f_palette, "c64-screen.svg": f_screen, "c64-sprite.svg": f_sprite, "c64-adsr.svg": f_adsr, "c64-waves.svg": f_waves,
       "c64-joystick.svg": f_joystick, "c64-ports.svg": f_ports, "c64-dsub.svg": f_dsub, "c64-userport.svg": f_userport, "c64-gameloop.svg": f_gameloop,
       "c64-regs.svg": f_regs, "c64-sys.svg": f_sys, "c64-loopx.svg": f_loopx, "c64-raster.svg": f_raster, "c64-cc65.svg": f_cc65, "c64-disk.svg": f_disk, "c64-langs.svg": f_langs}


def build_all(outdir="/tmp/c64_figs"):
    os.makedirs(outdir, exist_ok=True)
    res = {}
    for fn, f in ALL.items():
        svg = f().render(); open(os.path.join(outdir, fn), "w", encoding="utf-8").write(svg); res[fn] = svg
    return res


if __name__ == "__main__":
    print(len(build_all()), "figures")
