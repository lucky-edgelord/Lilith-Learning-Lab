# -*- coding: utf-8 -*-
"""One hierarchical concept map per chapter of the C64 beginners course."""


def M(title, text):
    return (title, [ln.strip() for ln in text.strip().split("\n") if ln.strip()])


STRUCT = [
M("The C64", """
The C64 | has a brain | 6510 CPU
The C64 | has | Memory
The C64 | has helpers | Chips
The C64 | starts in | BASIC
Memory | holds | 64 KB RAM
Memory | holds | ROMs
Chips | pictures | VIC-II
Chips | sound | SID
Chips | keys and ports | CIA 1 and 2
BASIC | shows | READY.
BASIC | runs commands in | Direct mode
"""),
M("Programs", """
Programs | are made of | Numbered lines
Programs | controlled by | Commands
Numbered lines | kept | In number order
Numbered lines | edited by | Retyping or deleting
Commands | start | RUN
Commands | show | LIST
Commands | erase | NEW
Commands | jump | GOTO
Commands | notes | REM
GOTO | can make | Endless loops
Endless loops | stopped by | RUN/STOP
"""),
M("Variables", """
Variables | come in | Three kinds
Variables | are filled by | INPUT
Three kinds | decimal | A
Three kinds | whole number | A%
Three kinds | text | A$
A$ | joined with | Plus
A$ | measured by | LEN
Variables | have a quirk | Two-letter names
INPUT | wrong kind gives | REDO FROM START
A | text in it gives | TYPE MISMATCH
"""),
M("Control", """
Control | repeats with | FOR and NEXT
Control | decides with | IF and THEN
FOR and NEXT | counts by | STEP
STEP | down with | -1
IF and THEN | tests with | Comparisons
IF and THEN | false skips | Rest of the line
Comparisons | include | = <> < >
Comparisons | combined by | AND OR NOT
Comparisons | true is | -1
"""),
M("Tools", """
Tools | call helpers | GOSUB
Tools | store lists | DATA
Tools | rows of boxes | Arrays
Tools | chance | RND
GOSUB | comes back with | RETURN
GOSUB | protect with | END
DATA | read by | READ
DATA | restart with | RESTORE
Arrays | made by | DIM
RND | dice | INT(RND(1)*6)+1
"""),
M("Memory", """
Memory | written by | POKE
Memory | read by | PEEK
Memory | mapped as | Areas
Areas | include | Screen 1024
Areas | include | Free RAM 49152
Areas | include | Chips 53248
Chips 53248 | border | 53280
Chips 53248 | background | 53281
POKE | values | 0 to 255
PEEK | unused bits | AND 15
"""),
M("Screen", """
Screen | characters at | Screen memory
Screen | colours at | Colour RAM
Screen | printed with | PRINT
Screen memory | starts | 1024
Screen memory | uses | Screen codes
Colour RAM | starts | 55296
Screen codes | A is | 1
PRINT | uses | PETSCII
PRINT | controlled by | CHR$ codes
CHR$ codes | clear | 147
CHR$ codes | colour | 28 red
"""),
M("Sprites", """
Sprites | need | Picture
Sprites | need | Pointer
Sprites | need | Registers
Picture | is | 63 bytes
Picture | stored at | Block 13 = 832
Pointer | sprite 0 | 2040
Registers | start at | V = 53248
Registers | position | V and V+1
Registers | colour | V+39
Registers | on | V+21
Registers | size | V+23 V+29
"""),
M("Sound", """
Sound | made by | SID
SID | has | Three voices
SID | master | Volume S+24
Three voices | each has | Pitch
Three voices | each has | Waveform
Three voices | each has | Envelope
Pitch | in | S and S+1
Waveform | in | S+4
Waveform | starts with | Gate bit
Envelope | is | ADSR
ADSR | in | S+5 and S+6
"""),
M("Input", """
Input | from | Joystick
Input | from | Keyboard
Joystick | port 2 | 56320
Joystick | port 1 | 56321
Joystick | five | Switches
Switches | pressed reads | 0
Switches | tested by | AND mask
Keyboard | read by | GET
Keyboard | waits in | Buffer
Buffer | cleared by | POKE 198,0
"""),
M("Ports", """
Ports | joystick | Control ports
Ports | gadgets | User port
Ports | storage | Serial and cassette
Ports | cartridges | Expansion port
Control ports | have | 9 pins
User port | lines | PB0 to PB7
PB0 to PB7 | data | 56577
PB0 to PB7 | direction | 56579
Serial and cassette | disk | Device 8
Serial and cassette | tape | Device 1
User port | signals | 5 V logic
"""),
M("Game", """
Game | is | One loop
One loop | step 1 | Read
One loop | step 2 | Move
One loop | step 3 | Rules
One loop | step 4 | Show
Read | joystick | PEEK(56320)
Move | keeps inside | Bounds check
Rules | count once | Edge detection
Rules | keeps | Score
Show | uses | Sprites and sound
"""),
M("Machine code", """
Machine code | written as | Assembly
Machine code | runs on | 6510
6510 | has | Registers A X Y
Assembly | load | LDA
Assembly | store | STA
Assembly | return | RTS
LDA | number with | #
Assembly | addresses in | Hex $
Machine code | placed at | $C000
$C000 | started by | SYS 49152
"""),
M("Loops", """
Loops | count with | X register
Loops | branch with | BNE BEQ
X register | changed by | INX DEX
X register | compared by | CPX
X register | indexes | STA $0400,X
BNE BEQ | test | Z flag
Loops | call | KERNAL
KERNAL | called by | JSR
KERNAL | prints with | $FFD2
$FFD2 | prints until | Zero byte
"""),
M("Timing", """
Timing | set by | Raster beam
Timing | used by | Interrupts
Raster beam | draws | 312 lines
Raster beam | current line | $D012
312 lines | about | 50 frames a second
Interrupts | handler address | $0314
Interrupts | enabled in | $D01A
Interrupts | acknowledged in | $D019
Interrupts | guarded by | SEI and CLI
Interrupts | end with | RTI
"""),
M("C", """
C | built by | cc65 toolchain
C | written with | Types
C | organised in | Functions
cc65 toolchain | compiles | cc65
cc65 toolchain | assembles | ca65
cc65 toolchain | links | ld65
Types | fastest | unsigned char
Types | larger | int
Functions | start in | main
C | talks to chips with | POKE and PEEK
"""),
M("Chips in C", """
Chips in C | sprites | POKE(53269U, 1)
Chips in C | sound | POKE(54276U, 17)
Chips in C | joystick | PEEK(56320U)
PEEK(56320U) | tested with | & mask
Chips in C | run in | for (;;)
for (;;) | synced by | Raster wait
for (;;) | smooth motion | Lookup table
Lookup table | stepped with | & 15
"""),
M("Storage", """
Storage | on | Tape
Storage | on | Disk
Storage | with | Commands
Tape | is | Device 1
Disk | is | Device 8
Disk | has | 35 tracks
35 tracks | directory | Track 18
Commands | SAVE | "NAME",8
Commands | LOAD | "NAME",8
Commands | directory | LOAD "$",8
Storage | in emulators | .d64 .prg .tap
"""),
]
MAPS = [[a] for a in STRUCT]
