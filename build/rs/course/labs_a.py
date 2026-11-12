# Rust Lab level definitions, part A (chapters 1-6). Each level: title, intro (HTML), code, solution, goal, hint.
def LV(title, intro, code, solution, goal, hint=None, win=None, goalText=None):
    d = {'title': title, 'intro': intro, 'code': code.strip('\n') + '\n', 'solution': solution.strip('\n') + '\n', 'goal': goal}
    if hint: d['hint'] = hint
    if win: d['win'] = win
    if goalText: d['goalText'] = goalText
    return d

LABS = {}

LABS['hello'] = dict(title='Lab 1: Hello, compiler', intro='Write, run, and read errors. Press <b>Run</b> after each change. The Output box shows what your program printed, or what the compiler said.', levels=[
 LV('Say hello', 'Make the program print exactly <code>Hello, Rust!</code>', '''
fn main() {
    println!("Hello");
}''', '''
fn main() {
    println!("Hello, Rust!");
}''', {'stdout': 'Hello, Rust!'}, 'Change the text inside the quotes.'),
 LV('Fill the holes', 'Use the two variables so it prints <code>Ferris first appeared in 2015</code>. Each <code>{}</code> is a hole that takes the next value.', '''
fn main() {
    let name = "Ferris";
    let year = 2015;
    println!("name first appeared in year");
}''', '''
fn main() {
    let name = "Ferris";
    let year = 2015;
    println!("{} first appeared in {}", name, year);
}''', {'stdout': 'Ferris first appeared in 2015'}, 'Put {} where each word is, then list name and year after the string, separated by commas.'),
 LV('Read the error', 'This will not compile. Read the message: it names the line and says what it expected. Fix it so it prints <code>3</code>.', '''
fn main() {
    let x = 1
    let y = 2;
    println!("{}", x + y);
}''', '''
fn main() {
    let x = 1;
    let y = 2;
    println!("{}", x + y);
}''', {'stdout': '3'}, 'Every statement ends with a semicolon.'),
 LV('Debug printing', 'The tuple has no friendly <code>{}</code> form. The error suggests another way. Make it print <code>(1, "a", true)</code>.', '''
fn main() {
    let t = (1, "a", true);
    println!("{}", t);
}''', '''
fn main() {
    let t = (1, "a", true);
    println!("{:?}", t);
}''', {'stdout': '(1, "a", true)'}, '{:?} is the "debug" placeholder.'),
])

LABS['types'] = dict(title='Lab 2: Variables and types', intro='Rust is strict about changing values and mixing types. These four puzzles are the errors you will meet most often.', levels=[
 LV('Mutable', 'Variables are fixed unless you say otherwise. Make this print <code>6</code>.', '''
fn main() {
    let x = 5;
    x = 6;
    println!("{}", x);
}''', '''
fn main() {
    let mut x = 5;
    x = 6;
    println!("{}", x);
}''', {'stdout': '6'}, 'Add one word after let.'),
 LV('Shadowing', 'A string cannot be added to a number. Use shadowing: declare <code>n</code> again as a number parsed from the text. Print <code>43</code>.', '''
fn main() {
    let n = "42";
    println!("{}", n + 1);
}''', '''
fn main() {
    let n = "42";
    let n: i32 = n.parse().unwrap();
    println!("{}", n + 1);
}''', {'stdout': '43'}, 'let n: i32 = n.parse().unwrap();'),
 LV('Mixing numbers', 'Rust will not multiply an <code>i32</code> by an <code>f64</code> for you. Convert one with <code>as</code>. Print <code>12.5</code>.', '''
fn main() {
    let a: i32 = 5;
    let b: f64 = 2.5;
    println!("{}", a * b);
}''', '''
fn main() {
    let a: i32 = 5;
    let b: f64 = 2.5;
    println!("{}", a as f64 * b);
}''', {'stdout': '12.5'}, 'a as f64'),
 LV('Overflow', 'A <code>u8</code> only holds 0 to 255, so this panics. Make it print <code>255</code> without panicking (there is a method that stops at the maximum).', '''
fn main() {
    let x: u8 = 250;
    let y = x + 10;
    println!("{}", y);
}''', '''
fn main() {
    let x: u8 = 250;
    let y = x.saturating_add(10);
    println!("{}", y);
}''', {'stdout': '255'}, 'saturating_add'),
])

LABS['flow'] = dict(title='Lab 3: Functions and loops', intro='Small programs that use if, loops, and functions.', levels=[
 LV('FizzBuzz', 'Print 1 to 15, but <code>Fizz</code> for multiples of 3, <code>Buzz</code> for 5, <code>FizzBuzz</code> for both. Each on its own line.', '''
fn main() {
    for i in 1..=15 {
        println!("{}", i);
    }
}''', '''
fn main() {
    for i in 1..=15 {
        if i % 15 == 0 {
            println!("FizzBuzz");
        } else if i % 3 == 0 {
            println!("Fizz");
        } else if i % 5 == 0 {
            println!("Buzz");
        } else {
            println!("{}", i);
        }
    }
}''', {'stdout': '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz'}, 'Check the "both" case first.'),
 LV('Sum of evens', 'Add up the even numbers from 1 to 100 and print <code>2550</code>.', '''
fn main() {
    let mut total = 0;
    for n in 1..=100 {
        // add n only when it is even
    }
    println!("{}", total);
}''', '''
fn main() {
    let mut total = 0;
    for n in 1..=100 {
        if n % 2 == 0 {
            total += n;
        }
    }
    println!("{}", total);
}''', {'stdout': '2550'}, 'n % 2 == 0 is true for even numbers.'),
 LV('Write a function', 'The compiler cannot find <code>square</code>. Write it: it takes an <code>i32</code> and returns an <code>i32</code>. Print <code>49</code>.', '''
fn main() {
    println!("{}", square(7));
}''', '''
fn square(n: i32) -> i32 {
    n * n
}

fn main() {
    println!("{}", square(7));
}''', {'stdout': '49'}, 'The last expression has no semicolon: that is the return value.'),
 LV('Loop with a result', 'Use <code>loop</code> and <code>break</code> with a value: find the first power of two above 1000 (it is <code>1024</code>).', '''
fn main() {
    let mut p = 1;
    let answer = loop {
        // double p; stop when it is above 1000
    };
    println!("{}", answer);
}''', '''
fn main() {
    let mut p = 1;
    let answer = loop {
        p *= 2;
        if p > 1000 {
            break p;
        }
    };
    println!("{}", answer);
}''', {'stdout': '1024'}, 'break p; hands p out of the loop.'),
])

LABS['ownership'] = dict(title='Lab 4: Ownership', intro='Ownership is Rust\'s big idea. Each value has one owner. Moving transfers it. The <b>Ownership log</b> under the output shows every move and drop that happened while your program ran.', levels=[
 LV('Clone it', 'The first owner gave the String away, so using it again is an error. Give the second variable its own copy so it prints <code>hello hello</code>.', '''
fn main() {
    let a = String::from("hello");
    let b = a;
    println!("{} {}", a, b);
}''', '''
fn main() {
    let a = String::from("hello");
    let b = a.clone();
    println!("{} {}", a, b);
}''', {'stdout': 'hello hello'}, '.clone() makes a deep copy.'),
 LV('Give it back', 'Passing a String into a function moves it. Let the function return the String so <code>main</code> can keep using it. Print <code>HELLO</code> then <code>HELLO</code> hmm: print the returned value twice.', '''
fn shout(s: String) {
    println!("{}", s.to_uppercase());
}

fn main() {
    let s = String::from("hello");
    shout(s);
    shout(s);
}''', '''
fn shout(s: String) -> String {
    println!("{}", s.to_uppercase());
    s
}

fn main() {
    let s = String::from("hello");
    let s = shout(s);
    shout(s);
}''', {'stdout': 'HELLO\nHELLO'}, 'Return s from shout, and re-bind it: let s = shout(s);'),
 LV('Break it on purpose', 'Integers are <code>Copy</code>: they never move. Change the program so it fails with a "borrow of moved value" error. (Hint: use a different type.)', '''
fn main() {
    let a = 5;
    let b = a;
    println!("{} {}", a, b);
}''', '''
fn main() {
    let a = String::from("five");
    let b = a;
    println!("{} {}", a, b);
}''', {'error': 'E0382'}, 'Replace 5 with String::from("five").', 'You triggered E0382, the most famous Rust error.'),
 LV('Drop order', 'Values are dropped in reverse order of creation. Make the output end with <code>drop B</code> then <code>drop A</code> by declaring them in the right order.', '''
struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("drop {}", self.0);
    }
}

fn main() {
    let _b = Noisy("B");
    let _a = Noisy("A");
    println!("end of main");
}''', '''
struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("drop {}", self.0);
    }
}

fn main() {
    let _a = Noisy("A");
    let _b = Noisy("B");
    println!("end of main");
}''', {'stdout': 'end of main\ndrop B\ndrop A'}, 'Last in, first out.'),
])

LABS['borrow'] = dict(title='Lab 5: Borrowing', intro='A reference lets you use a value without owning it. Shared references (&) can be many; a mutable reference (&mut) must be alone.', levels=[
 LV('Borrow instead of move', 'Change the call and the function so <code>main</code> still owns the String afterwards. Print <code>hello has 5 letters</code>.', '''
fn length(s: String) -> usize {
    s.len()
}

fn main() {
    let s = String::from("hello");
    let n = length(s);
    println!("{} has {} letters", s, n);
}''', '''
fn length(s: &String) -> usize {
    s.len()
}

fn main() {
    let s = String::from("hello");
    let n = length(&s);
    println!("{} has {} letters", s, n);
}''', {'stdout': 'hello has 5 letters'}, 'The parameter type becomes &String, and you pass &s.'),
 LV('Change through a reference', 'This function must change the caller\'s string. It needs a <b>mutable</b> reference, and the variable must be <code>mut</code> too. Print <code>hello, world</code>.', '''
fn add_world(s: &String) {
    s.push_str(", world");
}

fn main() {
    let s = String::from("hello");
    add_world(&s);
    println!("{}", s);
}''', '''
fn add_world(s: &mut String) {
    s.push_str(", world");
}

fn main() {
    let mut s = String::from("hello");
    add_world(&mut s);
    println!("{}", s);
}''', {'stdout': 'hello, world'}, '&mut String in the function, let mut s and &mut s at the call.'),
 LV('Reader vs writer', 'You may not change the Vec while a reference into it is still going to be used. Reorder two lines so it compiles and prints <code>1</code>.', '''
fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];
    v.push(4);
    println!("{}", first);
}''', '''
fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];
    println!("{}", first);
    v.push(4);
}''', {'stdout': '1'}, 'Use first before you push.'),
 LV('Slices', 'Return the first word of a sentence as a slice. Print <code>hello</code>.', '''
fn first_word(s: &str) -> &str {
    s
}

fn main() {
    println!("{}", first_word("hello world"));
}''', '''
fn first_word(s: &str) -> &str {
    match s.find(' ') {
        Some(i) => &s[0..i],
        None => s,
    }
}

fn main() {
    println!("{}", first_word("hello world"));
}''', {'stdout': 'hello'}, 'Find the index of the first space, then slice 0..i.'),
 LV('Two writers', 'Make this fail with the "cannot borrow as mutable more than once" error. Create two <code>&mut</code> borrows and use both.', '''
fn main() {
    let mut s = String::from("a");
    let r1 = &mut s;
    r1.push('b');
    println!("{}", r1);
}''', '''
fn main() {
    let mut s = String::from("a");
    let r1 = &mut s;
    let r2 = &mut s;
    r1.push('b');
    r2.push('c');
    println!("{} {}", r1, r2);
}''', {'error': 'E0499'}, 'Add let r2 = &mut s; before using r1.', 'That is E0499: two writers at once.'),
])

LABS['structs'] = dict(title='Lab 6: Structs and methods', intro='Group data with a struct and attach behaviour with impl.', levels=[
 LV('A method', 'Add an <code>area</code> method to <code>Rect</code>. Print <code>area = 12</code>.', '''
struct Rect {
    w: u32,
    h: u32,
}

fn main() {
    let r = Rect { w: 3, h: 4 };
    println!("area = {}", r.area());
}''', '''
struct Rect {
    w: u32,
    h: u32,
}

impl Rect {
    fn area(&self) -> u32 {
        self.w * self.h
    }
}

fn main() {
    let r = Rect { w: 3, h: 4 };
    println!("area = {}", r.area());
}''', {'stdout': 'area = 12'}, 'impl Rect { fn area(&self) -> u32 { ... } }'),
 LV('Derive Debug', 'Print the struct with <code>{:?}</code>. It needs a one-line attribute above the struct. Expect <code>Point { x: 1, y: 2 }</code>.', '''
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 1, y: 2 };
    println!("{:?}", p);
}''', '''
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 1, y: 2 };
    println!("{:?}", p);
}''', {'stdout': 'Point { x: 1, y: 2 }'}, '#[derive(Debug)]'),
 LV('Constructor and &mut self', 'Add <code>new</code> (no self) and <code>bump</code> (changes the counter). Print <code>count = 3</code>.', '''
struct Counter {
    count: u32,
}

impl Counter {
}

fn main() {
    let mut c = Counter::new();
    c.bump();
    c.bump();
    c.bump();
    println!("count = {}", c.count);
}''', '''
struct Counter {
    count: u32,
}

impl Counter {
    fn new() -> Counter {
        Counter { count: 0 }
    }
    fn bump(&mut self) {
        self.count += 1;
    }
}

fn main() {
    let mut c = Counter::new();
    c.bump();
    c.bump();
    c.bump();
    println!("count = {}", c.count);
}''', {'stdout': 'count = 3'}, 'new returns Counter { count: 0 }; bump takes &mut self.'),
])
