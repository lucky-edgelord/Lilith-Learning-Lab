#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the Rust for Beginners course with hands-on labs on the Rust Lab (a teaching interpreter).
Usage: python3 make_rust_course.py [out.json]"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "rs", "course"))
sys.path.insert(0, os.path.join(HERE, "rs"))
import cmk, rs_a, rs_b, rs_c, figs, maps as rmaps, labs_a, labs_b, build as rsbuild  # noqa: E402
from clib import T  # noqa: E402

CHS = rs_a.CHS + rs_b.CHS + rs_c.CHS
LABS = {}
LABS.update(labs_a.LABS); LABS.update(labs_b.LABS)
LAB_FOR = ["hello", "types", "flow", "ownership", "borrow", "structs", "enums", "collections", "errors", "traits", "lifetimes", "iterators", "smart"]
assert len(CHS) == len(LAB_FOR) == 13
for _c, _k in zip(CHS, LAB_FOR):
    _lab = LABS[_k]
    _c["practice"].insert(0, {"type": "webxdc", "title": _lab["title"], "intro": "Real Rust runs in this lab. " + _lab["intro"], "height": 1500, "html": rsbuild.lab_html(_lab, _lab["title"])})

# numbered figures: "Figure N.M" and a pointer in the preceding paragraph
for _ci, _ch in enumerate(CHS):
    _n = 0
    for _i, _b in enumerate(list(_ch["lesson"])):
        pass
    _out = []
    for _b in _ch["lesson"]:
        if _b["type"] == "figure":
            _n += 1
            _num = "%d.%d" % (_ci + 1, _n)
            _b["caption"] = "Figure %s. %s" % (_num, _b["caption"])
            for _p in reversed(_out):
                if _p["type"] == "text":
                    _p["items"][-1] = _p["items"][-1].rstrip() + " (See Figure %s below.)" % _num
                    break
        _out.append(_b)
    _ch["lesson"] = _out

assert len(rmaps.MAPS) == len(CHS)
for _c, _ms in zip(CHS, rmaps.MAPS):
    _c["maps"] = [{"title": _t, "links": _l} for _t, _l in _ms]

for _i in range(1, len(CHS)):
    _prev = CHS[_i - 1]
    CHS[_i]["lesson"].insert(0, T("Quick recap of the last chapter, " + _prev["title"] + ":", *["• " + k for k in _prev["keyPoints"]]))

MNEM = [
 ("Write, Check, Run", "Write the code, the compiler Checks it, then you Run it."),
 ("Locked unless mut", "A box is Locked unless you say mut, and shadowing makes a New box."),
 ("Last line, no semicolon", "The Last line with No semicolon is the answer."),
 ("One owner, then Drop", "One owner at a time; when the owner leaves, the value is Dropped, last in first out."),
 ("Many readers or one writer", "Many Readers OR one Writer, never both."),
 ("Struct stores, impl does", "A Struct Stores data; impl says what it Does."),
 ("Match covers all", "Match must Cover All the variants; Option is Some or None."),
 ("Get beats index", "Get returns an Option, Index may panic; len counts bytes."),
 ("Panic for bugs, Result for life", "Panic for Bugs, Result for expected troubles, ? passes it up."),
 ("Trait = job posting", "A Trait is a job posting; impl is the applicant; bounds are requirements."),
 ("Never outlive", "A reference must Never outlive what it points to; name it with 'a when inputs compete."),
 ("Source, adapt, consume", "Source, Adapt with map and filter, Consume with sum or collect."),
 ("Box owns, Rc shares, RefCell bends", "Box Owns, Rc Shares, RefCell Bends the rules at run time; Arc for threads."),
]
assert len(MNEM) == len(CHS)
for _c, (_m, _d) in zip(CHS, MNEM):
    _full = _m + ". " + _d
    _c["lesson"].append(T("Memory trick: " + _full))
    _c["cards"].append({"q": "Memory trick for: " + _c["title"] + "?", "a": _full})
IMAGES = figs.build_all()

PRONOUNCE = {"Rust": "rust", "rustc": "rust see", "Cargo": "car go", "println": "print line", "mut": "mute", "i32": "i thirty two", "u8": "you eight", "f64": "f sixty four", "usize": "you size",
    "Vec": "vec", "HashMap": "hash map", "enum": "ee num", "impl": "imp ell", "dyn": "dine", "Rc": "R C", "Arc": "ark", "RefCell": "ref cell", "Ferris": "ferris", "UTF-8": "U T F eight", "Option": "option",
    "struct": "struct", "E0382": "E zero three eight two", "E0499": "E zero four nine nine", "E0502": "E zero five zero two", "E0597": "E zero five nine seven", "E0106": "E zero one zero six", "ELI5": "E L I five", "Fizz": "fizz", "Buzz": "buzz"}
SANDBOX = cmk.terminal("Rust cheat sheet", "rust>", "A scripted lookup. Try: hello, let, mut, types, move, borrow, struct, enum, match, vec, string, hashmap, result, trait, lifetime, iterator, box, rc, thread", [
    ("hello", ["fn main() { println!(\"Hello, world!\"); }"]),
    ("let", ["let x = 5; is locked. let mut x = 5; can change. let x = x + 1; shadows."]),
    ("mut", ["mut makes a variable changeable. &mut makes a mutable reference."]),
    ("types", ["i8 i16 i32 i64 u8 u16 u32 u64 usize, f32 f64, bool, char, (tuple), [array]."]),
    ("move", ["let b = a; moves a String. Numbers are Copy. Use a.clone() for a deep copy. Error E0382 means use after move."]),
    ("borrow", ["&x shared, &mut x exclusive. Many readers OR one writer. A borrow ends at its last use."]),
    ("struct", ["struct P { x: i32 } impl P { fn new() -> P {..} fn get(&self) {..} fn set(&mut self) {..} }  #[derive(Debug)] for {:?}."]),
    ("enum", ["enum E { A, B(i32), C { x: i32 } } and match must cover every variant."]),
    ("match", ["match v { 1 => .., 2..=5 => .., n if n > 9 => .., _ => .. }"]),
    ("vec", ["let mut v = vec![1,2]; v.push(3); v.pop(); v.get(1); v.len(); for x in &v { }"]),
    ("string", ["String::from(\"hi\"), push_str, format!, len() counts bytes, chars().count() counts letters."]),
    ("hashmap", ["use std::collections::HashMap; *m.entry(k).or_insert(0) += 1; m.get(&k); m.insert(k, v);"]),
    ("result", ["Result<T, E> is Ok(T) or Err(E). Use match, unwrap_or, or ? inside a function that returns Result."]),
    ("trait", ["trait T { fn f(&self); } impl T for X { fn f(&self) {..} } fn g<U: T>(u: &U) {..} Box<dyn T>"]),
    ("lifetime", ["fn longest<'a>(x: &'a str, y: &'a str) -> &'a str. E0106 missing, E0597 does not live long enough."]),
    ("iterator", ["(1..=10).filter(|n| n % 2 == 1).map(|n| n * n).sum::<i32>() is 165."]),
    ("box", ["Box::new(5) puts a value on the heap. Use Box<List> for recursive types."]),
    ("rc", ["Rc::new(x), Rc::clone(&a), Rc::strong_count(&a). RefCell: borrow() and borrow_mut(). Threads: Arc."]),
    ("thread", ["thread::spawn(move || { .. }).join().unwrap(); mpsc::channel() gives (tx, rx)."]),
])
EXAM = [
 ("What does the ! in println! mean?", ["It is a macro", "Not", "A warning", "A typo"], 0, "Macros end with !."),
 ("Where does a Rust program start?", ["fn main", "fn start", "lib.rs", "Cargo.lock"], 0, "main."),
 ("How do you make a variable changeable?", ["let mut", "let var", "change", "let !"], 0, "mut."),
 ("What is shadowing?", ["A new variable reusing a name", "Making a file private", "A loop", "A type"], 0, "A new box."),
 ("What happens when a u8 passes 255?", ["Overflow (a panic in debug)", "It grows", "It becomes a float", "Nothing"], 0, "Fixed range."),
 ("Which makes the last line of a function its return value?", ["No semicolon", "Two semicolons", "The word give", "A colon"], 0, "Expression."),
 ("Which loop can break with a value?", ["loop", "for", "while", "none"], 0, "break value;"),
 ("How many owners does a value have?", ["One", "Two", "Many", "None"], 0, "One."),
 ("What does let b = a; do for a String?", ["Moves it", "Copies it", "Borrows it", "Deletes it"], 0, "Ownership moves."),
 ("Which types are Copy?", ["Integers and bool", "String", "Vec", "HashMap"], 0, "Cheap types."),
 ("In which order are variables dropped?", ["Reverse of creation", "Same order", "Random", "Alphabetical"], 0, "Last in first out."),
 ("How many &mut references may be active at once?", ["One", "Two", "Ten", "Zero"], 0, "Exactly one."),
 ("Which error means a value was used after being moved?", ["E0382", "E0499", "E0597", "E0106"], 0, "Moved value."),
 ("When does a borrow end?", ["At its last use", "At the end of the file", "Never", "At the next line"], 0, "NLL."),
 ("What is &str?", ["A string slice", "An owned string", "A char", "A number"], 0, "Borrowed text."),
 ("How do you call new on a struct?", ["Type::new()", "value.new()", "new Type", "Type.new"], 0, "Associated function."),
 ("What does #[derive(Debug)] allow?", ["Printing with {:?}", "Debugging in the cloud", "Faster code", "Importing"], 0, "Debug."),
 ("What must a match do?", ["Cover all cases", "Be short", "Use loops", "Return a string"], 0, "Exhaustive."),
 ("What replaces null in Rust?", ["Option", "Nil", "Void", "Maybe"], 0, "Some or None."),
 ("What does \"héllo\".len() give?", ["6", "5", "4", "7"], 0, "Bytes."),
 ("What does v.get(10) return?", ["An Option", "A panic", "Zero", "A string"], 0, "Safe."),
 ("What does ? do on Err?", ["Returns the error early", "Panics", "Ignores it", "Prints it"], 0, "Propagates."),
 ("What does a panic exit with?", ["Code 101", "Code 0", "Code 1", "Code 255"], 0, "101."),
 ("What is a trait?", ["A set of promised methods", "A loop", "A variable", "A crate"], 0, "A job posting."),
 ("What does Box<dyn Shape> allow?", ["Different types in one collection", "Faster math", "Smaller code", "Nothing"], 0, "Run-time choice."),
 ("What does E0106 say?", ["Missing lifetime specifier", "Moved value", "Two writers", "Missing trait item"], 0, "Name the lifetime."),
 ("What is a closure?", ["An anonymous function that can capture variables", "A loop", "A macro", "A crate"], 0, "|x| x + n."),
 ("Which is an iterator consumer?", ["sum", "map", "filter", "rev"], 0, "Finishes the chain."),
 ("Which pointer shares ownership with a count?", ["Rc", "Box", "RefCell", "Vec"], 0, "Reference counting."),
 ("Which should you use instead of Rc across threads?", ["Arc", "Box", "RefCell", "String"], 0, "Atomic."),
]
CFG = dict(id="rust-for-beginners", title="Rust for Beginners",
    subtitle="Learn Rust from zero with a talking teacher and 13 hands-on labs that run real Rust in the app, including the ownership and borrowing errors",
    description="A friendly, intuitive introduction to the Rust programming language in 13 chapters: hello world, variables and types, functions and loops, ownership, borrowing, structs, enums and match, collections, error handling, traits and generics, lifetimes, closures and iterators, and smart pointers with threads. Every chapter has a hands-on lab running on the built-in Rust Lab, a teaching interpreter that prints compiler-style errors (moves, borrows, lifetimes, exhaustive match) and shows an ownership log, with numbered figures, recaps, memory tricks, hierarchical concept maps and an exam. Programs run in a simulation of Rust, not the real compiler, so rare edge cases differ; the rules you learn are the real ones. The examples are our own, written in the spirit of The Rust Programming Language (MIT or Apache 2.0), which we recommend you read next.",
    pronounce=PRONOUNCE, sandbox=SANDBOX, exam=EXAM, images=IMAGES)
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "courses", "rust-for-beginners.course.json")
    cmk.main(CFG, CHS, [sys.argv[0], out])
