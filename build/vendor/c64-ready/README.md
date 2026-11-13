# c64-ready (vendored WASM core)

Source: https://github.com/hayesmaker/c64-ready (commit 99f6346, 2026-11-12), MIT licence, copyright (c) 2026 hayesmaker.
The core is based on c64.js from lvllvl.com by James (https://github.com/jaammees/lvllvl).

Files here:
- `c64.wasm`: the emulator core, unmodified (`public/c64.wasm` upstream).
- `c64-wasm.reference.mjs`: upstream loader, kept for reference. Our own small loader is `build/c64c/c64lab/machine.js`.
- `LICENSE`: upstream MIT licence.

Note: the WASM image contains the original Commodore 64 KERNAL, BASIC V2 and character ROMs, which are copyright
Commodore Electronics Ltd (rights today held by others). Upstream ships them inside the binary. They are not covered by the
MIT licence. If that is a problem for a distribution, the course can be rebuilt on the older Open ROMs core (see git history),
at the cost of the BASIC labs.

To update: copy a newer `public/c64.wasm`, run `node build/c64c/c64lab/test_machine.js` and `node build/c64c/c64lab/test_labs.js`.
