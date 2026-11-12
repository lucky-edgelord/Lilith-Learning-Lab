# -*- coding: utf-8 -*-
"""One hierarchical concept map per chapter of the Rust course."""
def M(title, text):
    return (title, [ln.strip() for ln in text.strip().split("\n") if ln.strip()])

STRUCT = [
M("Rust", """
Rust | is built from | Source code
Rust | is checked by | The compiler
Rust | is run with | Cargo
Source code | starts in | fn main
Source code | prints with | println!
The compiler | reports | Error messages
The compiler | produces | A fast program
Cargo | commands | cargo run
Cargo | commands | cargo check
Error messages | contain | Code and line
Error messages | often include | A help line
"""),
M("Variables", """
Variables | are made with | let
Variables | have | A type
let | default | Locked
let | with mut | Changeable
let | again | Shadowing
A type | is for numbers | i32 u8 f64
A type | is for text and logic | char bool
A type | groups values | Tuple and array
i32 u8 f64 | can | Overflow
Overflow | handled by | saturating wrapping checked
"""),
M("Control flow", """
Control flow | has | Functions
Control flow | has | Branches
Control flow | has | Loops
Functions | need | Typed parameters
Functions | return | The last expression
Branches | use | if else
if else | is | An expression
Loops | include | for
Loops | include | while
Loops | include | loop
loop | can | break with a value
for | walks | A range
"""),
M("Ownership", """
Ownership | says | One owner per value
Ownership | moves | Ownership transfers
Ownership | ends with | Drop
One owner per value | stored on | Stack handle
Stack handle | points to | Heap data
Ownership transfers | for String | Old name is dead
Ownership transfers | not for | Copy types
Ownership transfers | avoided by | clone
Drop | happens at | End of scope
Drop | in | Reverse order
Old name is dead | gives | Error E0382
"""),
M("Borrowing", """
Borrowing | uses | References
Borrowing | follows | Two rules
References | are | Shared &T
References | are | Mutable &mut T
Shared &T | many | Readers
Mutable &mut T | only | One writer
Two rules | enforced by | The compiler
Two rules | end at | Last use
The compiler | reports | E0502 and E0499
Borrowing | includes | Slices
Slices | for text | &str
"""),
M("Structs", """
Structs | hold | Named fields
Structs | gain behaviour from | impl
Structs | print with | derive Debug
impl | contains | Associated functions
impl | contains | Methods
Associated functions | called with | Type::new
Methods | take | self
self | as | &self
self | as | &mut self
self | as | self by value
&mut self | needs | let mut value
"""),
M("Enums", """
Enums | are | One of several variants
Enums | are used with | match
Enums | include | Option
One of several variants | can carry | Data
match | must be | Exhaustive
match | patterns | Ranges and guards
match | shorthand | if let
Option | is | Some or None
Option | replaces | Null
Exhaustive | else error | E0004
"""),
M("Collections", """
Collections | include | Vec
Collections | include | String
Collections | include | HashMap
Vec | grows with | push
Vec | safe access | get
Vec | bad index | Panic
String | is | UTF-8
UTF-8 | means | len counts bytes
UTF-8 | use | chars for characters
HashMap | maps | Key to value
HashMap | counts with | entry or_insert
"""),
M("Errors", """
Errors | split into | Panics
Errors | split into | Results
Panics | are for | Bugs
Panics | exit code | 101
Results | are | Ok or Err
Results | handled by | match
Results | passed up with | The ? operator
Results | defaulted with | unwrap_or
The ? operator | needs | A Result return type
Bugs | include | Index out of range
Bugs | include | Overflow
"""),
M("Traits", """
Traits | are | Promised methods
Traits | implemented with | impl Trait for Type
Traits | power | Generics
Traits | power | Trait objects
Promised methods | missing gives | E0046
Promised methods | can have | Default bodies
Generics | use | Trait bounds
Trait bounds | example | T: PartialOrd
Trait objects | written | Box dyn Trait
Trait objects | decide | At run time
"""),
M("Lifetimes", """
Lifetimes | describe | How long a reference lives
Lifetimes | prevent | Dangling references
Dangling references | give | E0597
How long a reference lives | named | 'a
'a | needed when | Several inputs
Several inputs | else error | E0106
Lifetimes | usually | Elided
Elided | for | One input reference
Lifetimes | appear in | Structs holding references
Lifetimes | fix by | Returning owned data
"""),
M("Iterators", """
Iterators | use | Closures
Iterators | have | Adapters
Iterators | have | Consumers
Closures | written | pipes and body
Closures | can | Capture variables
Adapters | include | map and filter
Adapters | include | enumerate and zip
Consumers | include | sum and count
Consumers | include | collect
Iterators | are | Lazy
collect | needs | A target type
"""),
M("Smart pointers", """
Smart pointers | include | Box
Smart pointers | include | Rc and Arc
Smart pointers | include | RefCell
Box | solves | Recursive types
Rc and Arc | give | Shared ownership
Rc and Arc | count | Owners
Arc | is for | Threads
RefCell | checks | Borrow rules at run time
Smart pointers | support | Concurrency
Concurrency | uses | Threads
Concurrency | uses | Channels
Channels | move | Values
"""),
]
MAPS = [[a] for a in STRUCT]
