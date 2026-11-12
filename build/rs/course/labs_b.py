from labs_a import LV
LABS = {}

LABS['enums'] = dict(title='Lab 7: Enums and match', intro='An enum is one of several possibilities. <code>match</code> forces you to handle every one.', levels=[
 LV('Cover every case', 'The compiler says a variant is not covered. Add the missing arm so green prints <code>go</code>.', '''
enum Light {
    Red,
    Yellow,
    Green,
}

fn main() {
    let l = Light::Green;
    match l {
        Light::Red => println!("stop"),
        Light::Yellow => println!("slow"),
    }
}''', '''
enum Light {
    Red,
    Yellow,
    Green,
}

fn main() {
    let l = Light::Green;
    match l {
        Light::Red => println!("stop"),
        Light::Yellow => println!("slow"),
        Light::Green => println!("go"),
    }
}''', {'stdout': 'go'}, 'Add Light::Green => println!("go"),'),
 LV('Variants with data', 'Fill in the <code>Rect</code> arm: area is width times height. Print <code>12</code>.', '''
enum Shape {
    Circle(f64),
    Rect { w: f64, h: f64 },
}

fn area(s: &Shape) -> f64 {
    match s {
        Shape::Circle(r) => 3.0 * r * r,
        Shape::Rect { w, h } => 0.0,
    }
}

fn main() {
    println!("{}", area(&Shape::Rect { w: 3.0, h: 4.0 }));
}''', '''
enum Shape {
    Circle(f64),
    Rect { w: f64, h: f64 },
}

fn area(s: &Shape) -> f64 {
    match s {
        Shape::Circle(r) => 3.0 * r * r,
        Shape::Rect { w, h } => w * h,
    }
}

fn main() {
    println!("{}", area(&Shape::Rect { w: 3.0, h: 4.0 }));
}''', {'stdout': '12'}, 'w * h'),
 LV('Option instead of null', 'Write <code>safe_div</code> so dividing by zero gives <code>None</code>. Expected output is two lines: <code>None</code> then <code>Some(5)</code>.', '''
fn safe_div(a: i32, b: i32) -> Option<i32> {
    Some(a / b)
}

fn main() {
    println!("{:?}", safe_div(1, 0));
    println!("{:?}", safe_div(10, 2));
}''', '''
fn safe_div(a: i32, b: i32) -> Option<i32> {
    if b == 0 {
        None
    } else {
        Some(a / b)
    }
}

fn main() {
    println!("{:?}", safe_div(1, 0));
    println!("{:?}", safe_div(10, 2));
}''', {'stdout': 'None\nSome(5)'}, 'Check b == 0 first.'),
 LV('Guards and ranges', 'Finish <code>grade</code>: 90 and up is <code>A</code>, 80 to 89 is <code>B</code>, anything else <code>C</code>. Expected <code>A B C</code> on one line.', '''
fn grade(score: u32) -> char {
    match score {
        _ => 'C',
    }
}

fn main() {
    println!("{} {} {}", grade(95), grade(85), grade(10));
}''', '''
fn grade(score: u32) -> char {
    match score {
        90..=100 => 'A',
        80..=89 => 'B',
        _ => 'C',
    }
}

fn main() {
    println!("{} {} {}", grade(95), grade(85), grade(10));
}''', {'stdout': 'A B C'}, 'Ranges in patterns: 90..=100'),
])

LABS['collections'] = dict(title='Lab 8: Vec, String, HashMap', intro='The three collections you will use every day.', levels=[
 LV('Vec basics', 'Push 4 and 5, pop one off, then print the sum of what is left: <code>10</code>.', '''
fn main() {
    let mut v = vec![1, 2, 3];
    let total: i32 = v.iter().sum();
    println!("{}", total);
}''', '''
fn main() {
    let mut v = vec![1, 2, 3];
    v.push(4);
    v.push(5);
    v.pop();
    let total: i32 = v.iter().sum();
    println!("{}", total);
}''', {'stdout': '10'}, 'push twice, pop once.'),
 LV('Bytes vs characters', '<code>len()</code> counts bytes, not letters. Print both numbers for "héllo": <code>6 5</code>.', '''
fn main() {
    let s = String::from("héllo");
    println!("{}", s.len());
}''', '''
fn main() {
    let s = String::from("héllo");
    println!("{} {}", s.len(), s.chars().count());
}''', {'stdout': '6 5'}, 's.chars().count()'),
 LV('Count words', 'Finish the word counter. Expected <code>a=2 b=1</code>.', '''
use std::collections::HashMap;

fn main() {
    let mut counts = HashMap::new();
    for w in "a b a".split_whitespace() {
        // count each word
    }
    println!("a={} b={}", counts["a"], counts["b"]);
}''', '''
use std::collections::HashMap;

fn main() {
    let mut counts = HashMap::new();
    for w in "a b a".split_whitespace() {
        *counts.entry(w).or_insert(0) += 1;
    }
    println!("a={} b={}", counts["a"], counts["b"]);
}''', {'stdout': 'a=2 b=1'}, '*counts.entry(w).or_insert(0) += 1;'),
 LV('Sort and dedup', 'Sort the list and remove duplicates. Print <code>[1, 2, 3, 5]</code>.', '''
fn main() {
    let mut v = vec![3, 1, 2, 3, 5, 1];
    println!("{:?}", v);
}''', '''
fn main() {
    let mut v = vec![3, 1, 2, 3, 5, 1];
    v.sort();
    v.dedup();
    println!("{:?}", v);
}''', {'stdout': '[1, 2, 3, 5]'}, 'dedup only removes neighbours, so sort first.'),
])

LABS['errors'] = dict(title='Lab 9: When things go wrong', intro='Panics are for bugs. Result is for problems you expect.', levels=[
 LV('Avoid the panic', 'This panics because the Option is empty. Provide a fallback so it prints <code>0</code>.', '''
fn main() {
    let v: Vec<i32> = Vec::new();
    let first = v.first().unwrap();
    println!("{}", first);
}''', '''
fn main() {
    let v: Vec<i32> = Vec::new();
    let first = v.first().unwrap_or(&0);
    println!("{}", first);
}''', {'stdout': '0'}, 'unwrap_or(&0)'),
 LV('Return a Result', 'Write <code>parse_age</code>: return <code>Err</code> with a message if the text is not a number. Expected <code>Ok(30)</code> then <code>Err("not a number")</code>.', '''
fn parse_age(s: &str) -> Result<u8, String> {
    Ok(0)
}

fn main() {
    println!("{:?}", parse_age("30"));
    println!("{:?}", parse_age("abc"));
}''', '''
fn parse_age(s: &str) -> Result<u8, String> {
    match s.parse::<u8>() {
        Ok(n) => Ok(n),
        Err(_) => Err(String::from("not a number")),
    }
}

fn main() {
    println!("{:?}", parse_age("30"));
    println!("{:?}", parse_age("abc"));
}''', {'stdout': 'Ok(30)\nErr("not a number")'}, 'match on s.parse::<u8>()'),
 LV('The ? operator', 'Replace the two <code>match</code> blocks with <code>?</code>. Same output <code>10</code>, much shorter.', '''
fn add(a: &str, b: &str) -> Result<i32, std::num::ParseIntError> {
    let x = match a.parse::<i32>() {
        Ok(n) => n,
        Err(e) => return Err(e),
    };
    let y = match b.parse::<i32>() {
        Ok(n) => n,
        Err(e) => return Err(e),
    };
    Ok(x + y)
}

fn main() {
    println!("{}", add("4", "6").unwrap());
}''', '''
fn add(a: &str, b: &str) -> Result<i32, std::num::ParseIntError> {
    let x = a.parse::<i32>()?;
    let y = b.parse::<i32>()?;
    Ok(x + y)
}

fn main() {
    println!("{}", add("4", "6").unwrap());
}''', {'stdout': '10', 'requires': ['\\?;'], 'forbids': ['Err\\(e\\) => return']}, 'let x = a.parse::<i32>()?;', goalText='the output must be 10 and the code must use ?'),
])

LABS['traits'] = dict(title='Lab 10: Traits and generics', intro='A trait is a promise about behaviour. Generics let one function work for many types.', levels=[
 LV('Keep the promise', 'The compiler says <code>Cat</code> is missing something the trait promises. Implement it so the program prints <code>Woof</code> then <code>Meow</code>.', '''
trait Speak {
    fn speak(&self) -> String;
}

struct Dog;
struct Cat;

impl Speak for Dog {
    fn speak(&self) -> String {
        String::from("Woof")
    }
}

impl Speak for Cat {
}

fn main() {
    println!("{}", Dog.speak());
    println!("{}", Cat.speak());
}''', '''
trait Speak {
    fn speak(&self) -> String;
}

struct Dog;
struct Cat;

impl Speak for Dog {
    fn speak(&self) -> String {
        String::from("Woof")
    }
}

impl Speak for Cat {
    fn speak(&self) -> String {
        String::from("Meow")
    }
}

fn main() {
    println!("{}", Dog.speak());
    println!("{}", Cat.speak());
}''', {'stdout': 'Woof\nMeow'}, 'Copy the Dog impl and change the word.'),
 LV('Trait objects', 'Sum the areas of different shapes stored together. Fill in <code>Square</code>\'s area. Expected <code>total = 13</code>.', '''
trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);
struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        0.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

fn main() {
    let shapes: Vec<Box<dyn Shape>> = vec![Box::new(Square(3.0)), Box::new(Rect(2.0, 2.0))];
    let mut total = 0.0;
    for s in shapes.iter() {
        total += s.area();
    }
    println!("total = {}", total);
}''', '''
trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);
struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

fn main() {
    let shapes: Vec<Box<dyn Shape>> = vec![Box::new(Square(3.0)), Box::new(Rect(2.0, 2.0))];
    let mut total = 0.0;
    for s in shapes.iter() {
        total += s.area();
    }
    println!("total = {}", total);
}''', {'stdout': 'total = 13'}, 'self.0 * self.0'),
 LV('A generic function', 'Make <code>largest</code> work for any type that can be compared. Expected <code>9</code> then <code>z</code>.', '''
fn largest(v: &[i32]) -> &i32 {
    let mut best = &v[0];
    for x in v {
        if x > best {
            best = x;
        }
    }
    best
}

fn main() {
    println!("{}", largest(&[3, 9, 4]));
    println!("{}", largest(&['a', 'z', 'q']));
}''', '''
fn largest<T: PartialOrd>(v: &[T]) -> &T {
    let mut best = &v[0];
    for x in v {
        if x > best {
            best = x;
        }
    }
    best
}

fn main() {
    println!("{}", largest(&[3, 9, 4]));
    println!("{}", largest(&['a', 'z', 'q']));
}''', {'stdout': '9\nz', 'requires': ['<T']}, 'fn largest<T: PartialOrd>(v: &[T]) -> &T', goalText='the output must be 9 then z, and largest must be generic (<T ...>)'),
])

LABS['lifetimes'] = dict(title='Lab 11: Lifetimes', intro='A lifetime is how long a reference stays valid. Usually Rust works it out; sometimes you must say.', levels=[
 LV('Name the lifetime', 'Rust cannot tell which input the result borrows from. Add a lifetime name <code>\'a</code>. Print <code>long</code>.', '''
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    println!("{}", longest("long", "ab"));
}''', '''
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    println!("{}", longest("long", "ab"));
}''', {'stdout': 'long'}, "fn longest<'a>(x: &'a str, y: &'a str) -> &'a str"),
 LV('Does not live long enough', 'The reference outlives the number it points at. Move the <code>println!</code> so the reference is used while <code>x</code> is still alive. Print <code>5</code>.', '''
fn main() {
    let r;
    {
        let x = 5;
        r = &x;
    }
    println!("{}", r);
}''', '''
fn main() {
    let r;
    {
        let x = 5;
        r = &x;
        println!("{}", r);
    }
}''', {'stdout': '5'}, 'Print inside the inner block.'),
 LV('A struct that borrows', 'A struct holding a reference needs a lifetime on the struct too. Fix it and print <code>Call me Ishmael</code>.', '''
struct Excerpt {
    part: &str,
}

fn main() {
    let text = String::from("Call me Ishmael. Some years ago...");
    let first = text.split('.').next().unwrap();
    let e = Excerpt { part: first };
    println!("{}", e.part);
}''', '''
struct Excerpt<'a> {
    part: &'a str,
}

fn main() {
    let text = String::from("Call me Ishmael. Some years ago...");
    let first = text.split('.').next().unwrap();
    let e = Excerpt { part: first };
    println!("{}", e.part);
}''', {'stdout': 'Call me Ishmael'}, "struct Excerpt<'a> { part: &'a str }"),
 LV('Return something owned', 'You cannot return a reference to a local. Return an owned <code>String</code> instead. Print <code>hi</code>.', '''
fn make() -> &String {
    let s = String::from("hi");
    &s
}

fn main() {
    println!("{}", make());
}''', '''
fn make() -> String {
    let s = String::from("hi");
    s
}

fn main() {
    println!("{}", make());
}''', {'stdout': 'hi'}, 'Return String and drop the &.'),
])

LABS['iterators'] = dict(title='Lab 12: Closures and iterators', intro='Closures are small anonymous functions. Iterator chains describe what you want instead of how to loop.', levels=[
 LV('Capture a variable', 'The closure should add <code>n</code> to its argument, using the outer variable. Print <code>12</code>.', '''
fn main() {
    let n = 5;
    let add = |x: i32| x;
    println!("{}", add(7));
}''', '''
fn main() {
    let n = 5;
    let add = |x: i32| x + n;
    println!("{}", add(7));
}''', {'stdout': '12'}, '|x: i32| x + n'),
 LV('Chain it', 'Sum the squares of the odd numbers from 1 to 10 with one iterator chain: <code>165</code>.', '''
fn main() {
    let total: i32 = 0;
    println!("{}", total);
}''', '''
fn main() {
    let total: i32 = (1..=10).filter(|n| n % 2 == 1).map(|n| n * n).sum();
    println!("{}", total);
}''', {'stdout': '165', 'requires': ['filter', 'map']}, '(1..=10).filter(...).map(...).sum()', goalText='print 165 using filter and map'),
 LV('Collect', 'Turn the words into upper case and collect into a Vec. Print <code>["HI", "YO"]</code>.', '''
fn main() {
    let words = vec!["hi", "yo"];
    let up: Vec<String> = Vec::new();
    println!("{:?}", up);
}''', '''
fn main() {
    let words = vec!["hi", "yo"];
    let up: Vec<String> = words.iter().map(|w| w.to_uppercase()).collect();
    println!("{:?}", up);
}''', {'stdout': '["HI", "YO"]'}, 'words.iter().map(|w| w.to_uppercase()).collect()'),
 LV('Find the biggest', 'Print the longest word using <code>max_by_key</code>: <code>banana</code>.', '''
fn main() {
    let words = vec!["fig", "banana", "kiwi"];
    println!("{}", words[0]);
}''', '''
fn main() {
    let words = vec!["fig", "banana", "kiwi"];
    let best = words.iter().max_by_key(|w| w.len()).unwrap();
    println!("{}", best);
}''', {'stdout': 'banana', 'requires': ['max_by_key']}, 'words.iter().max_by_key(|w| w.len()).unwrap()', goalText='print banana using max_by_key'),
])

LABS['smart'] = dict(title='Lab 13: Smart pointers and threads', intro='Box puts data on the heap, Rc shares ownership, RefCell allows change through a shared handle, and threads run work side by side. (Threads here run one after another so results are predictable; the rules you learn are the real ones.)', levels=[
 LV('Box a recursive type', 'A list that contains itself needs a <code>Box</code>. Fix the definition so it compiles; the sum should print <code>6</code>.', '''
enum List {
    Cons(i32, List),
    Nil,
}

use List::{Cons, Nil};

fn sum(l: &List) -> i32 {
    match l {
        Cons(v, rest) => v + sum(rest),
        Nil => 0,
    }
}

fn main() {
    let l = Cons(1, Cons(2, Cons(3, Nil)));
    println!("{}", sum(&l));
}''', '''
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};

fn sum(l: &List) -> i32 {
    match l {
        Cons(v, rest) => v + sum(rest),
        Nil => 0,
    }
}

fn main() {
    let l = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Nil)))));
    println!("{}", sum(&l));
}''', {'stdout': '6'}, 'Cons(i32, Box<List>) and Box::new(...) around each tail.'),
 LV('Two owners', 'Make <code>b</code> a second owner of the same data with <code>Rc::clone</code>. Expected counts: <code>1</code> then <code>2</code>.', '''
use std::rc::Rc;

fn main() {
    let a = Rc::new(String::from("shared"));
    println!("{}", Rc::strong_count(&a));
    let b = a;
    println!("{}", Rc::strong_count(&a));
}''', '''
use std::rc::Rc;

fn main() {
    let a = Rc::new(String::from("shared"));
    println!("{}", Rc::strong_count(&a));
    let b = Rc::clone(&a);
    println!("{}", Rc::strong_count(&a));
}''', {'stdout': '1\n2'}, 'Rc::clone(&a) increases the count.'),
 LV('Change through a shared handle', 'Two Rc handles share one RefCell. Push 1 through <code>second</code> and print the list as seen through <code>first</code>: <code>[1]</code>.', '''
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let first = Rc::new(RefCell::new(Vec::new()));
    let second = Rc::clone(&first);
    println!("{:?}", first.borrow());
}''', '''
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let first = Rc::new(RefCell::new(Vec::new()));
    let second = Rc::clone(&first);
    second.borrow_mut().push(1);
    println!("{:?}", first.borrow());
}''', {'stdout': '[1]'}, 'second.borrow_mut().push(1);'),
 LV('A thread and a channel', 'Send the number 42 from a spawned thread and print what the main thread receives: <code>got 42</code>.', '''
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    let handle = thread::spawn(move || {
    });
    handle.join().unwrap();
    let v: i32 = rx.recv().unwrap();
    println!("got {}", v);
}''', '''
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    let handle = thread::spawn(move || {
        tx.send(42).unwrap();
    });
    handle.join().unwrap();
    let v: i32 = rx.recv().unwrap();
    println!("got {}", v);
}''', {'stdout': 'got 42'}, 'tx.send(42).unwrap();'),
 LV('Rc cannot cross threads', 'Rust refuses to send an <code>Rc</code> to another thread. Swap it for <code>Arc</code> (atomic Rc) and print <code>5</code>.', '''
use std::rc::Rc;
use std::thread;

fn main() {
    let a = Rc::new(5);
    let h = thread::spawn(move || {
        println!("{}", a);
    });
    h.join().unwrap();
}''', '''
use std::sync::Arc;
use std::thread;

fn main() {
    let a = Arc::new(5);
    let h = thread::spawn(move || {
        println!("{}", a);
    });
    h.join().unwrap();
}''', {'stdout': '5'}, 'Arc::new, and use std::sync::Arc.'),
])
