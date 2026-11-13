# -*- coding: utf-8 -*-
"""C64 Lab levels for the beginners course. Every level is checked by c64lab/test_labs.js on the real core:
the starter must not reach the goals, the solution must."""


def LV(title, intro, code, solution, goals, hint=None, tab="basic", test=None, pad=False, direct=False):
    d = {"title": title, "intro": intro, "tab": tab, "code": code.strip("\n") + "\n" if code.strip() else "", "solution": solution.strip("\n") + "\n", "goals": goals}
    if hint: d["hint"] = hint
    if test: d["test"] = test
    if pad: d["pad"] = True
    if direct: d["direct"] = True
    return d


def G(t, **kw):
    kw["t"] = t
    return kw


BALL = [0, 126, 0, 1, 255, 128, 3, 255, 192, 7, 255, 224, 15, 255, 240, 15, 255, 240, 15, 255, 240, 15, 255, 240, 7, 255, 224, 3, 255, 192, 1, 255, 128, 0, 126, 0] + [0] * 27
BALL_DATA = "\n".join("%d data %s" % (100 + 10 * i, ",".join(str(v) for v in BALL[i * 9:(i + 1) * 9])) for i in range(7))
BALL_ASM = "\n".join("      .byte " + ",".join("$%02x" % v for v in BALL[i * 3:(i + 1) * 3]) for i in range(21))

LABS = {}

LABS["hello"] = dict(title="Lab 1: Switch it on", intro="This is a real Commodore 64 running in the app. Tap the screen to give it the keyboard, or use the Type box under it.", levels=[
 LV("Say hello", "Change the program so the C64 prints <code>HELLO, C64</code>. Then press <b>Run on the C64</b>.",
    '10 print "hi"', '10 print "hello, c64"', [G("HELLO, C64 is on the screen", screen="HELLO, C64")], "Change the text between the quotes."),
 LV("A calculator", "No program this time. In the Type box under the screen, type <code>print 6*7</code> and press Type. The C64 answers straight away. This is called direct mode.",
    "", "print 6*7", [G("The answer 42 is on the screen", screen=" 42")], "Type: print 6*7", direct=True, test=[{"type": "print 6*7\n"}, {"run": 30}]),
 LV("Change the colours", "Still in direct mode. Type <code>poke 53280,0</code> to make the border black. Then try other numbers from 0 to 15.",
    "", "poke 53280,0", [G("The border is black (colour 0)", border=0)], "Type: poke 53280,0", direct=True, test=[{"type": "poke 53280,0\n"}, {"run": 30}]),
])

LABS["first"] = dict(title="Lab 2: Your first programs", intro="A program is a list of numbered lines. RUN starts at the lowest number.", levels=[
 LV("Three lines", "Add a line 30 so the program prints ONE, TWO and THREE.",
    '10 print "one"\n20 print "two"', '10 print "one"\n20 print "two"\n30 print "three"', [G("ONE, TWO and THREE are printed", screen=["ONE", "TWO", "THREE"])], "30 print \"three\""),
 LV("In the right order", "The C64 sorts lines by number. Change the line numbers so it prints <code>READY SET GO</code>.",
    '10 print "set ";\n20 print "ready ";\n30 print "go"', '10 print "ready ";\n20 print "set ";\n30 print "go"', [G("READY SET GO is printed", screen="READY SET GO")], "Swap the numbers 10 and 20."),
 LV("Forever", "Add a line that jumps back to line 10, so the message fills the screen. Stop it with the RUN/STOP button.",
    '10 print "c64 rules! ";', '10 print "c64 rules! ";\n20 goto 10', [G("The message is printed at least 20 times", count=["RULES", 20])], "20 goto 10"),
 LV("Leave a note", "REM is a remark: the C64 ignores it, people read it. Add a REM line, and make the program print <code>DONE</code>.",
    '10 print "working"', '5 rem my first note\n10 print "working"\n20 print "done"', [G("DONE is printed", screen="DONE"), G("The program has a REM line", src=r"^\s*\d+\s*rem", live=True)], "5 rem this is a note"),
])
LABS["first"]["levels"][3]["goals"][1]["src"] = r"\d+\s*rem"

LABS["vars"] = dict(title="Lab 3: Variables and INPUT", intro="A variable is a named box. Names ending in $ hold text.", levels=[
 LV("Number boxes", "Make the program print 42 by multiplying the two boxes.",
    '10 a=7\n20 b=6\n30 print a+b', '10 a=7\n20 b=6\n30 print a*b', [G("42 is printed", screen=" 42")], "Use * to multiply."),
 LV("Text boxes", "This stops with ?TYPE MISMATCH because text needs a box whose name ends in $. Fix it so it prints HELLO, ADA.",
    '10 n="ada"\n20 print "hello, ";n', '10 n$="ada"\n20 print "hello, ";n$', [G("HELLO, ADA is printed", screen="HELLO, ADA")], "Use n$ in both lines."),
 LV("Ask a question", "INPUT waits for the user. Run it, tap the screen (or use the Type box), type 9 and press RETURN. Make it answer with your age next year.",
    '10 input "how old are you";a\n20 print "next year you are";a', '10 input "how old are you";a\n20 print "next year you are";a+1',
    [G("After typing 9, it prints NEXT YEAR YOU ARE 10", screen="NEXT YEAR YOU ARE 10")], "Print a+1.", test=[{"run": 30}, {"type": "9\n"}, {"run": 40}]),
 LV("Join text", "Ask for a name and greet it. Typing ADA should print <code>HI ADA!</code>",
    '10 input "name";n$\n20 print "hi"', '10 input "name";n$\n20 print "hi ";n$;"!"',
    [G("After typing ADA, it prints HI ADA!", screen="HI ADA!")], "print \"hi \";n$;\"!\"", test=[{"run": 30}, {"type": "ada\n"}, {"run": 40}]),
])

LABS["loops"] = dict(title="Lab 4: Decisions and loops", intro="FOR repeats. IF decides.", levels=[
 LV("Count to ten", "This counts to 5. Make it count to 10.",
    '10 for i=1 to 5\n20 print i;\n30 next i', '10 for i=1 to 10\n20 print i;\n30 next i', [G("The numbers up to 10 are printed", screen=" 9  10")], "Change the 5."),
 LV("Seven times table", "Print the seven times table from 7 to 70.",
    '10 for i=1 to 10\n20 print i\n30 next i', '10 for i=1 to 10\n20 print i*7\n30 next i', [G("49 and 70 are printed", screen=[" 49", " 70"])], "print i*7"),
 LV("Countdown", "Count down from 10 to 1 with STEP -1, then print LIFTOFF.",
    '10 for i=10 to 1\n20 print i;\n30 next i\n40 print "liftoff"', '10 for i=10 to 1 step -1\n20 print i;\n30 next i\n40 print "liftoff"',
    [G("3 2 1 is printed", screen=" 3  2  1"), G("LIFTOFF is printed", screen="LIFTOFF")], "for i=10 to 1 step -1"),
 LV("Big or small", "IF chooses. The test is the wrong way round. Typing 50 should print BIG.",
    '10 input "a number";n\n20 if n<10 then print "big"\n30 if n>=10 then print "small"', '10 input "a number";n\n20 if n>=10 then print "big"\n30 if n<10 then print "small"',
    [G("After typing 50, it prints BIG", screen="BIG"), G("It does not print SMALL", noscreen="SMALL", live=True)], "Swap the two tests.", test=[{"run": 30}, {"type": "50\n"}, {"run": 40}]),
])

LABS["tools"] = dict(title="Lab 5: Subroutines, DATA and arrays", intro="Tools that keep bigger programs tidy.", levels=[
 LV("A subroutine", "GOSUB jumps to a helper and RETURN comes back. Call the line-drawing helper three times.",
    '10 gosub 100\n20 print "title"\n90 end\n100 print "----------"\n110 return', '10 gosub 100\n20 print "title"\n30 gosub 100\n40 gosub 100\n90 end\n100 print "----------"\n110 return',
    [G("The line is drawn three times", count=["----------", 3])], "Add 30 gosub 100 and 40 gosub 100."),
 LV("Read the DATA", "READ takes the next number from the DATA line. Add up all four numbers and print TOTAL 50.",
    '10 t=0\n20 for i=1 to 3\n30 read n:t=t+n\n40 next i\n50 print "total";t\n60 data 5,10,15,20', '10 t=0\n20 for i=1 to 4\n30 read n:t=t+n\n40 next i\n50 print "total";t\n60 data 5,10,15,20',
    [G("TOTAL 50 is printed", screen="TOTAL 50")], "The loop must run four times."),
 LV("An array", "DIM makes a row of numbered boxes. Fill A(1) to A(5), then print them backwards.",
    '10 dim a(5)\n20 for i=1 to 5:a(i)=i:next\n30 for i=1 to 5:print a(i);:next', '10 dim a(5)\n20 for i=1 to 5:a(i)=i:next\n30 for i=5 to 1 step -1:print a(i);:next',
    [G("5 4 3 2 1 is printed", screen=" 5  4  3  2  1")], "for i=5 to 1 step -1"),
 LV("Roll a dice", "RND(1) gives a random fraction. This dice rolls 0 to 6. Fix it to roll 1 to 6. The program rolls 200 times and reports the smallest and largest.",
    '10 lo=9:hi=0\n20 for i=1 to 200\n30 d=int(rnd(1)*7)\n40 if d<lo then lo=d\n50 if d>hi then hi=d\n60 next\n70 print "min";lo;"max";hi',
    '10 lo=9:hi=0\n20 for i=1 to 200\n30 d=int(rnd(1)*6)+1\n40 if d<lo then lo=d\n50 if d>hi then hi=d\n60 next\n70 print "min";lo;"max";hi',
    [G("MIN 1 MAX 6 is printed", screen="MIN 1 MAX 6")], "int(rnd(1)*6)+1", test=[{"run": 500}]),
])

LABS["poke"] = dict(title="Lab 6: PEEK and POKE", intro="POKE writes a number into a memory cell. PEEK reads one.", levels=[
 LV("Black screen", "The border is cell 53280, the background is 53281. Make both black (0).",
    '10 poke 53280,2', '10 poke 53280,0\n20 poke 53281,0', [G("Border is black", border=0), G("Background is black", bg=0)], "poke 53281,0"),
 LV("Read a cell", "PEEK(53280) answers 254, because only the lowest four bits are the colour. Print PEEK(53280) AND 15 to see the real colour number, 14.",
    '10 print peek(53280)', '10 print peek(53280) and 15', [G("14 is printed", screen=" 14"), G("254 is not printed", noscreen="254", live=True)], "print peek(53280) and 15"),
 LV("Sixteen colours", "Loop through all 16 border colours, 0 to 15, with a short wait in between.",
    '10 for c=0 to 7\n20 poke 53280,c\n30 for d=1 to 100:next d\n40 next c', '10 for c=0 to 15\n20 poke 53280,c\n30 for d=1 to 100:next d\n40 next c',
    [G("The border ends on colour 15", border=15)], "for c=0 to 15", test=[{"run": 400}]),
 LV("One byte", "A cell holds 0 to 255. POKE 49152,300 stops with ?ILLEGAL QUANTITY. Store 200 instead and print it back.",
    '10 poke 49152,300\n20 print peek(49152)', '10 poke 49152,200\n20 print peek(49152)', [G("Cell 49152 holds 200", peek=[49152, 200]), G("200 is printed", screen=" 200")], "Use 200."),
])

LABS["screen"] = dict(title="Lab 7: The screen is memory", intro="The 1000 character cells start at 1024. Their colours start at 55296.", levels=[
 LV("Top left", "Put the letter A (screen code 1) in the middle of the screen (cell 1524) and colour it white (1) at 55796.",
    '10 poke 1524,2\n20 poke 55796,1', '10 poke 1524,1\n20 poke 55796,1', [G("Cell 1524 holds an A", peek=[1524, 1]), G("Its colour is white", peekmask=[55796, 15, 1])], "poke 1524,1"),
 LV("A row of hearts", "Fill the whole of row 4 (40 cells, starting at 1184) with red hearts (code 83, colour 2).",
    '10 for i=0 to 9\n20 poke 1184+i,83\n30 poke 55456+i,2\n40 next', '10 for i=0 to 39\n20 poke 1184+i,83\n30 poke 55456+i,2\n40 next',
    [G("The first cell is a heart", peek=[1184, 83]), G("The last cell of the row is a red heart", peek=[1223, 83]), G("It is red", peekmask=[55495, 15, 2])], "for i=0 to 39"),
 LV("Row and column", "The cell for a row and column is 1024 + row*40 + column. Put a star (code 42) at row 12, column 20.",
    '10 r=12:c=20\n20 poke 1024+r+c,42', '10 r=12:c=20\n20 poke 1024+r*40+c,42', [G("The star is at row 12, column 20", peek=[1524, 42])], "1024+r*40+c"),
 LV("Colour with PRINT", "PRINT can change colour too. CHR$(147) clears the screen and CHR$(28) switches to red. Print RED in red at the top.",
    '10 print chr$(147);"red"', '10 print chr$(147);chr$(28);"red"', [G("RED is on the top row", row=[0, "RED"]), G("It is drawn in red", peekmask=[55296, 15, 2])], "chr$(147);chr$(28);\"red\""),
])

LABS["sprites"] = dict(title="Lab 8: Sprites", intro="A sprite is a small picture the video chip can place anywhere. V=53248 is the start of the video chip.", levels=[
 LV("Switch it on", "This makes a solid block sprite, but it never appears. Turn sprite 0 on by writing 1 to V+21.",
    '10 v=53248\n20 for i=0 to 62:poke 832+i,255:next\n30 poke 2040,13\n40 poke v,160:poke v+1,120\n50 poke v+39,1',
    '10 v=53248\n20 for i=0 to 62:poke 832+i,255:next\n30 poke 2040,13\n40 poke v,160:poke v+1,120\n50 poke v+39,1\n60 poke v+21,1',
    [G("Sprite 0 is switched on", peekmask=[53269, 1, 1]), G("The pointer says block 13", peek=[2040, 13])], "60 poke v+21,1", test=[{"run": 200}]),
 LV("Move it", "Slide the sprite across by changing its X position (V) in a loop from 30 to 200.",
    '10 v=53248\n20 for i=0 to 62:poke 832+i,255:next\n30 poke 2040,13:poke v+39,1:poke v+21,1\n40 poke v,30:poke v+1,120',
    '10 v=53248\n20 for i=0 to 62:poke 832+i,255:next\n30 poke 2040,13:poke v+39,1:poke v+21,1\n40 poke v+1,120\n50 for x=30 to 200:poke v,x:next',
    [G("The sprite reached X position 200", peek=[53248, 200])], "for x=30 to 200:poke v,x:next", test=[{"run": 400}]),
 LV("Draw a ball", "The 63 numbers in the DATA lines draw a ball. Write the loop that READs them into cells 832 to 894.",
    '10 v=53248\n20 rem read the 63 numbers here\n30 poke 2040,13:poke v,160:poke v+1,120\n40 poke v+39,7:poke v+21,1\n' + BALL_DATA,
    '10 v=53248\n20 for i=0 to 62:read a:poke 832+i,a:next\n30 poke 2040,13:poke v,160:poke v+1,120\n40 poke v+39,7:poke v+21,1\n' + BALL_DATA,
    [G("The ball data is in memory", peek=[833, 126]), G("The middle of the ball is filled", peek=[845, 255]), G("Sprite 0 is on", peekmask=[53269, 1, 1])], "for i=0 to 62:read a:poke 832+i,a:next", test=[{"run": 300}]),
 LV("Big and yellow", "Make the ball yellow (colour 7 at V+39) and double its size (1 at V+29 for width and V+23 for height).",
    '10 v=53248\n20 for i=0 to 62:read a:poke 832+i,a:next\n30 poke 2040,13:poke v,160:poke v+1,120\n40 poke v+39,1:poke v+21,1\n' + BALL_DATA,
    '10 v=53248\n20 for i=0 to 62:read a:poke 832+i,a:next\n30 poke 2040,13:poke v,160:poke v+1,120\n40 poke v+39,7:poke v+21,1\n50 poke v+29,1:poke v+23,1\n' + BALL_DATA,
    [G("The sprite is yellow", peekmask=[53287, 15, 7]), G("Double width", peekmask=[53277, 1, 1]), G("Double height", peekmask=[53271, 1, 1])], "poke v+29,1:poke v+23,1", test=[{"run": 300}]),
])

LABS["sound"] = dict(title="Lab 9: Sound", intro="The sound chip starts at S=54272. Tap the screen once so the app may play sound.", levels=[
 LV("First beep", "Everything is set except the volume. Set S+24 to 15 to hear the note.",
    '10 s=54272\n20 poke s+5,9:poke s+6,240\n30 poke s+1,34:poke s,75\n40 poke s+4,17',
    '10 s=54272\n15 poke s+24,15\n20 poke s+5,9:poke s+6,240\n30 poke s+1,34:poke s,75\n40 poke s+4,17',
    [G("Volume is 15", peek=[54296, 15]), G("The sound chip is making sound", sound=True)], "poke s+24,15"),
 LV("Higher", "The pitch is set by S+1 (coarse) and S (fine). Play a higher note: put 68 in S+1.",
    '10 s=54272:poke s+24,15\n20 poke s+5,9:poke s+6,240\n30 poke s+1,17:poke s,37\n40 poke s+4,17',
    '10 s=54272:poke s+24,15\n20 poke s+5,9:poke s+6,240\n30 poke s+1,68:poke s,149\n40 poke s+4,17',
    [G("The coarse pitch is 68", peek=[54273, 68]), G("Sound is playing", sound=True)], "poke s+1,68"),
 LV("Stop the note", "A note plays while its gate bit is on. After the wait loop, switch the gate off by writing 16 to S+4.",
    '10 s=54272:poke s+24,15\n20 poke s+5,9:poke s+6,240\n30 poke s+1,34:poke s,75\n40 poke s+4,17\n50 for d=1 to 300:next',
    '10 s=54272:poke s+24,15\n20 poke s+5,9:poke s+6,240\n30 poke s+1,34:poke s,75\n40 poke s+4,17\n50 for d=1 to 300:next\n60 poke s+4,16',
    [G("Sound was played", sound=True), G("The gate is off at the end", peek=[54276, 16])], "60 poke s+4,16", test=[{"run": 200}]),
 LV("A little tune", "Each pair in the DATA is a coarse and fine pitch. Play all four notes, then print DONE.",
    '10 s=54272:poke s+24,15:poke s+5,9:poke s+6,0\n20 for n=1 to 2\n30 read h,l:poke s+1,h:poke s,l\n40 poke s+4,17:for d=1 to 150:next:poke s+4,16\n50 next\n70 data 34,75,38,126,43,52,45,198',
    '10 s=54272:poke s+24,15:poke s+5,9:poke s+6,0\n20 for n=1 to 4\n30 read h,l:poke s+1,h:poke s,l\n40 poke s+4,17:for d=1 to 150:next:poke s+4,16\n50 next\n60 print "done"\n70 data 34,75,38,126,43,52,45,198',
    [G("The last note (coarse pitch 45) was played", peek=[54273, 45]), G("DONE is printed", screen="DONE"), G("Sound was played", sound=True)], "Loop four times, then print \"done\".", test=[{"run": 400}]),
])

LABS["input"] = dict(title="Lab 10: Joystick and keys", intro="Use the joystick pad under the screen. It is plugged into port 2.", levels=[
 LV("Read the joystick", "Port 2 is cell 56320. This reads the wrong port. Fix it, run it, and hold FIRE: the number changes from 127 to 111.",
    '10 print peek(56321)\n20 goto 10', '10 print peek(56320)\n20 goto 10', [G("With FIRE held, 111 is printed", screen=" 111")], "peek(56320)", pad=True, test=[{"run": 20}, {"joy": 16}, {"run": 40}, {"joy": 0}]),
 LV("Is fire pressed?", "A pressed button reads as a 0 bit. Fire is bit value 16. Print FIRE! when it is pressed.",
    '10 j=peek(56320)\n20 if (j and 1)=0 then print "fire!"\n30 goto 10', '10 j=peek(56320)\n20 if (j and 16)=0 then print "fire!"\n30 goto 10',
    [G("Pressing FIRE prints FIRE!", screen="FIRE!")], "(j and 16)=0", pad=True, test=[{"run": 20}, {"joy": 16}, {"run": 40}, {"joy": 0}]),
 LV("Wait for a key", "GET reads one key without waiting, so this ends at once. Loop back to line 10 until a key arrives. Then tap the screen and press Q.",
    '10 get a$\n30 print "you pressed ";a$', '10 get a$\n20 if a$="" then 10\n30 print "you pressed ";a$',
    [G("Pressing Q prints YOU PRESSED Q", screen="YOU PRESSED Q")], "20 if a$=\"\" then 10", test=[{"run": 30}, {"key": "q"}, {"run": 30}]),
 LV("Move a ball", "Move the ball (code 81) along row 12 with the joystick. Left works. Add the line for right (bit value 8), and push it to the right edge.",
    '10 x=20:print chr$(147)\n20 poke 1504+x,81\n30 j=peek(56320)\n40 if (j and 4)=0 and x>0 then poke 1504+x,32:x=x-1\n60 goto 20',
    '10 x=20:print chr$(147)\n20 poke 1504+x,81\n30 j=peek(56320)\n40 if (j and 4)=0 and x>0 then poke 1504+x,32:x=x-1\n50 if (j and 8)=0 and x<39 then poke 1504+x,32:x=x+1\n60 goto 20',
    [G("The ball reached the right edge", peek=[1543, 81])], "50 if (j and 8)=0 and x<39 then poke 1504+x,32:x=x+1", pad=True, test=[{"run": 20}, {"joy": 8}, {"run": 500}, {"joy": 0}]),
])

GAME_BASE = '10 v=53248:s=54272:sc=0:x=160:print chr$(147)\n20 for i=0 to 62:read a:poke 832+i,a:next\n30 poke 2040,13:poke v+39,7:poke v+1,200:poke v+21,1\n'
LABS["game"] = dict(title="Lab 12: Build a small game", intro="Three steps to a tiny game: move, score, and sound.", levels=[
 LV("Steer the ball", "The ball moves left. Add right (bit value 8, up to X 250). Hold RIGHT until it gets past X 240.",
    GAME_BASE + '40 j=peek(56320)\n50 if (j and 4)=0 and x>30 then x=x-6\n70 poke v,x\n90 goto 40\n' + BALL_DATA,
    GAME_BASE + '40 j=peek(56320)\n50 if (j and 4)=0 and x>30 then x=x-6\n60 if (j and 8)=0 and x<250 then x=x+6\n70 poke v,x\n90 goto 40\n' + BALL_DATA,
    [G("The ball moved past X 240", peekgt=[53248, 240])], "60 if (j and 8)=0 and x<250 then x=x+6", pad=True, test=[{"run": 150}, {"joy": 8}, {"run": 500}, {"joy": 0}]),
 LV("Keep score", "Each new press of FIRE should add one point. F remembers whether fire was already down. Add the line that increases SC and shows it. Press FIRE three times.",
    GAME_BASE + '40 j=peek(56320)\n50 if (j and 16)<>0 then f=0\n70 poke v,x\n90 goto 40\n' + BALL_DATA,
    GAME_BASE + '40 j=peek(56320)\n50 if (j and 16)<>0 then f=0\n60 if (j and 16)=0 and f=0 then f=1:sc=sc+1:print chr$(19);"score";sc\n70 poke v,x\n90 goto 40\n' + BALL_DATA,
    [G("After three presses the screen shows SCORE 3", screen="SCORE 3")], "60 if (j and 16)=0 and f=0 then f=1:sc=sc+1:print chr$(19);\"score\";sc", pad=True,
    test=[{"run": 150}, {"joy": 16}, {"run": 40}, {"joy": 0}, {"run": 40}, {"joy": 16}, {"run": 40}, {"joy": 0}, {"run": 40}, {"joy": 16}, {"run": 40}, {"joy": 0}, {"run": 40}]),
 LV("Add a blip", "Give each point a sound and a border flash: call the subroutine at 200 with GOSUB when a point is scored.",
    GAME_BASE + '35 poke s+24,15:poke s+5,9:poke s+1,40\n40 j=peek(56320)\n50 if (j and 16)<>0 then f=0\n60 if (j and 16)=0 and f=0 then f=1:sc=sc+1:print chr$(19);"score";sc\n70 poke v,x\n90 goto 40\n200 poke 53280,1:poke s+4,33:for d=1 to 30:next\n205 poke 49152,peek(49152)+1\n210 poke s+4,32:poke 53280,14:return\n' + BALL_DATA,
    GAME_BASE + '35 poke s+24,15:poke s+5,9:poke s+1,40\n40 j=peek(56320)\n50 if (j and 16)<>0 then f=0\n60 if (j and 16)=0 and f=0 then f=1:sc=sc+1:print chr$(19);"score";sc:gosub 200\n70 poke v,x\n90 goto 40\n200 poke 53280,1:poke s+4,33:for d=1 to 30:next\n205 poke 49152,peek(49152)+1\n210 poke s+4,32:poke 53280,14:return\n' + BALL_DATA,
    [G("A point was scored", screen="SCORE 1"), G("The subroutine ran once (it adds 1 to a tally at 49152)", peek=[49152, 1])], "Add :gosub 200 at the end of line 60.", pad=True, test=[{"run": 150}, {"joy": 16}, {"run": 60}, {"joy": 0}, {"run": 60}]),
])

LABS["asm1"] = dict(title="Lab 13: First machine code", intro="Now the same ideas in assembly, the language of the 6510 processor. Run assembles your text, puts the bytes at 49152 and starts them with SYS 49152.", levels=[
 LV("Red border", "LDA loads a number into the A register. STA stores A into a memory cell. Load 2 (red) and store it in $D020, the border (53280 in decimal).",
    '; make the border red\n*=$C000\n      lda #0\n      sta $d020\n      rts', '; make the border red\n*=$C000\n      lda #2\n      sta $d020\n      rts', [G("The border is red (colour 2)", border=2)], "lda #2", tab="asm"),
 LV("Background too", "Add two more lines: load 0 (black) and store it in $D021, the background.",
    '; red border, black background\n*=$C000\n      lda #2\n      sta $d020\n      rts', '; red border, black background\n*=$C000\n      lda #2\n      sta $d020\n      lda #0\n      sta $d021\n      rts',
    [G("The border is red", border=2), G("The background is black", bg=0)], "lda #0 then sta $d021, before rts", tab="asm"),
 LV("A letter on the screen", "Screen memory starts at $0400 (1024). Store screen code 1 (the letter A) there, and colour 1 (white) at $D800.",
    '; put an A in the top left\n*=$C000\n      lda #2\n      sta $0400\n      rts', '; put an A in the top left\n*=$C000\n      lda #1\n      sta $0400\n      sta $d800\n      rts',
    [G("Cell $0400 holds an A", peek=[1024, 1]), G("Its colour is white", peekmask=[55296, 15, 1])], "lda #1, sta $0400, sta $d800", tab="asm"),
])

LABS["asm2"] = dict(title="Lab 14: Loops and the KERNAL", intro="X is a counter register. The KERNAL is a set of ready-made routines in ROM.", levels=[
 LV("Fill a row", "This loop stores a heart (83) in ten cells. Make it fill all 40 cells of the top row.",
    '; a row of hearts\n*=$C000\n      ldx #0\n      lda #83\nloop: sta $0400,x\n      inx\n      cpx #10\n      bne loop\n      rts',
    '; a row of hearts\n*=$C000\n      ldx #0\n      lda #83\nloop: sta $0400,x\n      inx\n      cpx #40\n      bne loop\n      rts',
    [G("The first cell is a heart", peek=[1024, 83]), G("The last cell of the row is a heart", peek=[1063, 83])], "cpx #40", tab="asm"),
 LV("Print with the KERNAL", "JSR $FFD2 prints the character in A. This prints H. Add the lines to print I as well (character code 73).",
    '; say HI\n*=$C000\n      lda #72\n      jsr $ffd2\n      rts', '; say HI\n*=$C000\n      lda #72\n      jsr $ffd2\n      lda #73\n      jsr $ffd2\n      rts',
    [G("HI is printed", screen="HI")], "lda #73 then jsr $ffd2", tab="asm"),
 LV("Print a message", "This loop prints characters until it meets a zero byte. Change the message to HELLO FROM ASM.",
    '; print a string\n*=$C000\n      ldx #0\nloop: lda msg,x\n      beq done\n      jsr $ffd2\n      inx\n      bne loop\ndone: rts\nmsg:  .text "HELLO"\n      .byte 13,0',
    '; print a string\n*=$C000\n      ldx #0\nloop: lda msg,x\n      beq done\n      jsr $ffd2\n      inx\n      bne loop\ndone: rts\nmsg:  .text "HELLO FROM ASM"\n      .byte 13,0',
    [G("HELLO FROM ASM is printed", screen="HELLO FROM ASM")], "Change the text after .text", tab="asm"),
 LV("A sprite in assembly", "The same ball sprite, set up in machine code. One thing is missing: switch sprite 0 on by storing 1 in $D015.",
    '; ball sprite\n*=$C000\n      ldx #0\ncp:   lda spr,x\n      sta $0340,x\n      inx\n      cpx #63\n      bne cp\n      lda #13\n      sta $07f8\n      lda #160\n      sta $d000\n      lda #120\n      sta $d001\n      lda #7\n      sta $d027\n      rts\nspr:\n' + BALL_ASM,
    '; ball sprite\n*=$C000\n      ldx #0\ncp:   lda spr,x\n      sta $0340,x\n      inx\n      cpx #63\n      bne cp\n      lda #13\n      sta $07f8\n      lda #160\n      sta $d000\n      lda #120\n      sta $d001\n      lda #7\n      sta $d027\n      lda #1\n      sta $d015\n      rts\nspr:\n' + BALL_ASM,
    [G("Sprite 0 is on", peekmask=[53269, 1, 1]), G("The ball data was copied", peek=[833, 126])], "lda #1 then sta $d015, before rts", tab="asm"),
])

LABS["asm3"] = dict(title="Lab 15: Speed, timing and interrupts", intro="Machine code is fast enough to change colours many times while one picture is being drawn.", levels=[
 LV("Flicker", "INC adds one to a memory cell. Looping forever on the border colour gives stripes, because the colour changes many times per picture. Add the jump back to the label.",
    '; stripes\n*=$C000\nloop: inc $d020\n      rts', '; stripes\n*=$C000\nloop: inc $d020\n      jmp loop', [G("Many colours are on screen at once", colors=8)], "jmp loop", tab="asm"),
 LV("Steady bars", "Waiting for the raster line to change before each colour change makes steady bars. $D012 holds the current line. Store the line number in the border colour.",
    '; raster bars\n*=$C000\nloop: lda $d012\nwait: cmp $d012\n      beq wait\n      jmp loop', '; raster bars\n*=$C000\nloop: lda $d012\nwait: cmp $d012\n      beq wait\n      sta $d020\n      jmp loop',
    [G("Many colours are on screen at once", colors=8)], "sta $d020 before jmp loop", tab="asm"),
 LV("An interrupt", "An interrupt lets the video chip call your routine once per picture, while BASIC keeps working. The handler should count in $C100: add INC $C100.",
    '; raster interrupt\n*=$C000\n      sei\n      lda #<irq\n      sta $0314\n      lda #>irq\n      sta $0315\n      lda #$7f\n      sta $dc0d\n      lda #$01\n      sta $d01a\n      lda #$80\n      sta $d012\n      lda $d011\n      and #$7f\n      sta $d011\n      cli\n      rts\nirq:  inc $d020\n      lda #$ff\n      sta $d019\n      pla\n      tay\n      pla\n      tax\n      pla\n      rti',
    '; raster interrupt\n*=$C000\n      sei\n      lda #<irq\n      sta $0314\n      lda #>irq\n      sta $0315\n      lda #$7f\n      sta $dc0d\n      lda #$01\n      sta $d01a\n      lda #$80\n      sta $d012\n      lda $d011\n      and #$7f\n      sta $d011\n      cli\n      rts\nirq:  inc $d020\n      inc $c100\n      lda #$ff\n      sta $d019\n      pla\n      tay\n      pla\n      tax\n      pla\n      rti',
    [G("The handler has counted interrupts in $C100", peekgt=[49408, 5])], "Add inc $c100 after inc $d020.", tab="asm", test=[{"poke": [49408, 0]}, {"run": 150}]),
])

CINC = '#include <stdio.h>\n#include <peekpoke.h>\n\n'
LABS["c1"] = dict(title="Lab 16: C with cc65", intro="C code is compiled inside the app by cc65, assembled by ca65 and linked by ld65, then run on the same C64. The first build loads the tools and takes a few seconds.", levels=[
 LV("Hello from C", "Change the message so the program prints HELLO FROM C. In cc65, small letters in your C text appear as capitals on the C64 screen.",
    CINC + 'int main(void) {\n    printf("hello\\n");\n    return 0;\n}', CINC + 'int main(void) {\n    printf("hello from c\\n");\n    return 0;\n}',
    [G("HELLO FROM C is printed", screen="HELLO FROM C")], "Change the text inside printf.", tab="c", test=[{"skip": True}]),
 LV("Variables and a loop", "C variables need a type. unsigned char holds 0 to 255. Print the seven times table: change the loop to stop after 10 and print i * 7.",
    CINC + 'int main(void) {\n    unsigned char i;\n    for (i = 1; i <= 3; i++) {\n        printf("%u\\n", i);\n    }\n    return 0;\n}',
    CINC + 'int main(void) {\n    unsigned char i;\n    for (i = 1; i <= 10; i++) {\n        printf("%u\\n", i * 7);\n    }\n    return 0;\n}',
    [G("63 and 70 are printed", screen=["63", "70"])], "for (i = 1; i <= 10; i++) and printf(\"%u\\n\", i * 7)", tab="c", test=[{"skip": True}]),
 LV("POKE from C", "peekpoke.h gives C the same POKE and PEEK as BASIC. Make the border black (0) as well as the background.",
    CINC + 'int main(void) {\n    POKE(53281U, 0);\n    return 0;\n}', CINC + 'int main(void) {\n    POKE(53281U, 0);\n    POKE(53280U, 0);\n    return 0;\n}',
    [G("Border is black", border=0), G("Background is black", bg=0)], "POKE(53280U, 0);", tab="c", test=[{"skip": True}]),
 LV("A function", "A function is C's subroutine. Write the body of stars(n) so it prints n stars, then a new line. Calling stars(5) should print *****.",
    CINC + 'void stars(unsigned char n) {\n    /* print n stars here */\n}\n\nint main(void) {\n    stars(5);\n    return 0;\n}',
    CINC + 'void stars(unsigned char n) {\n    unsigned char i;\n    for (i = 0; i < n; i++) putchar(\'*\');\n    putchar(\'\\n\');\n}\n\nint main(void) {\n    stars(5);\n    return 0;\n}',
    [G("Five stars are printed", screen="*****")], "for (i = 0; i < n; i++) putchar('*');", tab="c", test=[{"skip": True}]),
])

LABS["c2"] = dict(title="Lab 17: Sprites, sound and joystick in C", intro="The chips do not care which language writes to them. These are the same registers you used from BASIC, now from C, and much faster.", levels=[
 LV("A sprite from C", "This fills sprite block 13 and sets the pointer, position and colour. Switch sprite 0 on with POKE(53269U, 1).",
    CINC + 'int main(void) {\n    unsigned char i;\n    for (i = 0; i < 63; i++) POKE(832U + i, 255);\n    POKE(2040U, 13);\n    POKE(53248U, 160);\n    POKE(53249U, 120);\n    POKE(53287U, 7);\n    return 0;\n}',
    CINC + 'int main(void) {\n    unsigned char i;\n    for (i = 0; i < 63; i++) POKE(832U + i, 255);\n    POKE(2040U, 13);\n    POKE(53248U, 160);\n    POKE(53249U, 120);\n    POKE(53287U, 7);\n    POKE(53269U, 1);\n    return 0;\n}',
    [G("Sprite 0 is on", peekmask=[53269, 1, 1]), G("The pointer says block 13", peek=[2040, 13])], "POKE(53269U, 1);", tab="c", test=[{"skip": True}]),
 LV("A note from C", "Everything is set for a note except the control register. Write 17 (triangle wave plus gate) into 54276 to start it.",
    CINC + 'int main(void) {\n    POKE(54296U, 15);   /* volume */\n    POKE(54277U, 9);    /* attack, decay */\n    POKE(54278U, 240);  /* sustain, release */\n    POKE(54273U, 34);   /* pitch high */\n    POKE(54272U, 75);   /* pitch low */\n    return 0;\n}',
    CINC + 'int main(void) {\n    POKE(54296U, 15);   /* volume */\n    POKE(54277U, 9);    /* attack, decay */\n    POKE(54278U, 240);  /* sustain, release */\n    POKE(54273U, 34);   /* pitch high */\n    POKE(54272U, 75);   /* pitch low */\n    POKE(54276U, 17);   /* triangle + gate */\n    return 0;\n}',
    [G("The gate is on with a triangle wave", peek=[54276, 17]), G("The sound chip is making sound", sound=True)], "POKE(54276U, 17);", tab="c", test=[{"skip": True}]),
 LV("Steer with the joystick", "The loop moves the sprite left when the stick is pushed left. Add the test for right (bit value 8) and push it past X 200.",
    CINC + 'int main(void) {\n    unsigned char i, j, x = 100;\n    for (i = 0; i < 63; i++) POKE(832U + i, 255);\n    POKE(2040U, 13); POKE(53249U, 140); POKE(53287U, 1); POKE(53269U, 1);\n    for (;;) {\n        j = PEEK(56320U);\n        if ((j & 4) == 0 && x > 30) x--;\n        POKE(53248U, x);\n        while (PEEK(53266U) != 250) ;\n    }\n    return 0;\n}',
    CINC + 'int main(void) {\n    unsigned char i, j, x = 100;\n    for (i = 0; i < 63; i++) POKE(832U + i, 255);\n    POKE(2040U, 13); POKE(53249U, 140); POKE(53287U, 1); POKE(53269U, 1);\n    for (;;) {\n        j = PEEK(56320U);\n        if ((j & 4) == 0 && x > 30) x--;\n        if ((j & 8) == 0 && x < 250) x++;\n        POKE(53248U, x);\n        while (PEEK(53266U) != 250) ;\n    }\n    return 0;\n}',
    [G("The sprite moved past X 200", peekgt=[53248, 200])], "if ((j & 8) == 0 && x < 250) x++;", tab="c", pad=True, test=[{"skip": True}]),
 LV("Smooth motion with a table", "A table of 16 numbers swings the sprite left and right, one step per frame. Make the swing twice as wide by doubling every number in the table.",
    CINC + 'static const signed char wave[16] = {0, 12, 22, 29, 32, 29, 22, 12, 0, -12, -22, -29, -32, -29, -22, -12};\n\nint main(void) {\n    unsigned char i, k = 0;\n    for (i = 0; i < 63; i++) POKE(832U + i, 255);\n    POKE(2040U, 13); POKE(53249U, 140); POKE(53287U, 1); POKE(53269U, 1);\n    for (;;) {\n        POKE(53248U, 150 + wave[k]);\n        k = (k + 1) & 15;\n        while (PEEK(53266U) != 250) ;\n        while (PEEK(53266U) == 250) ;\n    }\n    return 0;\n}',
    CINC + 'static const signed char wave[16] = {0, 24, 44, 58, 64, 58, 44, 24, 0, -24, -44, -58, -64, -58, -44, -24};\n\nint main(void) {\n    unsigned char i, k = 0;\n    for (i = 0; i < 63; i++) POKE(832U + i, 255);\n    POKE(2040U, 13); POKE(53249U, 140); POKE(53287U, 1); POKE(53269U, 1);\n    for (;;) {\n        POKE(53248U, 150 + wave[k]);\n        k = (k + 1) & 15;\n        while (PEEK(53266U) != 250) ;\n        while (PEEK(53266U) == 250) ;\n    }\n    return 0;\n}',
    [G("The sprite swings past X 200", peekgt=[53248, 200])], "Double each number: 12 becomes 24, 32 becomes 64.", tab="c", test=[{"skip": True}]),
])

LABS["ports"] = dict(title="Lab 11: The ports", intro="Every port is wired to a chip, and every chip is a few memory cells. Port 1 and the user port live in the CIA chips.", levels=[
 LV("Joystick in port 1", "Port 1 is read at 56321 (port 2 is 56320). Tap the Port 2 button beside the pad to switch it to port 1, run this, and hold UP: bit value 1 drops, so 255 becomes 254. Fix the address.",
    '10 print peek(56320)\n20 goto 10', '10 print peek(56321)\n20 goto 10', [G("With UP held in port 1, 254 is printed", screen=" 254")], "peek(56321)", pad=True, test=[{"run": 20}, {"joy1": 1}, {"run": 40}, {"joy1": 0}]),
 LV("User port as outputs", "The user port has eight data lines, PB0 to PB7. Cell 56579 says which are outputs: a 1 bit is an output. Make all eight outputs.",
    '10 poke 56579,0', '10 poke 56579,255', [G("All eight lines are outputs", peek=[56579, 255])], "poke 56579,255"),
 LV("Light alternate LEDs", "With all lines set as outputs, cell 56577 sets each line high (1) or low (0). Light every other LED: 1+4+16+64 = 85.",
    '10 poke 56579,255\n20 poke 56577,0', '10 poke 56579,255\n20 poke 56577,85', [G("Lines PB0, PB2, PB4 and PB6 are high", peek=[56577, 85])], "poke 56577,85"),
 LV("Running light", "Move one lit LED along the eight lines: 1, 2, 4 ... 128. Each value is the last one times two.",
    '10 poke 56579,255\n20 v=1\n30 poke 56577,v\n40 for d=1 to 50:next\n60 goto 30', '10 poke 56579,255\n20 v=1\n30 poke 56577,v\n40 for d=1 to 50:next\n50 v=v*2:if v>128 then v=1\n60 goto 30',
    [G("The light reached PB7 (value 128)", peek=[56577, 128])], "50 v=v*2:if v>128 then v=1", test=[{"run": 500}]),
])
