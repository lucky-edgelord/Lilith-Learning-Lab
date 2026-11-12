# -*- coding: utf-8 -*-
"""Original SVG figures for the Rust beginners course."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", ".."))
from make_images import Svg, BG, PANEL, LINE, TX, DIM, VIO, PINK, BLUE, GRN, AMB, RED  # noqa: E402

def mono(s, x, y, t, size=12, fill=TX, anchor="middle"):
    s.add('<text x="%s" y="%s" font-family="ui-monospace,Menlo,monospace" font-size="%s" fill="%s" text-anchor="%s">%s</text>' % (x, y, size, fill, anchor, t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")))

def cell(s, x, y, w, h, t, color=VIO, size=12, fill=PANEL):
    s.rect(x, y, w, h, fill=fill, stroke=color, r=6)
    mono(s, x + w / 2, y + h / 2 + 4, t, size, TX)

def f_compile():
    s = Svg(640, 250, "Compile, then run", "Source code goes through the Rust compiler, which either reports errors or produces a program you can run.")
    s.text(320, 26, "From source to running program", 15, VIO, weight="700")
    s.box(24, 70, 150, 70, "main.rs", "your code", BLUE)
    s.box(245, 70, 150, 70, "rustc", "the compiler", VIO)
    s.box(466, 70, 150, 70, "program", "runs fast", GRN)
    s.arrow(174, 105, 245, 105); s.arrow(395, 105, 466, 105)
    s.text(210, 96, "build", 11, DIM); s.text(430, 96, "run", 11, DIM)
    s.arrow(320, 140, 320, 188, RED)
    s.box(215, 188, 210, 46, "error messages", "fix them, try again", RED)
    s.text(332, 168, "mistake found?", 11, RED, anchor="start")
    s.text(330, 176, "", 11, DIM)
    return s

def f_boxes():
    s = Svg(640, 250, "let and let mut", "A plain let makes a locked box. let mut makes a box you can change. Shadowing makes a new box with the same name.")
    s.text(320, 26, "Variables are boxes", 15, VIO, weight="700")
    s.rect(30, 60, 170, 110, stroke=BLUE); mono(s, 115, 90, "let x = 5;", 13); cell(s, 80, 105, 70, 36, "5", BLUE); s.text(115, 160, "locked: x = 6 is an error", 11, DIM)
    s.rect(235, 60, 170, 110, stroke=GRN); mono(s, 320, 90, "let mut y = 5;", 13); cell(s, 285, 105, 70, 36, "5", GRN); s.text(320, 160, "y = 6 is allowed", 11, DIM)
    s.rect(440, 60, 170, 110, stroke=AMB); mono(s, 525, 90, "let x = x + 1;", 13); cell(s, 470, 105, 50, 36, "5", DIM); cell(s, 535, 105, 50, 36, "6", AMB); s.text(525, 160, "shadowing: a new box", 11, DIM)
    s.text(320, 215, "Same name, new box: the old one is hidden, not changed.", 12, DIM)
    return s

def f_types():
    s = Svg(640, 320, "Integer sizes", "Each integer type has a fixed number of bits and therefore a fixed range of values.")
    s.text(320, 26, "Whole-number types and their ranges", 15, VIO, weight="700")
    rows = [("i8", "-128 to 127", 1), ("u8", "0 to 255", 1), ("i32", "-2 billion to 2 billion", 4), ("u32", "0 to 4 billion", 4), ("i64", "huge", 8), ("usize", "sizes and indexes", 8)]
    for i, (n, r, b) in enumerate(rows):
        y = 52 + i * 40
        mono(s, 70, y + 22, n, 14, VIO)
        s.rect(110, y + 6, 40 * b, 24, fill=PANEL, stroke=BLUE if n[0] == "i" else GRN, r=5)
        s.text(130 + 40 * b + 12, y + 23, r, 12, DIM, anchor="start")
    s.text(320, 306, "i = can be negative, u = unsigned. Go past the top and the program panics.", 12, AMB)
    return s

def f_loops():
    s = Svg(640, 260, "Loop and branch shapes", "if chooses a path once. for visits each item. while repeats while a condition holds. loop repeats until break.")
    s.text(320, 26, "Control flow at a glance", 15, VIO, weight="700")
    items = [("if / else", "choose one path", "if n > 3 { }", BLUE), ("for", "visit each item", "for i in 1..=3 { }", GRN), ("while", "repeat while true", "while n < 9 { }", AMB), ("loop", "repeat until break", "loop { break 7; }", PINK)]
    for i, (t, sub, code, c) in enumerate(items):
        x = 18 + i * 155
        s.box(x, 56, 145, 70, t, sub, c)
        mono(s, x + 72, 160, code, 10)
        s.rect(x, 138, 145, 40, fill="none", stroke=LINE, r=6)
    s.text(320, 225, "Every one of them is an expression or a statement you can nest inside the others.", 12, DIM)
    return s

def f_stackheap():
    s = Svg(640, 300, "Stack and heap", "A String lives in two places: a small handle on the stack with pointer, length and capacity, and the characters on the heap.")
    s.text(320, 26, "Where a String lives", 15, VIO, weight="700")
    s.text(110, 56, "stack (fixed size)", 12, DIM, weight="700"); s.text(440, 56, "heap (grows)", 12, DIM, weight="700")
    s.rect(30, 66, 160, 150, stroke=BLUE); mono(s, 110, 88, "let s", 12, BLUE)
    cell(s, 46, 98, 128, 28, "ptr", BLUE); cell(s, 46, 130, 128, 28, "len = 5", BLUE); cell(s, 46, 162, 128, 28, "cap = 5", BLUE)
    for i, ch in enumerate("hello"):
        cell(s, 330 + i * 48, 120, 44, 40, ch, GRN, 15)
    s.arrow(174, 112, 326, 138, VIO)
    s.text(450, 190, "bytes owned by s", 11, DIM)
    s.text(320, 270, "When s goes out of scope, Rust frees the heap bytes automatically.", 12, AMB)
    return s

def f_move():
    s = Svg(640, 290, "A move", "After let s2 = s1, the handle is copied to s2 and s1 is no longer valid. Only one owner points at the heap data.")
    s.text(320, 26, "Moving ownership", 15, VIO, weight="700")
    s.rect(30, 56, 150, 100, stroke=RED, dash="5 4"); mono(s, 105, 78, "s1 (moved)", 12, RED); cell(s, 50, 92, 110, 28, "ptr", DIM); cell(s, 50, 124, 110, 24, "dead", RED, 10)
    s.rect(30, 170, 150, 90, stroke=GRN); mono(s, 105, 192, "s2", 12, GRN); cell(s, 50, 206, 110, 28, "ptr", GRN)
    for i, ch in enumerate("hello"):
        cell(s, 340 + i * 56, 120, 50, 44, ch, GRN, 16)
    s.arrow(160, 218, 336, 150, GRN); s.line(160, 106, 330, 138, RED, dash="4 4")
    s.text(450, 100, "the heap bytes do not move", 11, DIM)
    s.text(400, 262, "The compiler remembers: using s1 now is error E0382.", 12, AMB)
    return s

def f_scope():
    s = Svg(640, 260, "Scope and drop", "Each value is dropped when its owner's scope ends, in reverse order of creation.")
    s.text(320, 26, "A value lives until its scope ends", 15, VIO, weight="700")
    s.rect(40, 50, 560, 170, stroke=LINE)
    mono(s, 60, 72, "{", 14, DIM, "start")
    s.rect(70, 90, 400, 26, fill=PANEL, stroke=BLUE, r=5); mono(s, 80, 108, "let a = Noisy(A)   a lives here", 11, TX, "start")
    s.rect(110, 124, 360, 26, fill=PANEL, stroke=GRN, r=5); mono(s, 120, 142, "let b = Noisy(B)   b lives here", 11, TX, "start")
    s.arrow(500, 138, 500, 102, PINK); s.text(540, 124, "1. drop B", 11, PINK); s.text(540, 96, "2. drop A", 11, PINK)
    mono(s, 60, 200, "}  <- end of scope: everything is cleaned up", 12, AMB, "start")
    return s

def f_borrow():
    s = Svg(640, 250, "Borrowing rules", "At any moment you may have many shared references or exactly one mutable reference, never both.")
    s.text(320, 26, "Many readers OR one writer", 15, VIO, weight="700")
    s.box(40, 60, 150, 60, "data", "the owner", VIO)
    for i in range(3):
        s.box(280, 52 + i * 46, 130, 38, "&data", None, BLUE); s.arrow(190, 90, 280, 71 + i * 46, BLUE)
    s.text(345, 200, "any number of readers", 12, BLUE)
    s.box(470, 80, 140, 56, "&mut data", "one writer", GRN); s.arrow(190, 100, 470, 108, GRN, dash="5 4")
    s.text(540, 160, "alone, no readers", 12, GRN)
    s.text(320, 236, "A reference stays alive until its last use.", 12, AMB)
    return s

def f_slice():
    s = Svg(640, 250, "A string slice", "A slice is a view of part of a string: a pointer and a length into data that someone else owns.")
    s.text(320, 26, "&s[0..5] borrows part of a string", 15, VIO, weight="700")
    txt = "hello world"
    for i, ch in enumerate(txt):
        cell(s, 70 + i * 44, 80, 40, 40, ch if ch != " " else "_", GRN if i < 5 else LINE, 15, PANEL)
        s.text(90 + i * 44, 140, str(i), 11, DIM)
    s.rect(66, 74, 4 + 5 * 44 - 2, 52, fill="none", stroke=PINK, r=8, sw=2.2)
    s.text(176, 175, "&s[0..5]  =  \"hello\"", 14, PINK, weight="700")
    s.text(320, 220, "The slice borrows s, so s cannot be changed while the slice is in use.", 12, AMB)
    return s

def f_struct():
    s = Svg(640, 270, "A struct and its methods", "A struct bundles named fields. An impl block attaches methods and associated functions to it.")
    s.text(320, 26, "struct holds data, impl adds behaviour", 15, VIO, weight="700")
    s.box(40, 56, 230, 170, "struct Rect", None, BLUE)
    cell(s, 62, 120, 186, 30, "w: u32", BLUE); cell(s, 62, 160, 186, 30, "h: u32", BLUE)
    s.box(360, 56, 250, 170, "impl Rect", None, GRN)
    cell(s, 382, 96, 206, 30, "fn new(w, h) -> Rect", GRN, 11); cell(s, 382, 134, 206, 30, "fn area(&self) -> u32", GRN, 11); cell(s, 382, 172, 206, 30, "fn grow(&mut self)", GRN, 11)
    s.arrow(270, 140, 360, 140)
    return s

def f_enum():
    s = Svg(640, 280, "Enums and match", "An enum value is exactly one of its variants, and each variant can carry its own data. match must handle all of them.")
    s.text(320, 26, "One of several shapes", 15, VIO, weight="700")
    vs = [("Circle(f64)", "a radius"), ("Rect { w, h }", "two sides"), ("Point", "no data")]
    for i, (n, sub) in enumerate(vs):
        s.box(30, 52 + i * 70, 200, 56, n, sub, BLUE)
        s.arrow(230, 80 + i * 70, 320, 80 + i * 70, DIM)
        s.box(320, 52 + i * 70, 290, 56, "match arm", ["pi * r * r", "w * h", "0"][i], GRN)
    s.text(320, 268, "Forget one and the compiler refuses: error E0004.", 12, AMB)
    return s

def f_option():
    s = Svg(640, 240, "Option", "Option is a box that is either empty (None) or holds a value (Some). You must look inside before you use it.")
    s.text(320, 26, "Option<T>: maybe a value", 15, VIO, weight="700")
    s.rect(60, 60, 200, 110, stroke=GRN); mono(s, 160, 84, "Some(5)", 14, GRN); cell(s, 120, 100, 80, 40, "5", GRN, 16)
    s.rect(380, 60, 200, 110, stroke=DIM, dash="5 4"); mono(s, 480, 84, "None", 14, DIM); s.text(480, 130, "(empty)", 13, DIM)
    s.text(320, 205, "No null pointers: the type tells you a value might be missing.", 12, AMB)
    return s

def f_vec():
    s = Svg(640, 290, "Vec and HashMap", "A Vec is an ordered growable list. A HashMap finds a value from a key.")
    s.text(160, 26, "Vec<i32>", 14, VIO, weight="700"); s.text(510, 26, "HashMap<&str, i32>", 14, VIO, weight="700")
    for i, n in enumerate([3, 1, 4, 1]):
        cell(s, 20 + i * 70, 56, 62, 40, str(n), GRN, 15); s.text(51 + i * 70, 116, "[%d]" % i, 11, DIM)
    cell(s, 20 + 4 * 70, 56, 62, 40, "", LINE); s.text(51 + 4 * 70, 116, "spare", 11, DIM)
    s.text(160, 150, "push, pop, index, iterate", 12, DIM)
    for i, (k, v) in enumerate([("a", 2), ("b", 1), ("c", 7)]):
        cell(s, 400, 56 + i * 48, 80, 38, '"%s"' % k, BLUE, 13); s.arrow(480, 75 + i * 48, 530, 75 + i * 48, DIM); cell(s, 530, 56 + i * 48, 70, 38, str(v), GRN, 14)
    s.text(510, 206, "insert, get, entry", 12, DIM)
    s.text(320, 260, "A String is a Vec of bytes that must stay valid UTF-8.", 12, AMB)
    return s

def f_result():
    s = Svg(640, 260, "Result and ?", "A function that can fail returns Result. The question mark passes errors up to the caller and keeps going on success.")
    s.text(320, 26, "Result<T, E>: success or error", 15, VIO, weight="700")
    s.box(30, 60, 160, 60, "parse(\"42\")", "returns Result", VIO)
    s.box(280, 52, 150, 44, "Ok(42)", None, GRN); s.box(280, 118, 150, 44, "Err(e)", None, RED)
    s.arrow(190, 80, 280, 74); s.arrow(190, 100, 280, 140)
    s.box(480, 52, 130, 44, "keep going", None, GRN); s.box(480, 118, 130, 44, "return Err(e)", None, RED)
    s.arrow(430, 74, 480, 74); s.arrow(430, 140, 480, 140)
    s.text(320, 214, "x? means: on Ok take the value, on Err return it right away.", 12, AMB)
    return s

def f_trait():
    s = Svg(640, 290, "Traits", "A trait lists methods a type promises to provide. Different types implement it differently, and trait objects let you mix them.")
    s.text(320, 26, "A trait is a promise", 15, VIO, weight="700")
    s.box(230, 50, 180, 56, "trait Speak", "fn speak(&self)", VIO)
    for i, (n, w) in enumerate([("Dog", "Woof"), ("Cat", "Meow"), ("Cow", "Moo")]):
        x = 30 + i * 200
        s.box(x, 170, 170, 56, "impl Speak for " + n, "says " + w, GRN); s.arrow(320, 106, x + 85, 170, DIM)
    s.text(320, 262, "Vec<Box<dyn Speak>> holds all three and calls the right speak().", 12, AMB)
    return s

def f_life():
    s = Svg(640, 270, "Lifetimes", "A reference must not outlive the value it points to. Lifetimes are the scopes during which each value is alive.")
    s.text(320, 26, "r must not outlive x", 15, VIO, weight="700")
    s.rect(60, 60, 500, 30, fill=PANEL, stroke=BLUE, r=6); s.text(80, 80, "r lives here", 12, BLUE, anchor="start")
    s.rect(60, 110, 250, 30, fill=PANEL, stroke=RED, r=6); s.text(80, 130, "x lives here", 12, RED, anchor="start")
    s.line(310, 100, 310, 160, RED, dash="4 3"); s.text(310, 176, "x dropped here", 12, RED)
    s.text(430, 130, "r still wants x -> error E0597", 12, AMB)
    s.text(320, 235, "Annotations like 'a only name these scopes; they never change how long data lives.", 12, DIM)
    return s

def f_iter():
    s = Svg(640, 250, "An iterator chain", "Data flows through adapters such as filter and map, and a final consumer such as sum produces the result.")
    s.text(320, 26, "(1..=10).filter(odd).map(square).sum()", 14, VIO, weight="700")
    st = [("1..=10", "source", BLUE), ("filter", "keep odd", GRN), ("map", "square", AMB), ("sum", "165", PINK)]
    for i, (n, sub, c) in enumerate(st):
        s.box(20 + i * 155, 70, 130, 60, n, sub, c)
        if i < 3: s.arrow(150 + i * 155, 100, 175 + i * 155, 100)
    for i, n in enumerate(["1 2 3 4 5 ..", "1 3 5 7 9", "1 9 25 49 81", "165"]):
        s.text(85 + i * 155, 160, n, 12, DIM)
    s.text(320, 215, "Nothing runs until the consumer asks for values (lazy).", 12, AMB)
    return s

def f_pointers():
    s = Svg(640, 290, "Smart pointers", "Box owns one heap value. Rc lets several owners share it and counts them. RefCell checks borrowing rules while the program runs.")
    s.text(320, 26, "Box, Rc, RefCell", 15, VIO, weight="700")
    s.box(20, 56, 190, 70, "Box<T>", "one owner, on the heap", BLUE)
    s.box(225, 56, 190, 70, "Rc<T>", "many owners, a count", GRN)
    s.box(430, 56, 190, 70, "RefCell<T>", "change through &", AMB)
    cell(s, 80, 150, 70, 34, "5", BLUE, 15); s.arrow(115, 126, 115, 150, BLUE)
    cell(s, 290, 190, 70, 34, "x", GRN, 15)
    for i in range(3):
        s.box(236 + i * 56, 134, 44, 26, "a%d" % (i + 1), None, GRN, fill=PANEL)
    s.text(325, 250, "count = 3", 12, GRN)
    cell(s, 495, 150, 80, 34, "5", AMB, 15); s.text(535, 208, "borrow_mut() to change", 11, DIM)
    s.text(320, 278, "Rc is for one thread. Arc is the thread-safe version.", 12, DIM)
    return s

def f_threads():
    s = Svg(640, 250, "Threads and channels", "A spawned thread can send values to the main thread through a channel. Data moves, so nothing is shared by accident.")
    s.text(320, 26, "Message passing", 15, VIO, weight="700")
    s.box(30, 60, 150, 70, "worker thread", "tx.send(42)", GRN)
    s.box(250, 70, 140, 50, "channel", "a queue", VIO)
    s.box(460, 60, 150, 70, "main thread", "rx.recv()", BLUE)
    s.arrow(180, 95, 250, 95); s.arrow(390, 95, 460, 95)
    s.text(320, 175, "Send moves the value: the sender cannot touch it afterwards.", 12, AMB)
    s.text(320, 205, "Rc is not Send, so the compiler stops you; use Arc.", 12, DIM)
    return s

ALL = {"rs-compile.svg": f_compile, "rs-boxes.svg": f_boxes, "rs-types.svg": f_types, "rs-loops.svg": f_loops, "rs-stackheap.svg": f_stackheap, "rs-move.svg": f_move, "rs-scope.svg": f_scope,
       "rs-borrow.svg": f_borrow, "rs-slice.svg": f_slice, "rs-struct.svg": f_struct, "rs-enum.svg": f_enum, "rs-option.svg": f_option, "rs-vec.svg": f_vec, "rs-result.svg": f_result,
       "rs-trait.svg": f_trait, "rs-life.svg": f_life, "rs-iter.svg": f_iter, "rs-pointers.svg": f_pointers, "rs-threads.svg": f_threads}

def build_all(outdir="/tmp/rs_figs"):
    os.makedirs(outdir, exist_ok=True)
    res = {}
    for fn, f in ALL.items():
        svg = f().render(); open(os.path.join(outdir, fn), "w", encoding="utf-8").write(svg); res[fn] = svg
    return res

if __name__ == "__main__":
    print(len(build_all()), "figures")
