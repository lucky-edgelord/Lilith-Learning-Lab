const RL=require('../rustlab.core.js');
function t(name,src){const r=RL.run(src);console.log('--- '+name+': '+(r.compileError?'COMPILE ':'')+(r.error?r.error.code:'ok')+'\n'+(r.compileError?r.stderr:r.stdout+r.stderr.slice(0,120)));}
t('e0502','fn main(){\n    let mut v = vec![1, 2, 3];\n    let first = &v[0];\n    v.push(4);\n    println!("{}", first);\n}');
t('e0499','fn main(){\n    let mut s = String::from("a");\n    let r1 = &mut s;\n    let r2 = &mut s;\n    println!("{}, {}", r1, r2);\n}');
t('nll ok','fn main(){\n    let mut s = String::from("a");\n    let r1 = &s;\n    println!("{}", r1);\n    let r2 = &mut s;\n    r2.push_str("b");\n    println!("{}", r2);\n}');
t('e0106','fn longest(x: &str, y: &str) -> &str {\n    if x.len() > y.len() { x } else { y }\n}\nfn main(){}');
t('e0106b','fn dangle() -> &String {\n    let s = String::from("hi");\n    &s\n}\nfn main(){}');
t('e0597','fn main(){\n    let r;\n    {\n        let x = 5;\n        r = &x;\n    }\n    println!("{}", r);\n}');
t('e0004','enum Dir { N, S, E }\nfn main(){\n    let d = Dir::N;\n    match d {\n        Dir::N => println!("n"),\n        Dir::S => println!("s"),\n    }\n}');
t('lt ok','fn longest<\'a>(x: &\'a str, y: &\'a str) -> &\'a str { if x.len() > y.len() { x } else { y } }\nfn main(){ println!("{}", longest("ab","c")); }');
t('rc send','use std::rc::Rc; use std::thread;\nfn main(){\n    let a = Rc::new(5);\n    let h = thread::spawn(move || { println!("{}", a); });\n    h.join().unwrap();\n}');
t('moved loop','fn eat(s: String) {}\nfn main(){\n    let s = String::from("x");\n    for _ in 0..2 { eat(s); }\n}');
t('e0308','fn f(n: i32) -> i32 { n }\nfn main(){\n    let x: i32 = "five";\n}');
